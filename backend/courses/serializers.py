from rest_framework import serializers

from .models import Material


class MaterialSerializer(serializers.ModelSerializer):
    file = serializers.FileField(use_url=True)
    file_name = serializers.SerializerMethodField()
    my_status = serializers.SerializerMethodField()
    my_slide = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = ['id', 'title', 'language', 'level', 'description', 'file', 'file_name', 'my_status', 'my_slide', 'created_at']

    def get_file_name(self, obj):
        return obj.file.name.rsplit('/', 1)[-1] if obj.file else ''

    # The signed-in user's progress on this lesson, passed in by the view as {material_id: (status, slide)}.
    def get_my_status(self, obj):
        entry = self.context.get('progress', {}).get(obj.id)
        return entry[0] if entry else None

    def get_my_slide(self, obj):
        entry = self.context.get('progress', {}).get(obj.id)
        return entry[1] if entry and entry[0] == 'partial' else None
