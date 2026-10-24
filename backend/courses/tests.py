from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Material


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
