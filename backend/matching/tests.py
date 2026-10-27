from rest_framework.test import APITestCase

from accounts.models import User


def make_user(email, native, learning, level):
    user = User.objects.create_user(email, 'pw12345678', first_name=email.split('@')[0])
    p = user.profile
    p.native_language = native
    p.learning_language = learning
    p.learning_languages = [learning]
    p.language_levels = {learning: level}
    p.save()
    return user


class SameLanguageLevelTests(APITestCase):
    def setUp(self):
        self.me = make_user('me@example.com', 'Arabic', 'English', 'A1')
        self.same_level = make_user('same@example.com', 'French', 'English', 'A1')
        self.other_level = make_user('other@example.com', 'French', 'English', 'B2')
        # learns a different language, so there is no level to compare
        self.exchange = make_user('swap@example.com', 'English', 'Arabic', 'B2')
        self.client.force_authenticate(self.me)

    def _emails(self):
        return {p['email'] for p in self.client.get('/api/matching/partners/', {'language': 'English'}).data}

    def test_same_language_needs_same_level(self):
        emails = self._emails()
        self.assertIn('same@example.com', emails)
        self.assertNotIn('other@example.com', emails)

    def test_exchange_partner_stays_visible(self):
        self.assertIn('swap@example.com', self._emails())

    def test_it_applies_both_ways(self):
        self.client.force_authenticate(self.other_level)
        emails = {p['email'] for p in self.client.get('/api/matching/partners/', {'language': 'English'}).data}
        self.assertNotIn('me@example.com', emails)


class LessonFilterTests(APITestCase):
    def test_lesson_filter_keeps_only_people_on_that_lesson(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from courses.models import Material, MaterialProgress

        lessons = [
            Material.objects.create(language='English', level='A1', title=f'L{n}', order=n,
                                    file=SimpleUploadedFile(f'English-A1-Lesson-{n:02d}.pptx', b'x'))
            for n in (1, 2, 3)
        ]
        me = make_user('viewer@example.com', 'English', 'Arabic', 'A1')
        on_one = make_user('one@example.com', 'Arabic', 'English', 'A1')
        on_three = make_user('three@example.com', 'Arabic', 'English', 'A1')
        for done in lessons[:2]:
            MaterialProgress.objects.create(user=on_three, material=done, status='complete')
        self.client.force_authenticate(me)

        everyone = {p['email'] for p in self.client.get('/api/matching/partners/').data}
        self.assertEqual(everyone, {'one@example.com', 'three@example.com'})
        at_one = {p['email'] for p in self.client.get('/api/matching/partners/', {'lesson': '1'}).data}
        self.assertEqual(at_one, {'one@example.com'})
        at_three = {p['email'] for p in self.client.get('/api/matching/partners/', {'lesson': '3'}).data}
        self.assertEqual(at_three, {'three@example.com'})
