from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class GroupRoom(models.Model):
    """A scheduled small group session (up to MAX_MEMBERS people, the host included).

    People reserve a seat ahead of time; at the scheduled time the members enter one video
    call. The lesson (if any) is one of the course lessons at the host's language and level."""

    MAX_MEMBERS = 4
    DEFAULT_MINUTES = 50
    # members may enter the call this long before it starts
    EARLY_ENTRY = timedelta(minutes=10)

    room_id = models.CharField(max_length=32, unique=True)
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hosted_groups')
    session_type = models.CharField(max_length=12, default='conversation')
    lesson = models.PositiveIntegerField(null=True, blank=True)
    language = models.CharField(max_length=50, blank=True)
    level = models.CharField(max_length=10, blank=True)
    scheduled_time = models.DateTimeField(default=timezone.now)
    duration_minutes = models.PositiveIntegerField(default=DEFAULT_MINUTES)
    created_at = models.DateTimeField(auto_now_add=True)
    # set when the host cancels the group
    ended_at = models.DateTimeField(null=True, blank=True)

    @property
    def ends_at(self):
        return self.scheduled_time + timedelta(minutes=self.duration_minutes)

    @property
    def is_open(self):
        """Not cancelled and not over yet."""
        return self.ended_at is None and timezone.now() < self.ends_at

    @property
    def can_enter(self):
        now = timezone.now()
        return self.ended_at is None and self.scheduled_time - self.EARLY_ENTRY <= now < self.ends_at


class GroupMember(models.Model):
    room = models.ForeignKey(GroupRoom, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='group_memberships')
    # when the seat was reserved
    joined_at = models.DateTimeField(default=timezone.now)
    # inside the call right now
    connected = models.BooleanField(default=False)
    # the websocket currently in the call, so an old socket closing after a refresh does not
    # drop the new one
    socket_id = models.CharField(max_length=128, blank=True)

    class Meta:
        unique_together = ('room', 'user')
