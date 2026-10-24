import logging
import uuid

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.cache import cache
from rest_framework import permissions
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User

logger = logging.getLogger(__name__)

RING_SECONDS = 30


def _cache_key(user_id):
    return f'incoming_call_{user_id}'


class RingPartnerView(APIView):
    """Starts an instant call: creates a room and tells the partner. The event is
    pushed over their notify socket and also stored briefly so their browser can
    pick it up by polling if the socket is down."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            partner = User.objects.get(id=request.data.get('partner_id'))
        except (User.DoesNotExist, ValueError, TypeError):
            raise NotFound('Partner not found')

        room_id = uuid.uuid4().hex
        avatar = getattr(request.user.profile, 'avatar', None)
        payload = {
            'event': 'incoming-call',
            'room_id': room_id,
            'caller': {
                'id': request.user.id,
                'name': request.user.full_name,
                'avatar': request.build_absolute_uri(avatar.url) if avatar else None,
            },
        }
        cache.set(_cache_key(partner.id), payload, RING_SECONDS)
        try:
            async_to_sync(get_channel_layer().group_send)(
                f'user_{partner.id}', {'type': 'notify.event', 'payload': payload},
            )
        except Exception:
            logger.exception('Could not push incoming-call over the channel layer')
        return Response({'room_id': room_id})


class IncomingCallView(APIView):
    """Polling fallback: the call currently ringing for the logged-in user, if any."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(cache.get(_cache_key(request.user.id)))

    def delete(self, request):
        cache.delete(_cache_key(request.user.id))
        return Response(status=204)
