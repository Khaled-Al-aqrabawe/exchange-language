import os
import tempfile
import zipfile

from django.http import FileResponse
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import DestroyAPIView, ListCreateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MATERIAL_LANGUAGES, MATERIAL_LEVELS, Material, MaterialProgress
from .serializers import MaterialSerializer


class IsSuperuserOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.method in permissions.SAFE_METHODS or request.user.is_superuser


class IsSuperuser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class MaterialListView(ListCreateAPIView):
    """Anyone logged in can list; only superusers can upload (one or many files)."""

    serializer_class = MaterialSerializer
    permission_classes = [IsSuperuserOrReadOnly]

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
        progress = {
            p.material_id: (p.status, p.last_slide)
            for p in MaterialProgress.objects.filter(user=self.request.user)
        }
        return {'request': self.request, 'progress': progress}

    def create(self, request, *args, **kwargs):
        language = request.data.get('language', '')
        level = request.data.get('level', '')
        files = request.FILES.getlist('files')
        if language not in dict(MATERIAL_LANGUAGES):
            raise ValidationError({'language': 'Choose a valid language.'})
        if level not in dict(MATERIAL_LEVELS):
            raise ValidationError({'level': 'Choose a valid level.'})
        if not files:
            raise ValidationError({'files': 'Select at least one file.'})
        created = [
            Material.objects.create(
                language=language, level=level, description=request.data.get('description', ''), file=f,
            )
            for f in files
        ]
        data = MaterialSerializer(created, many=True, context=self.get_serializer_context()).data
        return Response(data, status=status.HTTP_201_CREATED)


class MaterialDetailView(DestroyAPIView):
    queryset = Material.objects.all()
    permission_classes = [IsSuperuser]


CEFR_ORDER = [lvl for lvl, _ in MATERIAL_LEVELS]


def next_lesson_for(user):
    """First lesson the user hasn't completed, in their learning language, starting at
    their level and moving up. A partly-done lesson resumes at its saved slide."""
    profile = user.profile
    language = profile.learning_language
    if not language:
        return None, 1
    start = (profile.language_levels or {}).get(language)
    start_index = CEFR_ORDER.index(start) if start in CEFR_ORDER else 0
    progress = {p.material_id: p for p in MaterialProgress.objects.filter(user=user)}
    for level in CEFR_ORDER[start_index:]:
        for material in Material.objects.filter(language__iexact=language, level=level):
            entry = progress.get(material.id)
            if entry and entry.status == 'complete':
                continue
            slide = entry.last_slide if entry and entry.status == 'partial' else 1
            return material, slide
    return None, 1


class NextLessonView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        material, slide = next_lesson_for(request.user)
        data = MaterialSerializer(material, context={'request': request}).data if material else None
        return Response({'material': data, 'start_slide': slide})


class MaterialProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            material = Material.objects.get(id=request.data.get('material_id'))
        except (Material.DoesNotExist, ValueError, TypeError):
            raise ValidationError({'material_id': 'Unknown lesson.'})
        status_value = request.data.get('status')
        if status_value not in dict(MaterialProgress.STATUS_CHOICES):
            raise ValidationError({'status': 'Choose complete, partial or not_started.'})
        slide = 1
        if status_value == 'partial':
            try:
                slide = int(request.data.get('last_slide'))
            except (TypeError, ValueError):
                raise ValidationError({'last_slide': 'Enter the slide number.'})
            if slide < 1:
                raise ValidationError({'last_slide': 'Enter the slide number.'})
        MaterialProgress.objects.update_or_create(
            user=request.user, material=material, defaults={'status': status_value, 'last_slide': slide},
        )
        return Response({'material_id': material.id, 'status': status_value, 'last_slide': slide})


class MaterialLevelDownloadView(APIView):
    """One zip with every lesson file of a language and level."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        language = request.query_params.get('language', '')
        level = request.query_params.get('level', '')
        if language not in dict(MATERIAL_LANGUAGES) or level not in dict(MATERIAL_LEVELS):
            raise ValidationError({'detail': 'Choose a language and a level.'})
        materials = Material.objects.filter(language=language, level=level)
        if not materials.exists():
            raise NotFound('No lessons for this level yet.')

        # PowerPoint/Office files are already compressed, so the zip just stores them.
        archive = tempfile.SpooledTemporaryFile(max_size=64 * 1024 * 1024)
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_STORED) as bundle:
            for material in materials:
                try:
                    with material.file.open('rb') as f:
                        bundle.writestr(os.path.basename(material.file.name), f.read())
                except (FileNotFoundError, ValueError):
                    continue
        archive.seek(0)
        return FileResponse(archive, as_attachment=True, filename=f'{language}-{level}.zip', content_type='application/zip')
