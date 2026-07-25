import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .emails import send_session_reminder_email
from .models import ScheduledSession

logger = logging.getLogger(__name__)


@shared_task
def send_session_reminders():
    now = timezone.now()
    candidates = ScheduledSession.objects.filter(
        status='confirmed',
        reminder_sent_at__isnull=True,
        scheduled_time__gte=now - timedelta(minutes=5),
        scheduled_time__lte=now + timedelta(minutes=15),
    ).select_related('host', 'partner')

    sent_count = 0
    for session in candidates:
        claimed = ScheduledSession.objects.filter(pk=session.pk, reminder_sent_at__isnull=True).update(reminder_sent_at=now)
        if not claimed:
            continue

        try:
            send_session_reminder_email(session, session.host)
            send_session_reminder_email(session, session.partner)
        except Exception:
            logger.exception('Failed to send session reminder email for session %s', session.id)
        sent_count += 1

    return sent_count


@shared_task
def complete_past_sessions():
    now = timezone.now()
    candidates = ScheduledSession.objects.filter(status='confirmed', scheduled_time__lte=now)
    ended = [
        session for session in candidates
        if session.scheduled_time + timedelta(minutes=session.duration_minutes) <= now
    ]
    completed_ids = [s.id for s in ended if s.host_joined_at and s.partner_joined_at]
    not_completed_ids = [s.id for s in ended if not (s.host_joined_at and s.partner_joined_at)]
    if completed_ids:
        ScheduledSession.objects.filter(id__in=completed_ids).update(status='completed', updated_at=now)
    if not_completed_ids:
        ScheduledSession.objects.filter(id__in=not_completed_ids).update(status='not_completed', updated_at=now)
    return len(ended)
