from django.urls import path

from .views import (
    NotesListView,
    NotificationsSeenView,
    NotificationsView,
    SessionDetailView,
    SessionFirstTurnView,
    SessionNoteView,
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
    path('notes/', NotesListView.as_view(), name='session-notes'),
    path('<int:pk>/first-turn/', SessionFirstTurnView.as_view(), name='session-first-turn'),
    path('<int:pk>/summary/', SessionSummaryView.as_view(), name='session-summary'),
    path('<int:pk>/shared/', SessionSharedFileView.as_view(), name='session-shared'),
    path('<int:pk>/report/', SessionReportView.as_view(), name='session-report'),
    path('<int:pk>/note/', SessionNoteView.as_view(), name='session-note'),
    path('<int:pk>/', SessionDetailView.as_view(), name='session-detail'),
    path('<int:pk>/status/', SessionStatusUpdateView.as_view(), name='session-status'),
    path('<int:pk>/rate/', SessionRatingView.as_view(), name='session-rate'),
]
