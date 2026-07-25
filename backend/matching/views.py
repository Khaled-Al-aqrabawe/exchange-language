from rest_framework import generics, permissions
from rest_framework.exceptions import NotFound

from accounts.models import AvailabilitySlot, Profile

from .serializers import PartnerSerializer


class PartnerListView(generics.ListAPIView):
    serializer_class = PartnerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        my_profile = self.request.user.profile
        qs = Profile.objects.exclude(user=self.request.user).select_related('user')

        explicit_language = self.request.query_params.get('language')
        speaks = self.request.query_params.get('speaks')
        level = self.request.query_params.get('level')
        timezone = self.request.query_params.get('timezone')
        day_of_week = self.request.query_params.get('day')

        if explicit_language:
            # "I'm learning" filter: match partners who natively speak that language -
            # the people who can actually teach it to you.
            qs = qs.filter(native_language__iexact=explicit_language)
        elif my_profile.learning_language:
            # No explicit filter: default browse stays broad (exchange + peer).
            qs = qs.filter(learning_language__iexact=my_profile.learning_language) | qs.filter(
                native_language__iexact=my_profile.learning_language
            )
        if speaks:
            # "I speak" filter: match partners who are learning that language - the
            # people you could teach it to, distinct from the filter above.
            qs = qs.filter(learning_language__iexact=speaks)
        if level:
            qs = qs.filter(proficiency_level=level)
        if timezone:
            qs = qs.filter(timezone__iexact=timezone)
        if my_profile.gender:
            qs = qs.filter(gender=my_profile.gender)
        if day_of_week is not None:
            available_user_ids = AvailabilitySlot.objects.filter(
                day_of_week=day_of_week,
            ).values_list('user_id', flat=True)
            qs = qs.filter(user_id__in=list(available_user_ids))

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
