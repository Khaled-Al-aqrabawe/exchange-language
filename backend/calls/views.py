import logging
import uuid

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.cache import cache
from django.utils import timezone
from rest_framework import permissions
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from sessions_app.models import ScheduledSession

logger = logging.getLogger(__name__)

RING_SECONDS = 30
INSTANT_CALL_MINUTES = 50


def _cache_key(user_id):
    return f'incoming_call_{user_id}'


def _notify_partner(request, partner, room_id):
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


class RingPartnerView(APIView):
    """Starts an instant call: creates a room and tells the partner. The event is
    pushed over their notify socket and also stored briefly so their browser can
    pick it up by polling if the socket is down.

    With `notify: false` only the room is created; the caller rings later via
    `call-notify`, when they press "Join now" in the lobby."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            partner = User.objects.get(id=request.data.get('partner_id'))
        except (User.DoesNotExist, ValueError, TypeError):
            raise NotFound('Partner not found')

        room_id = uuid.uuid4().hex
        # The call is a real session so it can be completed and rated like a booked one.
        ScheduledSession.objects.create(
            host=request.user, partner=partner, scheduled_time=timezone.now(),
            duration_minutes=INSTANT_CALL_MINUTES, status='confirmed', room_id=room_id, is_instant=True,
        )
        if request.data.get('notify', True) is not False:
            _notify_partner(request, partner, room_id)
        return Response({'room_id': room_id})


class NotifyCallView(APIView):
    """Rings the partner of a call the caller created without notifying."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session = ScheduledSession.objects.filter(
            room_id=request.data.get('room_id'), host=request.user, is_instant=True,
        ).first()
        if not session:
            raise NotFound('Call not found')
        _notify_partner(request, session.partner, session.room_id)
        return Response(status=204)


class CancelCallView(APIView):
    """The caller backed out of the lobby before joining: drop the unused instant session."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ScheduledSession.objects.filter(
            room_id=request.data.get('room_id'), host=request.user, is_instant=True, host_joined_at__isnull=True,
        ).delete()
        return Response(status=204)


class IncomingCallView(APIView):
    """Polling fallback: the call currently ringing for the logged-in user, if any."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(cache.get(_cache_key(request.user.id)))

    def delete(self, request):
        cache.delete(_cache_key(request.user.id))
        return Response(status=204)
