import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class ScheduledSession(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
        ('not_completed', 'Not completed'),
        ('cancelled', 'Cancelled'),
    ]

    host = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='hosted_sessions', on_delete=models.CASCADE)
    partner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='partner_sessions', on_delete=models.CASCADE)
    scheduled_time = models.DateTimeField()
    # When set, `scheduled_time` is the earliest time in a proposed window and this
    # is the latest - the invited partner picks an exact time in between when they
    # confirm. Cleared once confirmed.
    window_end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)
    room_id = models.CharField(max_length=64, default=uuid.uuid4, editable=False, unique=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    # Stamped the moment each participant joins the call room, so a completed
    # session can be told apart from one where someone was a no-show.
    host_joined_at = models.DateTimeField(null=True, blank=True)
    partner_joined_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_time']

    def __str__(self):
        return f'Session<{self.host_id} & {self.partner_id} @ {self.scheduled_time}>'


class SessionRating(models.Model):
    session = models.ForeignKey(ScheduledSession, related_name='ratings', on_delete=models.CASCADE)
    rater = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='ratings_given', on_delete=models.CASCADE)
    ratee = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='ratings_received', on_delete=models.CASCADE)
    score = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('session', 'rater')

    def __str__(self):
        return f'SessionRating<{self.session_id}: {self.rater_id} -> {self.ratee_id} = {self.score}>'
