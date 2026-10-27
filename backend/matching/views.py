from django.db.models.functions import Lower
from rest_framework import generics, permissions
from rest_framework.exceptions import NotFound

from accounts.models import AvailabilitySlot, Profile

from courses.models import Material
from courses.views import next_lesson_for

from .serializers import PartnerSerializer


LEGACY_LEVELS = {'beginner': 'A1', 'elementary': 'A2', 'intermediate': 'B1', 'advanced': 'B2', 'fluent': 'C1'}


def learning_levels(profile):
    """{language (lower-case): CEFR level} for every language the profile is learning."""
    languages = profile.learning_languages or ([profile.learning_language] if profile.learning_language else [])
    chosen = {k.lower(): v for k, v in (profile.language_levels or {}).items()}
    levels = {}
    for lang in languages:
        key = lang.lower()
        # profiles from before per-language levels only have the single legacy level
        fallback = LEGACY_LEVELS.get(profile.proficiency_level, 'A1') if key == (profile.learning_language or '').lower() else None
        levels[key] = chosen.get(key) or fallback
    return levels


def levels_compatible(me, other):
    """Two people learning the same language must be at the same level of it.

    With no learning language in common (e.g. a language exchange) there is nothing to
    compare, so they stay visible to each other."""
    mine, theirs = learning_levels(me), learning_levels(other)
    shared = mine.keys() & theirs.keys()
    return not shared or any(mine[lang] == theirs[lang] for lang in shared)


class PartnerListView(generics.ListAPIView):
    serializer_class = PartnerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        my_profile = self.request.user.profile
        qs = Profile.objects.exclude(user=self.request.user).select_related('user')

        explicit_language = self.request.query_params.get('language')
        lesson = self.request.query_params.get('lesson')
        timezone = self.request.query_params.get('timezone')
        day_of_week = self.request.query_params.get('day')

        if explicit_language:
            # "I'm learning" filter: everyone who speaks that language (native or any extra
            # spoken language) or is learning it (primary or any of their learning languages).
            wanted = explicit_language.lower()
            ids = [
                p.id for p in qs
                if wanted in {
                    l.lower() for l in [
                        p.native_language, p.learning_language,
                        *(p.spoken_languages or []), *(p.learning_languages or []),
                    ] if l
                }
            ]
            qs = qs.filter(id__in=ids)
        elif my_profile.learning_language:
            # No explicit filter: default browse stays broad (exchange + peer).
            qs = qs.filter(learning_language__iexact=my_profile.learning_language) | qs.filter(
                native_language__iexact=my_profile.learning_language
            )
        # Without an explicit language, only show partners who are learning a language
        # the user speaks. With one, show everyone who speaks or learns it.
        my_spoken = {l.lower() for l in [my_profile.native_language, *(my_profile.spoken_languages or [])] if l}
        if my_spoken and not explicit_language:
            qs = qs.annotate(_learning_lower=Lower('learning_language')).filter(_learning_lower__in=my_spoken)
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

        ordering = [p for p in qs if levels_compatible(my_profile, p)]
        if lesson and lesson.isdigit():
            # optional: only people whose current lesson (the next one they have not completed) is this number
            wanted = int(lesson)
            ordering = [p for p in ordering if (next_lesson_for(p.user)[0] or Material(order=-1)).order == wanted]
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
