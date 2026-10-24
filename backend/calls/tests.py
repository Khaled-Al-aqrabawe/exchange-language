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
