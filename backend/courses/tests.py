from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Material, MaterialProgress


@override_settings(MEDIA_ROOT='/tmp/lp-test-media')
class MaterialUploadTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin@example.com', 'pw12345678')
        self.user = User.objects.create_user('user@example.com', 'pw12345678')

    def _files(self):
        return [
            SimpleUploadedFile('English-A1-Lesson-01-Greetings.pptx', b'a'),
            SimpleUploadedFile('English-A1-Lesson-02-Food.pptx', b'b'),
        ]

    def test_superuser_uploads_many(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post('/api/courses/materials/', {'language': 'English', 'level': 'B1', 'files': self._files()}, format='multipart')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Material.objects.filter(language='English', level='B1').count(), 2)
        self.assertEqual(sorted(m.order for m in Material.objects.all()), [1, 2])

    def test_regular_user_cannot_upload_but_can_list(self):
        self.client.force_authenticate(self.user)
        r = self.client.post('/api/courses/materials/', {'language': 'English', 'level': 'B1', 'files': self._files()}, format='multipart')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(self.client.get('/api/courses/materials/').status_code, 200)

    def test_validation(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post('/api/courses/materials/', {'language': 'Klingon', 'level': 'B1', 'files': self._files()}, format='multipart')
        self.assertEqual(r.status_code, 400)
        r = self.client.post('/api/courses/materials/', {'language': 'English', 'level': 'B1'}, format='multipart')
        self.assertEqual(r.status_code, 400)


class NextLessonTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('learner@example.com', 'pw12345678')
        p = self.user.profile
        p.learning_language = 'English'
        p.language_levels = {'English': 'A1'}
        p.save()
        self.lessons = [
            Material.objects.create(language='English', level='A1', title=f'Lesson {n}', order=n,
                                    file=SimpleUploadedFile(f'English-A1-Lesson-{n:02d}.pptx', b'x'))
            for n in (1, 2, 3)
        ]
        self.client.force_authenticate(self.user)

    def _next(self):
        return self.client.get('/api/courses/next/').data

    def _save(self, lesson, status, slide=None):
        body = {'material_id': lesson.id, 'status': status}
        if slide is not None:
            body['last_slide'] = slide
        return self.client.post('/api/courses/progress/', body, format='json')

    def test_starts_at_first_lesson(self):
        data = self._next()
        self.assertEqual(data['material']['id'], self.lessons[0].id)
        self.assertEqual(data['start_slide'], 1)

    def test_complete_moves_to_next_lesson(self):
        self._save(self.lessons[0], 'complete')
        self.assertEqual(self._next()['material']['id'], self.lessons[1].id)

    def test_partial_resumes_same_lesson_at_slide(self):
        self._save(self.lessons[0], 'partial', 7)
        data = self._next()
        self.assertEqual(data['material']['id'], self.lessons[0].id)
        self.assertEqual(data['start_slide'], 7)

    def test_not_started_repeats_lesson_from_slide_one(self):
        self._save(self.lessons[0], 'partial', 7)
        self._save(self.lessons[0], 'not_started')
        data = self._next()
        self.assertEqual(data['material']['id'], self.lessons[0].id)
        self.assertEqual(data['start_slide'], 1)
        self.assertEqual(MaterialProgress.objects.get(user=self.user, material=self.lessons[0]).status, 'not_started')

    def test_all_done_returns_none_and_bad_input_rejected(self):
        for lesson in self.lessons:
            self._save(lesson, 'complete')
        self.assertIsNone(self._next()['material'])
        self.assertEqual(self._save(self.lessons[0], 'partial').status_code, 400)
        self.assertEqual(self._save(self.lessons[0], 'bogus').status_code, 400)


class LevelDownloadAndStatusTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('z@example.com', 'pw12345678')
        self.l1 = Material.objects.create(language='English', level='A1', title='L1', order=1,
                                          file=SimpleUploadedFile('English-A1-Lesson-01-x.pptx', b'one'))
        self.l2 = Material.objects.create(language='English', level='A1', title='L2', order=2,
                                          file=SimpleUploadedFile('English-A1-Lesson-02-y.pptx', b'two'))
        self.client.force_authenticate(self.user)

    def test_list_shows_my_status(self):
        MaterialProgress.objects.create(user=self.user, material=self.l1, status='complete')
        MaterialProgress.objects.create(user=self.user, material=self.l2, status='partial', last_slide=5)
        rows = {m['id']: m for m in self.client.get('/api/courses/materials/').data}
        self.assertEqual(rows[self.l1.id]['my_status'], 'complete')
        self.assertEqual((rows[self.l2.id]['my_status'], rows[self.l2.id]['my_slide']), ('partial', 5))

    def test_full_level_zip(self):
        import io
        import zipfile

        r = self.client.get('/api/courses/materials/download/', {'language': 'English', 'level': 'A1'})
        self.assertEqual(r.status_code, 200)
        names = zipfile.ZipFile(io.BytesIO(b''.join(r.streaming_content))).namelist()
        self.assertEqual(len(names), 2)
        self.assertEqual(self.client.get('/api/courses/materials/download/', {'language': 'English', 'level': 'C2'}).status_code, 404)
        self.assertEqual(self.client.get('/api/courses/materials/download/', {'language': 'Klingon', 'level': 'A1'}).status_code, 400)


class SlideTextAndTranslateTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('tr@example.com', 'pw12345678')
        self.client.force_authenticate(self.user)

    def _pptx(self):
        import io
        import zipfile

        def slide(*lines):
            paragraphs = ''.join(f'<a:p><a:r><a:t>{line}</a:t></a:r></a:p>' for line in lines)
            return f'<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="x"><p:txBody>{paragraphs}</p:txBody></p:sld>'

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as bundle:
            bundle.writestr('ppt/slides/slide2.xml', slide('second slide'))
            bundle.writestr('ppt/slides/slide1.xml', slide('Ahlan wasahlan', 'hello'))
        return SimpleUploadedFile('Arabic-A1-Lesson-01-x.pptx', buffer.getvalue())

    def test_slide_text_is_extracted_in_slide_order(self):
        material = Material.objects.create(language='Arabic', level='A1', title='L1', order=1, file=self._pptx())
        slides = self.client.get(f'/api/courses/materials/{material.id}/text/').data['slides']
        self.assertEqual(slides, [['Ahlan wasahlan', 'hello'], ['second slide']])

    def test_translate_uses_the_service_and_validates(self):
        import io
        import json
        from unittest import mock

        reply = io.BytesIO(json.dumps({'responseData': {'translatedText': 'hello'}}).encode())
        with mock.patch('courses.views.urlopen', return_value=mock.MagicMock(__enter__=lambda s: reply, __exit__=lambda *a: False)):
            r = self.client.get('/api/courses/translate/', {'text': 'marhaba', 'source': 'Arabic', 'target': 'English'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['translation'], 'hello')
        self.assertEqual(self.client.get('/api/courses/translate/', {'text': 'x', 'source': 'Klingon', 'target': 'English'}).status_code, 400)
        self.assertEqual(self.client.get('/api/courses/translate/', {'text': '', 'source': 'Arabic', 'target': 'English'}).status_code, 400)
