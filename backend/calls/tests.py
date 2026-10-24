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
