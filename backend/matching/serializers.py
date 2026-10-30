from datetime import datetime, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

from django.db.models import Avg, Q
from django.utils import timezone as dj_timezone
from rest_framework import serializers

from accounts.models import Profile
from accounts.serializers import AvailabilitySlotSerializer
from sessions_app.models import ScheduledSession, SessionRating


def _next_occurrence_utc(day_of_week, time_obj, tz_name):
    tz = ZoneInfo(tz_name or 'UTC')
    now_local = dj_timezone.now().astimezone(tz)
    days_ahead = (day_of_week - now_local.weekday()) % 7
    target_date = now_local.date() + timedelta(days=days_ahead)
    return datetime.combine(target_date, time_obj, tzinfo=tz).astimezone(dt_timezone.utc)


def _slot_occurrence_utc(slot, tz_name):
    """Next occurrence for a recurring slot, or the fixed one-time instant for a
    non-recurring slot."""
    if not slot.is_recurring and slot.specific_date:
        tz = ZoneInfo(tz_name or 'UTC')
        return datetime.combine(slot.specific_date, slot.start_time, tzinfo=tz).astimezone(dt_timezone.utc)
    return _next_occurrence_utc(slot.day_of_week, slot.start_time, tz_name)


class PartnerSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id')
    email = serializers.EmailField(source='user.email')
    full_name = serializers.CharField(source='user.full_name')
    match_type = serializers.SerializerMethodField()
    sessions_completed = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    ratings_count = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    is_available_now = serializers.SerializerMethodField()
    age = serializers.ReadOnlyField()
    learning_level = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'user_id', 'email', 'full_name', 'bio', 'gender', 'country', 'age', 'native_language',
            'learning_language', 'learning_level', 'proficiency_level', 'timezone', 'learning_goals', 'avatar', 'intro_video',
            'match_type', 'is_available_now', 'sessions_completed', 'average_rating', 'ratings_count', 'availability',
        ]

    def get_learning_level(self, obj):
        """CEFR level in the language they are learning (older profiles only have a broad level)."""
        legacy = {'beginner': 'A1', 'elementary': 'A2', 'intermediate': 'B1', 'advanced': 'B2', 'fluent': 'C1'}
        chosen = {k.lower(): v for k, v in (obj.language_levels or {}).items()}
        return chosen.get((obj.learning_language or '').lower()) or legacy.get(obj.proficiency_level, '')

    def get_is_available_now(self, obj):
        if not obj.available_now or not obj.last_seen:
            return False
        return dj_timezone.now() - obj.last_seen < timedelta(minutes=3)

    def get_match_type(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile'):
            return None
        my_profile = request.user.profile
        if (obj.native_language.lower() == my_profile.learning_language.lower()
                and obj.learning_language.lower() == my_profile.native_language.lower()):
            return 'exchange'
        return 'peer'

    def get_sessions_completed(self, obj):
        return ScheduledSession.objects.filter(Q(host=obj.user) | Q(partner=obj.user), status='completed').count()

    def get_average_rating(self, obj):
        result = SessionRating.objects.filter(ratee=obj.user).aggregate(avg=Avg('score'))['avg']
        return round(result, 1) if result is not None else None

    def get_ratings_count(self, obj):
        return SessionRating.objects.filter(ratee=obj.user).count()

    def get_availability(self, obj):
        slots = list(obj.user.availability_slots.all())
        if not slots:
            return []

        booked_times = list(
            ScheduledSession.objects.filter(
                Q(host=obj.user) | Q(partner=obj.user), status__in=['pending', 'confirmed'],
            ).values_list('scheduled_time', flat=True)
        )

        visible = []
        for slot in slots:
            occ_start = _slot_occurrence_utc(slot, obj.timezone)
            occ_end = occ_start + (
                datetime.combine(datetime.min, slot.end_time) - datetime.combine(datetime.min, slot.start_time)
            )
            if not slot.is_recurring and occ_end < dj_timezone.now():
                continue
            if not any(occ_start <= booked < occ_end for booked in booked_times):
                visible.append(slot)

        return AvailabilitySlotSerializer(visible, many=True).data
