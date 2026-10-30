import logging
from datetime import timedelta
from datetime import timezone as dt_timezone

from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .emails import send_session_confirmed_email, send_session_invitation_email
from .models import (
    GeneralNote,
    ScheduledSession,
    SessionNote,
    SessionNoteRevision,
    SessionRating,
    SessionReport,
    SessionSharedFile,
)
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


class SessionNoteView(APIView):
    """The signed-in user's own notes for a session they took part in."""

    permission_classes = [permissions.IsAuthenticated]

    def _session(self, request, pk):
        try:
            return ScheduledSession.objects.get(Q(host=request.user) | Q(partner=request.user), pk=pk)
        except ScheduledSession.DoesNotExist:
            raise PermissionDenied('Not a participant of this session.')

    def get(self, request, pk):
        note = SessionNote.objects.filter(session=self._session(request, pk), user=request.user).first()
        return Response({'text': note.text if note else '', 'updated_at': note.updated_at if note else None})

    def put(self, request, pk):
        session = self._session(request, pk)
        text = request.data.get('text', '')
        if not isinstance(text, str):
            raise ValidationError({'text': 'Notes must be text.'})
        note, _ = SessionNote.objects.update_or_create(session=session, user=request.user, defaults={'text': text})
        last = note.revisions.last()
        if last is None or last.text != text:
            if last and timezone.now() - last.created_at < timedelta(minutes=1):
                last.text = text
                last.save(update_fields=['text'])
            else:
                SessionNoteRevision.objects.create(note=note, text=text)
        return Response({'text': note.text, 'updated_at': note.updated_at})


class GeneralNotesView(APIView):
    """The signed-in user's free-form notes (list and create)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response([_general_note_data(n) for n in GeneralNote.objects.filter(user=request.user)])

    def post(self, request):
        title, text = _general_note_fields(request)
        note = GeneralNote.objects.create(user=request.user, title=title, text=text)
        return Response(_general_note_data(note), status=status.HTTP_201_CREATED)


class GeneralNoteDetailView(APIView):
    """Update or delete one of the signed-in user's free-form notes."""

    permission_classes = [permissions.IsAuthenticated]

    def _note(self, request, pk):
        try:
            return GeneralNote.objects.get(pk=pk, user=request.user)
        except GeneralNote.DoesNotExist:
            raise PermissionDenied('Not your note.')

    def put(self, request, pk):
        note = self._note(request, pk)
        note.title, note.text = _general_note_fields(request)
        note.save()
        return Response(_general_note_data(note))

    def delete(self, request, pk):
        self._note(request, pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _general_note_data(note):
    return {'id': note.id, 'title': note.title, 'text': note.text, 'created_at': note.created_at, 'updated_at': note.updated_at}


def _general_note_fields(request):
    title = request.data.get('title', '')
    text = request.data.get('text', '')
    if not isinstance(title, str) or not isinstance(text, str):
        raise ValidationError({'text': 'Notes must be text.'})
    return title.strip()[:120], text


class NotesListView(APIView):
    """Every non-empty note the signed-in user has written, newest first."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notes = (
            SessionNote.objects.filter(user=request.user).exclude(text='')
            .select_related('session__host', 'session__partner')
            .order_by('-updated_at')
        )
        with_user = request.query_params.get('with')
        if with_user:
            notes = notes.filter(Q(session__host_id=with_user) | Q(session__partner_id=with_user))
        items = []
        for note in notes:
            session = note.session
            other = session.partner if session.host_id == request.user.id else session.host
            items.append({
                'session_id': session.id,
                'text': note.text,
                'updated_at': note.updated_at,
                'scheduled_time': session.scheduled_time,
                'other': {'id': other.id, 'full_name': other.full_name},
            })
        return Response(items)


class SessionReportView(APIView):
    """Report a problem with the other person in a session, or send a note to the admin."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            session = ScheduledSession.objects.select_related('host', 'partner').get(
                Q(host=request.user) | Q(partner=request.user), pk=pk
            )
        except ScheduledSession.DoesNotExist:
            raise PermissionDenied('Not a participant of this session.')

        reason = request.data.get('reason')
        if reason not in dict(SessionReport.REASON_CHOICES):
            raise ValidationError({'reason': 'Choose what the problem was.'})
        details = (request.data.get('details') or '').strip()
        if reason in ('other', 'note_to_admin') and not details:
            raise ValidationError({'details': 'Please write a few words.'})

        other = session.partner if session.host_id == request.user.id else session.host
        report = SessionReport.objects.create(
            session=session, reporter=request.user, reported_user=other, reason=reason, details=details,
        )

        # Tell the admins by email too; the report is saved either way.
        try:
            from accounts.models import User

            recipients = list(User.objects.filter(is_superuser=True, is_active=True).values_list('email', flat=True))
            if recipients:
                send_mail(
                    subject=f'[Lingua Hub] {report.get_reason_display()} - session {session.id}',
                    message=(
                        f'{request.user.full_name} ({request.user.email}) about {other.full_name} ({other.email})\n'
                        f'Session {session.id}, reason: {report.get_reason_display()}\n\n{details or "(no details)"}'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=recipients,
                    fail_silently=True,
                )
        except Exception:
            logger.exception('Failed to email admins about report %s', report.id)

        return Response({'id': report.id}, status=status.HTTP_201_CREATED)


class SessionFirstTurnView(APIView):
    """Who takes the first turn of a session.

    When both people are learning the same language, the one who has completed more of
    its lessons goes first (and so the course continues from their progress). Otherwise,
    or on a tie, the person who requested the session goes first.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        from courses.models import Material, MaterialProgress

        try:
            session = ScheduledSession.objects.select_related('host__profile', 'partner__profile').get(
                Q(host=request.user) | Q(partner=request.user), pk=pk
            )
        except ScheduledSession.DoesNotExist:
            raise PermissionDenied('Not a participant of this session.')

        host, partner = session.host, session.partner
        language = (host.profile.learning_language or '').strip().lower()
        same_language = bool(language) and language == (partner.profile.learning_language or '').strip().lower()

        counts = {}
        first = host.id
        if same_language:
            lessons = Material.objects.filter(language__iexact=language)
            counts = {
                user.id: MaterialProgress.objects.filter(user=user, status='complete', material__in=lessons).count()
                for user in (host, partner)
            }
            if counts[partner.id] > counts[host.id]:
                first = partner.id
        return Response({
            'first_user_id': first,
            'requester_id': host.id,
            'same_language': same_language,
            'counts': counts,
        })


def _participant_session(request, pk):
    try:
        return ScheduledSession.objects.select_related('host', 'partner').get(
            Q(host=request.user) | Q(partner=request.user), pk=pk
        )
    except ScheduledSession.DoesNotExist:
        raise PermissionDenied('Not a participant of this session.')


class SessionSharedFileView(APIView):
    """Records that a lesson file was shared in the session (called by the sharer's browser)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from courses.models import Material

        session = _participant_session(request, pk)
        try:
            material = Material.objects.get(id=request.data.get('material_id'))
        except (Material.DoesNotExist, ValueError, TypeError):
            raise ValidationError({'material_id': 'Unknown lesson.'})
        SessionSharedFile.objects.get_or_create(session=session, material=material, defaults={'shared_by': request.user})
        return Response(status=status.HTTP_201_CREATED)


class SessionSummaryView(APIView):
    """Everything about one session for the signed-in user: notes (and how they changed),
    the chat, the files shared, and their progress on those lessons."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        from chat.models import Message
        from courses.models import MaterialProgress

        session = _participant_session(request, pk)
        other = session.partner if session.host_id == request.user.id else session.host

        note = SessionNote.objects.filter(session=session, user=request.user).first()
        revisions = [{'text': r.text, 'created_at': r.created_at} for r in note.revisions.all()] if note else []

        start = session.scheduled_time - timedelta(minutes=10)
        end = session.scheduled_time + timedelta(minutes=session.duration_minutes + 30)
        messages = (
            Message.objects.filter(conversation__participants=request.user, created_at__range=(start, end))
            .filter(conversation__participants=other)
            .select_related('sender')
            .order_by('created_at')
        )

        shared = list(session.shared_files.select_related('material'))
        progress = {
            p.material_id: p for p in MaterialProgress.objects.filter(user=request.user, material__in=[f.material for f in shared])
        }
        files = []
        for entry in shared:
            m = entry.material
            mine = progress.get(m.id)
            files.append({
                'id': m.id,
                'title': m.title,
                'language': m.language,
                'level': m.level,
                'file': request.build_absolute_uri(m.file.url) if m.file else None,
                'file_name': m.file.name.rsplit('/', 1)[-1] if m.file else '',
                'shared_by_me': entry.shared_by_id == request.user.id,
                'my_status': mine.status if mine else None,
                'my_slide': mine.last_slide if mine and mine.status == 'partial' else None,
            })

        rating = SessionRating.objects.filter(session=session, rater=request.user).first()
        return Response({
            'session': {
                'id': session.id,
                'status': session.status,
                'scheduled_time': session.scheduled_time,
                'duration_minutes': session.duration_minutes,
                'other': {'id': other.id, 'full_name': other.full_name},
            },
            'note': {'text': note.text if note else '', 'revisions': revisions},
            'chat': [
                {'sender': m.sender.full_name, 'mine': m.sender_id == request.user.id, 'text': m.text, 'created_at': m.created_at}
                for m in messages
            ],
            'files': files,
            'my_rating': {'score': rating.score, 'comment': rating.comment} if rating else None,
        })


MAX_RECORDING_BYTES = 500 * 1024 * 1024


class SessionReportRecordingView(APIView):
    """Attaches the reporter's recording of the session to the report they just filed."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, report_id):
        try:
            report = SessionReport.objects.get(id=report_id, session_id=pk, reporter=request.user)
        except SessionReport.DoesNotExist:
            raise PermissionDenied('This is not your report.')
        upload = request.FILES.get('recording')
        if not upload:
            raise ValidationError({'recording': 'No file was sent.'})
        if upload.size > MAX_RECORDING_BYTES:
            raise ValidationError({'recording': 'The recording is too large.'})
        if not (upload.content_type or '').startswith(('video/', 'audio/')):
            raise ValidationError({'recording': 'Send a video or audio recording.'})
        report.recording = upload
        report.save(update_fields=['recording'])
        return Response({'id': report.id}, status=status.HTTP_201_CREATED)
