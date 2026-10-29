from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase, override_settings
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import User
from config.asgi import application

from .models import Conversation


@override_settings(CHANNEL_LAYERS={'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}})
class ChatDeliveryTests(TransactionTestCase):
    async def test_message_reaches_the_other_participant_live(self):
        a = await database_sync_to_async(User.objects.create_user)('ca@example.com', 'pw12345678', first_name='Ann')
        b = await database_sync_to_async(User.objects.create_user)('cb@example.com', 'pw12345678', first_name='Bob')

        def make_conversation():
            conversation = Conversation.objects.create()
            conversation.participants.add(a, b)
            return conversation

        conversation = await database_sync_to_async(make_conversation)()
        comms = []
        for user in (a, b):
            token = str(AccessToken.for_user(user))
            comm = WebsocketCommunicator(application, f'/ws/chat/{conversation.id}/?token={token}')
            connected, _ = await comm.connect()
            self.assertTrue(connected)
            comms.append(comm)

        await comms[0].send_json_to({'text': 'hello Bob'})
        mine = await comms[0].receive_json_from(timeout=3)
        theirs = await comms[1].receive_json_from(timeout=3)
        self.assertEqual(mine['text'], 'hello Bob')
        self.assertEqual(theirs['text'], 'hello Bob')
        self.assertEqual(theirs['sender']['full_name'], 'Ann')
        for comm in comms:
            await comm.disconnect()

    async def test_other_participant_gets_a_new_message_notice_anywhere(self):
        a = await database_sync_to_async(User.objects.create_user)('na@example.com', 'pw12345678', first_name='Ann')
        b = await database_sync_to_async(User.objects.create_user)('nb@example.com', 'pw12345678', first_name='Bob')

        def make_conversation():
            conversation = Conversation.objects.create()
            conversation.participants.add(a, b)
            return conversation

        conversation = await database_sync_to_async(make_conversation)()
        chat = WebsocketCommunicator(application, f'/ws/chat/{conversation.id}/?token={AccessToken.for_user(a)}')
        notify = WebsocketCommunicator(application, f'/ws/notify/?token={AccessToken.for_user(b)}')
        self.assertTrue((await chat.connect())[0])
        self.assertTrue((await notify.connect())[0])

        await chat.send_json_to({'text': 'are you there?'})
        notice = await notify.receive_json_from(timeout=3)
        self.assertEqual(notice['event'], 'new-message')
        self.assertEqual(notice['conversation'], conversation.id)
        self.assertEqual(notice['sender']['name'], 'Ann')
        self.assertEqual(notice['text'], 'are you there?')
        await chat.disconnect()
        await notify.disconnect()
