from django.urls import path

from .views import (
    NotificationsSeenView,
    NotificationsView,
    SessionDetailView,
    SessionListCreateView,
    SessionStatusUpdateView,
)

urlpatterns = [
    path('', SessionListCreateView.as_view(), name='session-list'),
    path('notifications/', NotificationsView.as_view(), name='session-notifications'),
    path('notifications/seen/', NotificationsSeenView.as_view(), name='session-notifications-seen'),
    path('<int:pk>/', SessionDetailView.as_view(), name='session-detail'),
    path('<int:pk>/status/', SessionStatusUpdateView.as_view(), name='session-status'),
]
