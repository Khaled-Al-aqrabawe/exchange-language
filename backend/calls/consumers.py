import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone


class CallConsumer(AsyncWebsocketConsumer):
    """Relays WebRTC offer/answer/ICE-candidate signaling messages between
    the two peers in a call room. No media ever touches the server."""

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.group_name = f'call_{self.room_id}'
        user = self.scope['user']

        if not user or not user.is_authenticated:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self._mark_joined(user)
        await self.channel_layer.group_send(self.group_name, {
            'type': 'call.signal',
            'sender_channel': self.channel_name,
            'payload': {'event': 'peer-joined', 'user_id': user.id},
        })

    @database_sync_to_async
    def _mark_joined(self, user):
        from sessions_app.models import ScheduledSession

        session = ScheduledSession.objects.filter(room_id=self.room_id).first()
        if not session:
            return
        if session.host_id == user.id and not session.host_joined_at:
            session.host_joined_at = timezone.now()
            session.save(update_fields=['host_joined_at'])
        elif session.partner_id == user.id and not session.partner_joined_at:
            session.partner_joined_at = timezone.now()
            session.save(update_fields=['partner_joined_at'])

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_send(self.group_name, {
                'type': 'call.signal',
                'sender_channel': self.channel_name,
                'payload': {'event': 'peer-left'},
            })
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        await self.channel_layer.group_send(self.group_name, {
            'type': 'call.signal',
            'sender_channel': self.channel_name,
            'payload': data,
        })

    async def call_signal(self, event):
        if event['sender_channel'] == self.channel_name:
            return
        await self.send(text_data=json.dumps(event['payload']))
