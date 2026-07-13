from rest_framework import generics, permissions
from rest_framework.exceptions import NotFound

from accounts.models import Profile

from .serializers import PartnerSerializer


class PartnerListView(generics.ListAPIView):
    serializer_class = PartnerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        my_profile = self.request.user.profile
        qs = Profile.objects.exclude(user=self.request.user).select_related('user')

        language = self.request.query_params.get('language') or my_profile.learning_language
        level = self.request.query_params.get('level')
        timezone = self.request.query_params.get('timezone')

        if language:
            qs = qs.filter(learning_language__iexact=language) | qs.filter(native_language__iexact=language)
        if level:
            qs = qs.filter(proficiency_level=level)
        if timezone:
            qs = qs.filter(timezone__iexact=timezone)

        exchange_ids = []
        if my_profile.native_language and my_profile.learning_language:
            exchange_ids = list(
                qs.filter(
                    native_language__iexact=my_profile.learning_language,
                    learning_language__iexact=my_profile.native_language,
                ).values_list('id', flat=True)
            )

        ordering = list(qs)
        ordering.sort(key=lambda p: 0 if p.id in exchange_ids else 1)
        return ordering

    def get_serializer_context(self):
        return {'request': self.request}


class PartnerDetailView(generics.RetrieveAPIView):
    serializer_class = PartnerSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = 'user_id'

    def get_queryset(self):
        return Profile.objects.select_related('user')

    def get_object(self):
        user_id = self.kwargs['user_id']
        try:
            return Profile.objects.select_related('user').get(user_id=user_id)
        except Profile.DoesNotExist:
            raise NotFound('Partner not found')

    def get_serializer_context(self):
        return {'request': self.request}
