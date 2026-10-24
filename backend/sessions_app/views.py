import logging
from datetime import timedelta
from datetime import timezone as dt_timezone

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .emails import send_session_confirmed_email, send_session_invitation_email
from .models import ScheduledSession, SessionRating
from .serializers import ScheduledSessionSerializer, SessionRatingSerializer

logger = logging.getLogger(__name__)


def expire_stale_sessions(user):
    """Auto-resolve sessions whose time has passed with no outcome.

    Pending requests nobody responded to before their deadline are dead -
    cancel them. Confirmed sessions that ended without either side ever
    joining the call are a no-show, not a completed session.
    """
    now = timezone.now()
    participant = Q(host=user) | Q(partner=user)

    stale_pending_ids = list(
        ScheduledSession.objects.filter(participant, status='pending')
        .filter(
            Q(window_end_time__isnull=False, window_end_time__lt=now)
            | Q(window_end_time__isnull=True, scheduled_time__lt=now)
        )
        .values_list('id', flat=True)
    )
    if stale_pending_ids:
        ScheduledSession.objects.filter(id__in=stale_pending_ids).update(
            status='cancelled',
            cancellation_reason='Automatically cancelled - the scheduled time passed with no response.',
        )

    ended_unjoined = ScheduledSession.objects.filter(
        participant, status='confirmed', scheduled_time__lt=now,
        host_joined_at__isnull=True, partner_joined_at__isnull=True,
    ).only('id', 'scheduled_time', 'duration_minutes')
    stale_confirmed_ids = [
        s.id for s in ended_unjoined if s.scheduled_time + timedelta(minutes=s.duration_minutes) < now
    ]
    if stale_confirmed_ids:
        ScheduledSession.objects.filter(id__in=stale_confirmed_ids).update(status='not_completed')


class SessionListCreateView(generics.ListCreateAPIView):
    serializer_class = ScheduledSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        expire_stale_sessions(user)
        qs = ScheduledSession.objects.filter(Q(host=user) | Q(partner=user)).select_related('host', 'partner')
        room_id = self.request.query_params.get('room_id')
        if room_id:
            qs = qs.filter(room_id=room_id)
        return qs

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        partner_id = self.request.data.get('partner_id')
        if str(partner_id) == str(self.request.user.id):
            raise ValidationError('Cannot schedule a session with yourself.')
        session = serializer.save()
        try:
            if session.status == 'confirmed':
                # Auto-confirmed from the partner's own published availability -
                # both sides are notified immediately, no approval step needed.
                send_session_invitation_email(session)
                send_session_confirmed_email(session)
            else:
                send_session_invitation_email(session)
        except Exception:
            logger.exception('Failed to send session notification email for session %s', session.id)


class SessionDetailView(generics.RetrieveAPIView):
    serializer_class = ScheduledSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ScheduledSession.objects.filter(Q(host=user) | Q(partner=user))


class SessionStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            session = ScheduledSession.objects.select_related('host', 'partner').get(
                Q(host=request.user) | Q(partner=request.user), pk=pk
            )
        except ScheduledSession.DoesNotExist:
            raise PermissionDenied('Not a participant of this session.')

        status_value = request.data.get('status')
        valid_statuses = dict(ScheduledSession.STATUS_CHOICES)
        if status_value not in valid_statuses:
            raise ValidationError({'status': f'Must be one of {list(valid_statuses)}.'})

        if status_value in ('rejected', 'confirmed') and session.partner_id != request.user.id:
            raise PermissionDenied('Only the invited partner can respond to this request.')
        if status_value in ('rejected', 'confirmed') and session.status != 'pending':
            raise ValidationError({'status': 'This request has already been responded to.'})

        update_fields = ['status', 'updated_at']
        session.status = status_value

        if status_value == 'cancelled':
            reason = (request.data.get('reason') or '').strip()
            if not reason:
                raise ValidationError({'reason': 'A cancellation reason is required.'})
            session.cancellation_reason = reason
            update_fields.append('cancellation_reason')

        if status_value == 'confirmed' and session.window_end_time:
            chosen_raw = request.data.get('scheduled_time')
            if not chosen_raw:
                raise ValidationError({'scheduled_time': 'Pick a time within the proposed window to confirm.'})
            chosen = parse_datetime(chosen_raw)
            if chosen is None:
                raise ValidationError({'scheduled_time': 'Invalid date/time.'})
            if timezone.is_naive(chosen):
                chosen = timezone.make_aware(chosen, dt_timezone.utc)
            if not (session.scheduled_time <= chosen <= session.window_end_time):
                raise ValidationError({'scheduled_time': 'That time is outside the proposed window.'})
            session.scheduled_time = chosen
            session.window_end_time = None
            update_fields += ['scheduled_time', 'window_end_time']

        session.save(update_fields=update_fields)

        if status_value == 'confirmed':
            try:
                send_session_confirmed_email(session)
            except Exception:
                logger.exception('Failed to send session confirmed email for session %s', session.id)

        return Response(ScheduledSessionSerializer(session, context={'request': request}).data)


class SessionRatingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            session = ScheduledSession.objects.select_related('host', 'partner').get(
                Q(host=request.user) | Q(partner=request.user), pk=pk
            )
        except ScheduledSession.DoesNotExist:
            raise PermissionDenied('Not a participant of this session.')

        if session.status not in ('completed', 'not_completed'):
            raise ValidationError({'detail': 'You can only rate a session after it has ended.'})

        ratee = session.partner if request.user.id == session.host_id else session.host

        if SessionRating.objects.filter(session=session, rater=request.user).exists():
            raise ValidationError({'detail': 'You already rated this session.'})

        serializer = SessionRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rating = SessionRating.objects.create(
            session=session, rater=request.user, ratee=ratee, **serializer.validated_data,
        )
        return Response(SessionRatingSerializer(rating).data, status=status.HTTP_201_CREATED)


class NotificationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        expire_stale_sessions(user)
        seen_at = user.profile.notifications_seen_at
        show_all = request.query_params.get('all') == '1'
        per_type_limit = 100 if show_all else 15

        requests_qs = (
            ScheduledSession.objects.filter(partner=user, status='pending')
            .select_related('host', 'partner')
            .order_by('-created_at')[:per_type_limit]
        )
        confirmed_qs = (
            ScheduledSession.objects.filter(host=user, status='confirmed', is_instant=False)
            .select_related('host', 'partner')
            .order_by('-updated_at')[:per_type_limit]
        )
        reminder_qs = (
            ScheduledSession.objects.filter(Q(host=user) | Q(partner=user), status='confirmed', is_instant=False, reminder_sent_at__isnull=False)
            .select_related('host', 'partner')
            .order_by('-reminder_sent_at')[:per_type_limit]
        )

        items = []
        for session in requests_qs:
            items.append({
                'type': 'request',
                'session': ScheduledSessionSerializer(session).data,
                'timestamp': session.created_at,
                'is_new': seen_at is None or session.created_at > seen_at,
            })
        for session in confirmed_qs:
            items.append({
                'type': 'confirmed',
                'session': ScheduledSessionSerializer(session).data,
                'timestamp': session.updated_at,
                'is_new': seen_at is None or session.updated_at > seen_at,
            })
        for session in reminder_qs:
            items.append({
                'type': 'reminder',
                'session': ScheduledSessionSerializer(session).data,
                'timestamp': session.reminder_sent_at,
                'is_new': seen_at is None or session.reminder_sent_at > seen_at,
            })

        items.sort(key=lambda item: item['timestamp'], reverse=True)
        unread_count = sum(1 for item in items if item['is_new'])

        return Response({'unread_count': unread_count, 'items': items if show_all else items[:20]})


class NotificationsSeenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = request.user.profile
        profile.notifications_seen_at = timezone.now()
        profile.save(update_fields=['notifications_seen_at'])
        return Response({'notifications_seen_at': profile.notifications_seen_at})
