from django.contrib import admin

from .models import ScheduledSession, SessionNote, SessionReport


@admin.register(ScheduledSession)
class ScheduledSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'host', 'partner', 'scheduled_time', 'duration_minutes', 'status']
    list_filter = ['status']
    search_fields = ['host__email', 'partner__email']


@admin.register(SessionReport)
class SessionReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'reason', 'reporter', 'reported_user', 'session', 'resolved', 'created_at']
    list_filter = ['reason', 'resolved']
    search_fields = ['reporter__email', 'reported_user__email', 'details']
    list_editable = ['resolved']


@admin.register(SessionNote)
class SessionNoteAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'session', 'updated_at']
    search_fields = ['user__email', 'text']
