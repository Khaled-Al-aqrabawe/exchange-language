from django.urls import path

from .views import (
    NotesListView,
    NotificationsSeenView,
    NotificationsView,
    SessionDetailView,
    SessionNoteView,
    SessionListCreateView,
    SessionRatingView,
    SessionStatusUpdateView,
)

urlpatterns = [
    path('', SessionListCreateView.as_view(), name='session-list'),
    path('notifications/', NotificationsView.as_view(), name='session-notifications'),
    path('notifications/seen/', NotificationsSeenView.as_view(), name='session-notifications-seen'),
    path('notes/', NotesListView.as_view(), name='session-notes'),
    path('<int:pk>/note/', SessionNoteView.as_view(), name='session-note'),
    path('<int:pk>/', SessionDetailView.as_view(), name='session-detail'),
    path('<int:pk>/status/', SessionStatusUpdateView.as_view(), name='session-status'),
    path('<int:pk>/rate/', SessionRatingView.as_view(), name='session-rate'),
]
