from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView, DestroyAPIView
from rest_framework.response import Response

from .models import MATERIAL_LANGUAGES, MATERIAL_LEVELS, Material
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
        return {'request': self.request}

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
