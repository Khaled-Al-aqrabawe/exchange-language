import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .models import Conversation, Message


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.group_name = f'chat_{self.conversation_id}'
        user = self.scope['user']

        if not user or not user.is_authenticated:
            await self.close()
            return

        allowed = await self.is_participant(user)
        if not allowed:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        text = (data.get('text') or '').strip()
        if not text:
            return

        message = await self.create_message(text)
        user = self.scope['user']
        await self.channel_layer.group_send(self.group_name, {
            'type': 'chat.message',
            'message': {
                'id': message.id,
                'conversation': message.conversation_id,
                'sender': {'id': user.id, 'email': user.email, 'full_name': user.full_name},
                'text': message.text,
                'created_at': message.created_at.isoformat(),
            },
        })

        # Tell the other people in the conversation right away, wherever they are in the app.
        for other_id in await self.other_participant_ids(user):
            await self.channel_layer.group_send(f'user_{other_id}', {
                'type': 'notify.event',
                'payload': {
                    'event': 'new-message',
                    'conversation': message.conversation_id,
                    'sender': {'id': user.id, 'name': user.full_name},
                    'text': message.text[:140],
                },
            })

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['message']))

    @database_sync_to_async
    def other_participant_ids(self, user):
        conversation = Conversation.objects.get(id=self.conversation_id)
        return list(conversation.participants.exclude(id=user.id).values_list('id', flat=True))

    @database_sync_to_async
    def is_participant(self, user):
        return Conversation.objects.filter(id=self.conversation_id, participants=user).exists()

    @database_sync_to_async
    def create_message(self, text):
        conversation = Conversation.objects.get(id=self.conversation_id)
        return Message.objects.create(conversation=conversation, sender=self.scope['user'], text=text)
