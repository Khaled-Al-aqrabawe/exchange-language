import os
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
    # Started with "Call now" instead of being booked: no invitation, reminder or notification.
    is_instant = models.BooleanField(default=False)
    # What the time is for: a lesson from the course, or an ordinary free conversation.
    SESSION_TYPES = [('lesson', 'Lesson'), ('conversation', 'Free conversation')]
    session_type = models.CharField(max_length=20, choices=SESSION_TYPES, default='lesson')
    # Optional: the lesson number the two want to work through (only for a lesson).
    lesson = models.PositiveIntegerField(null=True, blank=True)
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


class SessionNote(models.Model):
    """A participant's private notepad for one session (each person has their own)."""

    session = models.ForeignKey(ScheduledSession, related_name='personal_notes', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='session_notes', on_delete=models.CASCADE)
    text = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('session', 'user')

    def __str__(self):
        return f'SessionNote<{self.session_id}: {self.user_id}>'


class GeneralNote(models.Model):
    """A free-form note that belongs to the user, not to any session or course."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='general_notes', on_delete=models.CASCADE)
    title = models.CharField(max_length=120, blank=True)
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'GeneralNote<{self.id}: {self.user_id}>'


def report_recording_path(instance, filename):
    """Random file names, so a recording cannot be found by guessing a URL."""
    extension = os.path.splitext(filename)[1].lower() or '.webm'
    return f'report_recordings/{uuid.uuid4().hex}{extension}'


class SessionReport(models.Model):
    """A problem reported about the other person in a session, or a note sent to the admin."""

    REASON_CHOICES = [
        ('harassment', 'Harassment or abuse'),
        ('inappropriate_content', 'Inappropriate content'),
        ('no_show', 'Did not show up'),
        ('late_or_left_early', 'Late or left early'),
        ('off_topic', 'Not practicing the language'),
        ('technical', 'Audio or video problems'),
        ('fake_profile', 'Fake profile'),
        ('spam', 'Spam'),
        ('other', 'Other'),
        ('note_to_admin', 'Note to admin'),
    ]

    session = models.ForeignKey(ScheduledSession, related_name='reports', on_delete=models.CASCADE)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='session_reports_made', on_delete=models.CASCADE)
    # The other person in the session; the same for every reason, including a plain note to the admin.
    reported_user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='session_reports_received', on_delete=models.CASCADE)
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    details = models.TextField(blank=True)
    # The reporter's browser recording of the session, uploaded only when a report is filed.
    recording = models.FileField(upload_to=report_recording_path, null=True, blank=True)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'SessionReport<{self.session_id}: {self.reporter_id} -> {self.reported_user_id} ({self.reason})>'


class SessionNoteRevision(models.Model):
    """A saved version of a note, so the changes made during a session can be looked back on."""

    note = models.ForeignKey(SessionNote, related_name='revisions', on_delete=models.CASCADE)
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class SessionSharedFile(models.Model):
    """A lesson file shared during a session."""

    session = models.ForeignKey(ScheduledSession, related_name='shared_files', on_delete=models.CASCADE)
    material = models.ForeignKey('courses.Material', related_name='shared_in_sessions', on_delete=models.CASCADE)
    shared_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='+', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
