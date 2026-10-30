from django.urls import path

from .views import (
    GeneralNoteDetailView,
    GeneralNotesView,
    NotesListView,
    NotificationsSeenView,
    NotificationsView,
    SessionDetailView,
    SessionFirstTurnView,
    SessionNoteView,
    SessionReportRecordingView,
    SessionReportView,
    SessionSharedFileView,
    SessionSummaryView,
    SessionListCreateView,
    SessionRatingView,
    SessionStatusUpdateView,
)

urlpatterns = [
    path('', SessionListCreateView.as_view(), name='session-list'),
    path('notifications/', NotificationsView.as_view(), name='session-notifications'),
    path('notifications/seen/', NotificationsSeenView.as_view(), name='session-notifications-seen'),
    path('general-notes/', GeneralNotesView.as_view(), name='general-notes'),
    path('general-notes/<int:pk>/', GeneralNoteDetailView.as_view(), name='general-note'),
    path('notes/', NotesListView.as_view(), name='session-notes'),
    path('<int:pk>/first-turn/', SessionFirstTurnView.as_view(), name='session-first-turn'),
    path('<int:pk>/summary/', SessionSummaryView.as_view(), name='session-summary'),
    path('<int:pk>/shared/', SessionSharedFileView.as_view(), name='session-shared'),
    path('<int:pk>/report/<int:report_id>/recording/', SessionReportRecordingView.as_view(), name='session-report-recording'),
    path('<int:pk>/report/', SessionReportView.as_view(), name='session-report'),
    path('<int:pk>/note/', SessionNoteView.as_view(), name='session-note'),
    path('<int:pk>/', SessionDetailView.as_view(), name='session-detail'),
    path('<int:pk>/status/', SessionStatusUpdateView.as_view(), name='session-status'),
    path('<int:pk>/rate/', SessionRatingView.as_view(), name='session-rate'),
]
