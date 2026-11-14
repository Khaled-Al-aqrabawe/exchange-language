import logging
import uuid
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import permissions
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from sessions_app.models import ScheduledSession

from .models import GroupMember, GroupRoom

logger = logging.getLogger(__name__)

RING_SECONDS = 30
INSTANT_CALL_MINUTES = 50


def _cache_key(user_id):
    return f'incoming_call_{user_id}'


def _notify_partner(request, partner, room_id, session=None):
    avatar = getattr(request.user.profile, 'avatar', None)
    payload = {
        'event': 'incoming-call',
        'room_id': room_id,
        'caller': {
            'id': request.user.id,
            'name': request.user.full_name,
            'avatar': request.build_absolute_uri(avatar.url) if avatar else None,
        },
        # what the caller wants to do, so the other person can decide before answering
        'session_type': session.session_type if session else 'lesson',
        'lesson': session.lesson if session else None,
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

        session_type = request.data.get('session_type', 'lesson')
        if session_type not in ('lesson', 'conversation'):
            raise ValidationError({'session_type': 'Choose a lesson or a free conversation.'})
        accepted = getattr(getattr(partner, 'profile', None), 'available_types', 'both')
        if accepted != 'both' and accepted != session_type:
            raise ValidationError({'session_type': 'This partner only takes %s right now.' % (
                'lessons' if accepted == 'lesson' else 'free conversation')})
        lesson = request.data.get('lesson')
        lesson = int(lesson) if session_type == 'lesson' and str(lesson or '').isdigit() else None

        room_id = uuid.uuid4().hex
        # The call is a real session so it can be completed and rated like a booked one.
        session = ScheduledSession.objects.create(
            host=request.user, partner=partner, scheduled_time=timezone.now(),
            duration_minutes=INSTANT_CALL_MINUTES, status='confirmed', room_id=room_id, is_instant=True,
            session_type=session_type, lesson=lesson,
        )
        if request.data.get('notify', True) is not False:
            _notify_partner(request, partner, room_id, session)
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
        _notify_partner(request, session.partner, session.room_id, session)
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


class DeclineCallView(APIView):
    """The person being called said no: tell the caller (who is waiting in the call room) and
    drop the unused instant session."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        room_id = request.data.get('room_id')
        session = ScheduledSession.objects.filter(
            room_id=room_id, partner=request.user, is_instant=True, partner_joined_at__isnull=True,
        ).first()
        cache.delete(_cache_key(request.user.id))
        if not session:
            return Response(status=204)
        payload = {'event': 'call-declined', 'user_id': request.user.id}
        try:
            async_to_sync(get_channel_layer().group_send)(
                f'call_{room_id}', {'type': 'call.signal', 'sender_channel': '', 'payload': payload},
            )
        except Exception:
            logger.exception('Could not push call-declined over the channel layer')
        if not session.host_joined_at:
            session.delete()
        else:
            session.status = 'cancelled'
            session.save(update_fields=['status'])
        return Response(status=204)


# ---------------------------------------------------------------------------
# Small groups: scheduled sessions for up to GroupRoom.MAX_MEMBERS people
# ---------------------------------------------------------------------------

def _person(request, user):
    avatar = getattr(user.profile, 'avatar', None)
    return {
        'id': user.id,
        'name': user.full_name,
        'avatar': request.build_absolute_uri(avatar.url) if avatar else None,
    }


def _group_data(request, room):
    members = [m.user for m in room.members.select_related('user', 'user__profile').order_by('joined_at')]
    return {
        'room_id': room.room_id,
        'host': _person(request, room.host),
        'session_type': room.session_type,
        'lesson': room.lesson,
        'language': room.language,
        'level': room.level,
        'scheduled_time': room.scheduled_time.isoformat(),
        'duration_minutes': room.duration_minutes,
        'members': [_person(request, u) for u in members],
        'seats_taken': len(members),
        'max_members': GroupRoom.MAX_MEMBERS,
        'is_member': any(u.id == request.user.id for u in members),
        'is_host': room.host_id == request.user.id,
        'can_enter': room.can_enter,
        'cancelled': room.ended_at is not None,
    }


class GroupListCreateView(APIView):
    """GET: upcoming groups people can reserve a seat in (plus the ones I am in).
    POST: schedule a group."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rooms = GroupRoom.objects.filter(ended_at__isnull=True)
        data = []
        for room in rooms.select_related('host', 'host__profile'):
            if not room.is_open:
                continue
            item = _group_data(request, room)
            if item['seats_taken'] >= GroupRoom.MAX_MEMBERS and not item['is_member']:
                continue
            data.append(item)
        data.sort(key=lambda g: g['scheduled_time'])
        return Response(data)

    def post(self, request):
        # small groups are always free conversation
        session_type = 'conversation'
        lesson = None

        when = parse_datetime(str(request.data.get('scheduled_time') or ''))
        if when is None:
            raise ValidationError({'scheduled_time': 'Choose a date and time.'})
        if timezone.is_naive(when):
            when = timezone.make_aware(when)
        if when < timezone.now() - timedelta(minutes=1):
            raise ValidationError({'scheduled_time': 'Choose a time in the future.'})
        if when > timezone.now() + timedelta(days=60):
            raise ValidationError({'scheduled_time': 'Choose a time within the next 60 days.'})

        invite_ids = request.data.get('invite_ids') or []
        if not isinstance(invite_ids, list):
            raise ValidationError({'invite_ids': 'Expected a list.'})
        invitees = list(
            User.objects.filter(id__in=[i for i in invite_ids if str(i).isdigit()])
            .exclude(id=request.user.id)[:GroupRoom.MAX_MEMBERS - 1]
        )

        profile = request.user.profile
        language = profile.learning_language or ''
        level = (profile.language_levels or {}).get(language, '')
        room = GroupRoom.objects.create(
            host=request.user, room_id=uuid.uuid4().hex, session_type=session_type, lesson=lesson,
            language=language, level=level, scheduled_time=when,
        )
        GroupMember.objects.create(room=room, user=request.user)

        payload = {
            'event': 'group-invite',
            'room_id': room.room_id,
            'host': _person(request, request.user),
            'session_type': session_type,
            'lesson': lesson,
            'language': language,
            'level': level,
            'scheduled_time': room.scheduled_time.isoformat(),
        }
        layer = get_channel_layer()
        for person in invitees:
            try:
                async_to_sync(layer.group_send)(f'user_{person.id}', {'type': 'notify.event', 'payload': payload})
            except Exception:
                logger.exception('Could not push group-invite over the channel layer')
        return Response(_group_data(request, room), status=201)


class GroupDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, room_id):
        room = GroupRoom.objects.select_related('host', 'host__profile').filter(room_id=room_id).first()
        if not room:
            raise NotFound('Group not found.')
        return Response(_group_data(request, room))


class GroupJoinView(APIView):
    """Reserve a seat (or keep the one I have). Refuses when the group is full or over."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        with transaction.atomic():
            room = GroupRoom.objects.select_for_update().filter(room_id=room_id).first()
            if not room or not room.is_open:
                raise NotFound('This group is no longer available.')
            if not GroupMember.objects.filter(room=room, user=request.user).exists():
                if room.members.count() >= GroupRoom.MAX_MEMBERS:
                    raise ValidationError({'detail': 'This group is full.'})
                GroupMember.objects.create(room=room, user=request.user)
        return Response(_group_data(request, room))


class GroupLeaveView(APIView):
    """Give up my seat. When the host does it, the whole group is cancelled."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        room = GroupRoom.objects.filter(room_id=room_id).first()
        if room:
            if room.host_id == request.user.id:
                room.ended_at = timezone.now()
                room.save(update_fields=['ended_at'])
            else:
                GroupMember.objects.filter(room=room, user=request.user).delete()
        return Response(status=204)
