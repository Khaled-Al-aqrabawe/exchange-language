from rest_framework import serializers

from .models import Course, Lesson, LessonProgress, Material


class LessonSerializer(serializers.ModelSerializer):
    completed = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = ['id', 'title', 'video_url', 'order', 'duration_minutes', 'completed']

    def get_completed(self, obj):
        user = self.context['request'].user
        return LessonProgress.objects.filter(user=user, lesson=obj, completed=True).exists()


class CourseListSerializer(serializers.ModelSerializer):
    lesson_count = serializers.IntegerField(source='lessons.count', read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'language', 'level', 'description', 'thumbnail_url', 'lesson_count']


class CourseDetailSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'language', 'level', 'description', 'thumbnail_url', 'lessons']


class MaterialSerializer(serializers.ModelSerializer):
    file = serializers.FileField(use_url=True)
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = ['id', 'title', 'language', 'level', 'description', 'file', 'file_name', 'created_at']

    def get_file_name(self, obj):
        return obj.file.name.rsplit('/', 1)[-1] if obj.file else ''
