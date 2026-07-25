from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course, Lesson, LessonProgress, Material
from .serializers import CourseDetailSerializer, CourseListSerializer, MaterialSerializer


class CourseListView(generics.ListAPIView):
    serializer_class = CourseListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Course.objects.all()
        language = self.request.query_params.get('language')
        level = self.request.query_params.get('level')
        if language:
            qs = qs.filter(language__iexact=language)
        if level:
            qs = qs.filter(level=level)
        return qs


class CourseDetailView(generics.RetrieveAPIView):
    queryset = Course.objects.prefetch_related('lessons')
    serializer_class = CourseDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        return {'request': self.request}


class MaterialListView(generics.ListAPIView):
    serializer_class = MaterialSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Material.objects.all()
        language = self.request.query_params.get('language')
        level = self.request.query_params.get('level')
        if language:
            qs = qs.filter(language__iexact=language)
        if level:
            qs = qs.filter(level=level)
        return qs

    def get_serializer_context(self):
        return {'request': self.request}


class LessonProgressToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, lesson_id):
        lesson = Lesson.objects.get(id=lesson_id)
        completed = bool(request.data.get('completed', True))
        progress, _ = LessonProgress.objects.update_or_create(
            user=request.user, lesson=lesson,
            defaults={'completed': completed, 'completed_at': timezone.now() if completed else None},
        )
        return Response({'lesson_id': lesson.id, 'completed': progress.completed})
