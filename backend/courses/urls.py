from django.urls import path

from .views import CourseDetailView, CourseListView, LessonProgressToggleView, MaterialListView

urlpatterns = [
    path('', CourseListView.as_view(), name='course-list'),
    path('materials/', MaterialListView.as_view(), name='material-list'),
    path('<int:pk>/', CourseDetailView.as_view(), name='course-detail'),
    path('lessons/<int:lesson_id>/complete/', LessonProgressToggleView.as_view(), name='lesson-complete'),
]
