from django.urls import path

from .views import (
    MaterialDetailView,
    MaterialLevelDownloadView,
    MaterialListView,
    MaterialProgressView,
    MaterialTextView,
    NextLessonView,
    TranslateView,
)

urlpatterns = [
    path('materials/', MaterialListView.as_view(), name='material-list'),
    path('materials/download/', MaterialLevelDownloadView.as_view(), name='material-level-download'),
    path('materials/<int:pk>/', MaterialDetailView.as_view(), name='material-detail'),
    path('materials/<int:pk>/text/', MaterialTextView.as_view(), name='material-text'),
    path('translate/', TranslateView.as_view(), name='translate'),
    path('next/', NextLessonView.as_view(), name='next-lesson'),
    path('progress/', MaterialProgressView.as_view(), name='material-progress'),
]
