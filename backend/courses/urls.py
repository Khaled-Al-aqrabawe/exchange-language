from django.urls import path

from .views import MaterialDetailView, MaterialLevelDownloadView, MaterialListView, MaterialProgressView, NextLessonView

urlpatterns = [
    path('materials/', MaterialListView.as_view(), name='material-list'),
    path('materials/download/', MaterialLevelDownloadView.as_view(), name='material-level-download'),
    path('materials/<int:pk>/', MaterialDetailView.as_view(), name='material-detail'),
    path('next/', NextLessonView.as_view(), name='next-lesson'),
    path('progress/', MaterialProgressView.as_view(), name='material-progress'),
]
