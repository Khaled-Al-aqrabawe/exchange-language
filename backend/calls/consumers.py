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


class UserNotifyConsumer(AsyncWebsocketConsumer):
    """Per-user channel used to push live events (e.g. an incoming call) to
    whichever pages the user has open."""

    async def connect(self):
        user = self.scope['user']
        if not user or not user.is_authenticated:
            await self.close()
            return
        self.group_name = f'user_{user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notify_event(self, event):
        await self.send(text_data=json.dumps(event['payload']))


class GroupCallConsumer(AsyncWebsocketConsumer):
    """Signalling for a small group call. Every person connects to every other one directly
    (a mesh, fine for up to four people); this socket only carries the offers, answers and
    ICE candidates between them, plus a little group chat. No media touches the server.

    Only people who reserved a seat can connect, from shortly before the start time.

    Messages from the browser: {"to": <user id>, "type": "offer|answer|ice", ...} goes to one
    person; {"type": "chat", "text": "..."} and {"type": "media-state", ...} go to everyone.
    The server adds "from" to what it forwards."""

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.group_name = f'group_{self.room_id}'
        user = self.scope['user']
        if not user or not user.is_authenticated:
            await self.close()
            return
        self.user = user
        self.own_group = f'{self.group_name}_u{user.id}'

        others = await self._enter()
        if others is None:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.channel_layer.group_add(self.own_group, self.channel_name)
        await self.accept()
        # tell the newcomer who is already here (it makes the offers), and tell the others
        await self.send(text_data=json.dumps({'event': 'peers', 'peers': others}))
        await self.channel_layer.group_send(self.group_name, {
            'type': 'group.signal',
            'sender_channel': self.channel_name,
            'payload': {'event': 'peer-joined', 'peer': {'id': user.id, 'name': user.full_name}},
        })

    @database_sync_to_async
    def _enter(self):
        from .models import GroupMember, GroupRoom

        room = GroupRoom.objects.filter(room_id=self.room_id).first()
        if not room or not room.can_enter:
            return None
        member = GroupMember.objects.filter(room=room, user=self.user).first()
        if not member:
            return None
        member.connected = True
        member.socket_id = self.channel_name
        member.save(update_fields=['connected', 'socket_id'])
        return [
            {'id': m.user_id, 'name': m.user.full_name}
            for m in room.members.filter(connected=True).exclude(user=self.user).select_related('user')
        ]

    @database_sync_to_async
    def _leave(self):
        from .models import GroupMember

        return bool(GroupMember.objects.filter(
            room__room_id=self.room_id, user=self.user, socket_id=self.channel_name,
        ).update(connected=False))

    async def disconnect(self, close_code):
        if not hasattr(self, 'own_group'):
            return
        left = await self._leave()
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        await self.channel_layer.group_discard(self.own_group, self.channel_name)
        if left:
            await self.channel_layer.group_send(self.group_name, {
                'type': 'group.signal',
                'sender_channel': self.channel_name,
                'payload': {'event': 'peer-left', 'peer': {'id': self.user.id}},
            })

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except ValueError:
            return
        kind = data.get('type')
        if kind == 'chat':
            text = str(data.get('text') or '').strip()[:1000]
            if not text:
                return
            payload = {'type': 'chat', 'text': text, 'from': self.user.id, 'name': self.user.full_name}
        elif kind in ('offer', 'answer', 'ice'):
            to = data.get('to')
            if not isinstance(to, int):
                return
            await self.channel_layer.group_send(f'{self.group_name}_u{to}', {
                'type': 'group.signal',
                'sender_channel': self.channel_name,
                'payload': {**data, 'from': self.user.id},
            })
            return
        elif kind == 'media-state':
            payload = {'type': 'media-state', 'from': self.user.id, 'mic': bool(data.get('mic')), 'cam': bool(data.get('cam'))}
        else:
            return
        await self.channel_layer.group_send(self.group_name, {
            'type': 'group.signal',
            'sender_channel': self.channel_name,
            'payload': payload,
        })

    async def group_signal(self, event):
        if event['sender_channel'] == self.channel_name:
            return
        await self.send(text_data=json.dumps(event['payload']))
