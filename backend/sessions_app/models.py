import uuid

from django.conf import settings
from django.db import models


class ScheduledSession(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    host = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='hosted_sessions', on_delete=models.CASCADE)
    partner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='partner_sessions', on_delete=models.CASCADE)
    scheduled_time = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=30)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    room_id = models.CharField(max_length=64, default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scheduled_time']

    def __str__(self):
        return f'Session<{self.host_id} & {self.partner_id} @ {self.scheduled_time}>'
