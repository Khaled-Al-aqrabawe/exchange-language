from django.contrib import admin
from django.utils.html import format_html

from .models import ScheduledSession, SessionNote, SessionReport


@admin.register(ScheduledSession)
class ScheduledSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'host', 'partner', 'scheduled_time', 'duration_minutes', 'status']
    list_filter = ['status']
    search_fields = ['host__email', 'partner__email']


@admin.register(SessionReport)
class SessionReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'reason', 'reporter', 'reported_user', 'session', 'has_recording', 'resolved', 'created_at']
    list_filter = ['reason', 'resolved']
    search_fields = ['reporter__email', 'reported_user__email', 'details']
    list_editable = ['resolved']
    readonly_fields = ['recording']

    @admin.display(description='Recording')
    def has_recording(self, obj):
        if not obj.recording:
            return '-'
        return format_html('<a href="{}" target="_blank">Watch</a>', obj.recording.url)


@admin.register(SessionNote)
class SessionNoteAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'session', 'updated_at']
    search_fields = ['user__email', 'text']
