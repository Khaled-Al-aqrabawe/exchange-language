from rest_framework import serializers

from .models import Material


class MaterialSerializer(serializers.ModelSerializer):
    file = serializers.FileField(use_url=True)
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = ['id', 'title', 'language', 'level', 'description', 'file', 'file_name', 'created_at']

    def get_file_name(self, obj):
        return obj.file.name.rsplit('/', 1)[-1] if obj.file else ''
