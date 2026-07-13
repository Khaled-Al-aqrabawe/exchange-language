from django.contrib import admin

from .models import ScheduledSession


@admin.register(ScheduledSession)
class ScheduledSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'host', 'partner', 'scheduled_time', 'duration_minutes', 'status']
    list_filter = ['status']
    search_fields = ['host__email', 'partner__email']
