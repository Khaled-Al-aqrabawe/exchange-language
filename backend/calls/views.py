import uuid

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import permissions
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User


class RingPartnerView(APIView):
    """Starts an instant call: creates a room and pushes an incoming-call event
    to the partner's open pages."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            partner = User.objects.get(id=request.data.get('partner_id'))
        except (User.DoesNotExist, ValueError, TypeError):
            raise NotFound('Partner not found')

        room_id = uuid.uuid4().hex
        avatar = getattr(request.user.profile, 'avatar', None)
        async_to_sync(get_channel_layer().group_send)(f'user_{partner.id}', {
            'type': 'notify.event',
            'payload': {
                'event': 'incoming-call',
                'room_id': room_id,
                'caller': {
                    'id': request.user.id,
                    'name': request.user.full_name,
                    'avatar': request.build_absolute_uri(avatar.url) if avatar else None,
                },
            },
        })
        return Response({'room_id': room_id})
