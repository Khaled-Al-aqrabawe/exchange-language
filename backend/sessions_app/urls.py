from django.urls import path

from .views import SessionDetailView, SessionListCreateView, SessionStatusUpdateView

urlpatterns = [
    path('', SessionListCreateView.as_view(), name='session-list'),
    path('<int:pk>/', SessionDetailView.as_view(), name='session-detail'),
    path('<int:pk>/status/', SessionStatusUpdateView.as_view(), name='session-status'),
]
