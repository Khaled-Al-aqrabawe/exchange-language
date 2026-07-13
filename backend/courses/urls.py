from django.urls import path

from .views import CourseDetailView, CourseListView, LessonProgressToggleView

urlpatterns = [
    path('', CourseListView.as_view(), name='course-list'),
    path('<int:pk>/', CourseDetailView.as_view(), name='course-detail'),
    path('lessons/<int:lesson_id>/complete/', LessonProgressToggleView.as_view(), name='lesson-complete'),
]
