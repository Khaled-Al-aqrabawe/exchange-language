from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import User
from config.asgi import application


@override_settings(CHANNEL_LAYERS={'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}})
class IncomingCallTests(TransactionTestCase):
    async def test_ring_reaches_partner_socket(self):
        caller = await database_sync_to_async(User.objects.create_user)('a@example.com', 'pw12345678', first_name='Ann')
        partner = await database_sync_to_async(User.objects.create_user)('b@example.com', 'pw12345678')

        token = str(AccessToken.for_user(partner))
        comm = WebsocketCommunicator(application, f'/ws/notify/?token={token}')
        connected, _ = await comm.connect()
        self.assertTrue(connected)

        def ring():
            client = APIClient()
            client.force_authenticate(caller)
            return client.post('/api/calls/ring/', {'partner_id': partner.id}, format='json')

        resp = await database_sync_to_async(ring)()
        self.assertEqual(resp.status_code, 200, resp.content)
        msg = await comm.receive_json_from(timeout=3)
        self.assertEqual(msg['event'], 'incoming-call')
        self.assertEqual(msg['room_id'], resp.data['room_id'])
        self.assertEqual(msg['caller']['name'], 'Ann')
        await comm.disconnect()


class IncomingPollingTests(TransactionTestCase):
    def test_partner_can_poll_the_call_without_a_socket(self):
        caller = User.objects.create_user('c@example.com', 'pw12345678')
        partner = User.objects.create_user('d@example.com', 'pw12345678')
        c1, c2 = APIClient(), APIClient()
        c1.force_authenticate(caller)
        c2.force_authenticate(partner)
        self.assertIsNone(c2.get('/api/calls/incoming/').data)
        room = c1.post('/api/calls/ring/', {'partner_id': partner.id}, format='json').data['room_id']
        got = c2.get('/api/calls/incoming/').data
        self.assertEqual(got['room_id'], room)
        c2.delete('/api/calls/incoming/')
        self.assertIsNone(c2.get('/api/calls/incoming/').data)


class InstantCallSessionTests(TransactionTestCase):
    def test_ring_creates_a_rateable_session(self):
        caller = User.objects.create_user('e@example.com', 'pw12345678')
        partner = User.objects.create_user('f@example.com', 'pw12345678')
        c1, c2 = APIClient(), APIClient()
        c1.force_authenticate(caller)
        c2.force_authenticate(partner)
        room = c1.post('/api/calls/ring/', {'partner_id': partner.id}, format='json').data['room_id']

        session = c2.get('/api/sessions/', {'room_id': room}).data[0]
        self.assertEqual(session['host']['id'], caller.id)

        # not rateable while the call is still running ...
        self.assertEqual(c2.post(f"/api/sessions/{session['id']}/rate/", {'score': 5}, format='json').status_code, 400)
        # ... but rateable once it ended, completed or not
        c2.patch(f"/api/sessions/{session['id']}/status/", {'status': 'not_completed'}, format='json')
        self.assertEqual(c2.post(f"/api/sessions/{session['id']}/rate/", {'score': 4, 'comment': 'ok'}, format='json').status_code, 201)


class SessionNotesTests(TransactionTestCase):
    def test_notes_are_private_saved_and_listed(self):
        a = User.objects.create_user('g@example.com', 'pw12345678', first_name='Gina')
        b = User.objects.create_user('h@example.com', 'pw12345678', first_name='Hal')
        outsider = User.objects.create_user('i@example.com', 'pw12345678')
        ca, cb, co = APIClient(), APIClient(), APIClient()
        ca.force_authenticate(a)
        cb.force_authenticate(b)
        co.force_authenticate(outsider)
        room = ca.post('/api/calls/ring/', {'partner_id': b.id}, format='json').data['room_id']
        sid = ca.get('/api/sessions/', {'room_id': room}).data[0]['id']

        self.assertEqual(ca.get(f'/api/sessions/{sid}/note/').data['text'], '')
        self.assertEqual(ca.put(f'/api/sessions/{sid}/note/', {'text': 'my words'}, format='json').status_code, 200)
        ca.put(f'/api/sessions/{sid}/note/', {'text': 'my words v2'}, format='json')

        self.assertEqual(ca.get(f'/api/sessions/{sid}/note/').data['text'], 'my words v2')
        self.assertEqual(cb.get(f'/api/sessions/{sid}/note/').data['text'], '')  # private
        self.assertEqual(co.get(f'/api/sessions/{sid}/note/').status_code, 403)

        listed = ca.get('/api/sessions/notes/').data
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0]['text'], 'my words v2')
        self.assertEqual(listed[0]['other']['full_name'], 'Hal')
        self.assertEqual(cb.get('/api/sessions/notes/').data, [])


class SessionReportTests(TransactionTestCase):
    def test_report_and_note_to_admin(self):
        a = User.objects.create_user('j@example.com', 'pw12345678')
        b = User.objects.create_user('k@example.com', 'pw12345678')
        outsider = User.objects.create_user('l@example.com', 'pw12345678')
        ca, co = APIClient(), APIClient()
        ca.force_authenticate(a)
        co.force_authenticate(outsider)
        room = ca.post('/api/calls/ring/', {'partner_id': b.id}, format='json').data['room_id']
        sid = ca.get('/api/sessions/', {'room_id': room}).data[0]['id']

        ok = ca.post(f'/api/sessions/{sid}/report/', {'reason': 'harassment', 'details': 'rude'}, format='json')
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ca.post(f'/api/sessions/{sid}/report/', {'reason': 'bogus'}, format='json').status_code, 400)
        self.assertEqual(ca.post(f'/api/sessions/{sid}/report/', {'reason': 'other'}, format='json').status_code, 400)
        self.assertEqual(ca.post(f'/api/sessions/{sid}/report/', {'reason': 'note_to_admin', 'details': 'hi admin'}, format='json').status_code, 201)
        self.assertEqual(co.post(f'/api/sessions/{sid}/report/', {'reason': 'spam'}, format='json').status_code, 403)

        from sessions_app.models import SessionReport
        self.assertEqual(SessionReport.objects.filter(reported_user=b).count(), 2)

    def test_notes_can_be_filtered_by_partner(self):
        a = User.objects.create_user('m@example.com', 'pw12345678')
        b = User.objects.create_user('n@example.com', 'pw12345678')
        c = User.objects.create_user('o@example.com', 'pw12345678')
        client = APIClient()
        client.force_authenticate(a)
        for other, text in ((b, 'about b'), (c, 'about c')):
            room = client.post('/api/calls/ring/', {'partner_id': other.id}, format='json').data['room_id']
            sid = client.get('/api/sessions/', {'room_id': room}).data[0]['id']
            client.put(f'/api/sessions/{sid}/note/', {'text': text}, format='json')
        only_b = client.get('/api/sessions/notes/', {'with': b.id}).data
        self.assertEqual([n['text'] for n in only_b], ['about b'])
        self.assertEqual(len(client.get('/api/sessions/notes/').data), 2)


class FirstTurnTests(TransactionTestCase):
    def _users(self, a_lang, b_lang):
        a = User.objects.create_user('p@example.com', 'pw12345678')
        b = User.objects.create_user('q@example.com', 'pw12345678')
        for user, lang in ((a, a_lang), (b, b_lang)):
            user.profile.learning_language = lang
            user.profile.save()
        return a, b

    def _first_turn(self, caller, callee):
        client = APIClient()
        client.force_authenticate(caller)
        room = client.post('/api/calls/ring/', {'partner_id': callee.id}, format='json').data['room_id']
        sid = client.get('/api/sessions/', {'room_id': room}).data[0]['id']
        return client.get(f'/api/sessions/{sid}/first-turn/').data

    def _complete(self, user, count):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from courses.models import Material, MaterialProgress
        for n in range(1, count + 1):
            m = Material.objects.get_or_create(language='English', level='A1', order=n, defaults={
                'title': f'L{n}', 'file': SimpleUploadedFile(f'English-A1-Lesson-{n:02d}.pptx', b'x')})[0]
            MaterialProgress.objects.update_or_create(user=user, material=m, defaults={'status': 'complete'})

    def test_more_lessons_goes_first_even_if_not_the_caller(self):
        caller, callee = self._users('English', 'English')
        self._complete(caller, 2)
        self._complete(callee, 5)
        data = self._first_turn(caller, callee)
        self.assertTrue(data['same_language'])
        self.assertEqual(data['first_user_id'], callee.id)

    def test_tie_goes_to_the_requester(self):
        caller, callee = self._users('English', 'English')
        self._complete(caller, 3)
        self._complete(callee, 3)
        self.assertEqual(self._first_turn(caller, callee)['first_user_id'], caller.id)

    def test_different_languages_requester_first(self):
        caller, callee = self._users('English', 'French')
        self._complete(callee, 9)
        data = self._first_turn(caller, callee)
        self.assertFalse(data['same_language'])
        self.assertEqual(data['first_user_id'], caller.id)


class SessionSummaryTests(TransactionTestCase):
    def test_summary_collects_notes_versions_chat_and_files(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from chat.models import Conversation, Message
        from courses.models import Material

        a = User.objects.create_user('r@example.com', 'pw12345678', first_name='Ann')
        b = User.objects.create_user('s@example.com', 'pw12345678', first_name='Bob')
        ca, cb = APIClient(), APIClient()
        ca.force_authenticate(a)
        cb.force_authenticate(b)
        room = ca.post('/api/calls/ring/', {'partner_id': b.id}, format='json').data['room_id']
        sid = ca.get('/api/sessions/', {'room_id': room}).data[0]['id']

        ca.put(f'/api/sessions/{sid}/note/', {'text': 'first draft'}, format='json')
        ca.put(f'/api/sessions/{sid}/note/', {'text': 'second draft'}, format='json')  # within a minute: same version
        conversation = Conversation.objects.create()
        conversation.participants.add(a, b)
        Message.objects.create(conversation=conversation, sender=b, text='hello from Bob')
        material = Material.objects.create(language='English', level='A1', title='Lesson 1', order=1,
                                           file=SimpleUploadedFile('English-A1-Lesson-01-x.pptx', b'x'))
        self.assertEqual(ca.post(f'/api/sessions/{sid}/shared/', {'material_id': material.id}, format='json').status_code, 201)

        data = ca.get(f'/api/sessions/{sid}/summary/').data
        self.assertEqual(data['note']['text'], 'second draft')
        self.assertEqual(len(data['note']['revisions']), 1)
        self.assertEqual(data['chat'][0]['text'], 'hello from Bob')
        self.assertFalse(data['chat'][0]['mine'])
        self.assertEqual(data['files'][0]['title'], 'Lesson 1')
        self.assertTrue(data['files'][0]['shared_by_me'])
        self.assertEqual(data['session']['other']['full_name'], 'Bob')

        # private: Bob sees his own (empty) note, not Ann's
        self.assertEqual(cb.get(f'/api/sessions/{sid}/summary/').data['note']['text'], '')


class LowRatingAndRecordingTests(TransactionTestCase):
    def _session(self):
        a = User.objects.create_user('t@example.com', 'pw12345678')
        b = User.objects.create_user('u@example.com', 'pw12345678')
        client = APIClient()
        client.force_authenticate(a)
        room = client.post('/api/calls/ring/', {'partner_id': b.id}, format='json').data['room_id']
        sid = client.get('/api/sessions/', {'room_id': room}).data[0]['id']
        client.patch(f'/api/sessions/{sid}/status/', {'status': 'completed'}, format='json')
        return client, sid, b

    def test_low_rating_needs_a_reason(self):
        client, sid, _ = self._session()
        self.assertEqual(client.post(f'/api/sessions/{sid}/rate/', {'score': 2}, format='json').status_code, 400)
        self.assertEqual(client.post(f'/api/sessions/{sid}/rate/', {'score': 1, 'comment': '  '}, format='json').status_code, 400)
        self.assertEqual(client.post(f'/api/sessions/{sid}/rate/', {'score': 2, 'comment': 'was rude'}, format='json').status_code, 201)

    def test_good_rating_needs_no_reason(self):
        client, sid, _ = self._session()
        self.assertEqual(client.post(f'/api/sessions/{sid}/rate/', {'score': 4}, format='json').status_code, 201)

    def test_recording_attaches_only_to_my_own_report(self):
        import shutil
        import tempfile

        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.test import override_settings

        media = tempfile.mkdtemp()
        try:
            with override_settings(MEDIA_ROOT=media):
                client, sid, other = self._session()
                report = client.post(f'/api/sessions/{sid}/report/', {'reason': 'harassment'}, format='json').data['id']
                url = f'/api/sessions/{sid}/report/{report}/recording/'
                clip = SimpleUploadedFile('lesson.webm', b'webm-bytes', content_type='video/webm')
                self.assertEqual(client.post(url, {'recording': clip}, format='multipart').status_code, 201)

                from sessions_app.models import SessionReport
                self.assertTrue(SessionReport.objects.get(id=report).recording.name.startswith('report_recordings/'))

                bad = SimpleUploadedFile('x.txt', b'text', content_type='text/plain')
                self.assertEqual(client.post(url, {'recording': bad}, format='multipart').status_code, 400)

                intruder = APIClient()
                intruder.force_authenticate(other)
                again = SimpleUploadedFile('lesson.webm', b'webm-bytes', content_type='video/webm')
                self.assertEqual(intruder.post(url, {'recording': again}, format='multipart').status_code, 403)
        finally:
            shutil.rmtree(media, ignore_errors=True)
