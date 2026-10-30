from zoneinfo import ZoneInfo

from django.db.models import Q
from rest_framework import serializers

from accounts.models import AvailabilitySlot, User

from .models import ScheduledSession, SessionRating


class SessionParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name']


class ScheduledSessionSerializer(serializers.ModelSerializer):
    host = SessionParticipantSerializer(read_only=True)
    partner = SessionParticipantSerializer(read_only=True)
    partner_id = serializers.IntegerField(write_only=True)
    # Set when booking a partner's already-published availability slot: since the
    # partner explicitly offered that time, the session skips the pending/approve
    # step and is created already confirmed.
    auto_confirm = serializers.BooleanField(write_only=True, required=False, default=False)
    my_rating = serializers.SerializerMethodField()
    my_joined = serializers.SerializerMethodField()

    class Meta:
        model = ScheduledSession
        fields = [
            'id', 'host', 'partner', 'partner_id', 'auto_confirm', 'scheduled_time', 'window_end_time',
            'duration_minutes', 'status', 'notes', 'cancellation_reason', 'room_id', 'created_at', 'my_rating', 'my_joined',
        ]
        read_only_fields = ['id', 'host', 'partner', 'status', 'cancellation_reason', 'room_id', 'created_at']

    def get_my_rating(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        rating = obj.ratings.filter(rater=request.user).first()
        return {'score': rating.score, 'comment': rating.comment} if rating else None

    def get_my_joined(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return bool(obj.host_joined_at if obj.host_id == request.user.id else obj.partner_joined_at)

    def validate_partner_id(self, value):
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError('No such user.')
        return value

    def validate(self, attrs):
        partner_id = attrs.get('partner_id')
        scheduled_time = attrs.get('scheduled_time')
        window_end_time = attrs.get('window_end_time')

        if window_end_time and scheduled_time and window_end_time <= scheduled_time:
            raise serializers.ValidationError(
                {'window_end_time': 'The end of the time window must be after the start.'}
            )

        # A flexible window is a proposal, not a fixed booking - the invited partner
        # picks the exact time when they confirm, so it isn't checked against
        # published availability or existing bookings here.
        if partner_id and scheduled_time and not window_end_time:
            slots = AvailabilitySlot.objects.filter(user_id=partner_id)
            if slots.exists():
                partner = User.objects.select_related('profile').get(id=partner_id)
                try:
                    local_dt = scheduled_time.astimezone(ZoneInfo(partner.profile.timezone or 'UTC'))
                except Exception:
                    local_dt = scheduled_time
                in_window = slots.filter(
                    day_of_week=local_dt.weekday(),
                    start_time__lte=local_dt.time(),
                    end_time__gte=local_dt.time(),
                ).exists()
                if not in_window:
                    raise serializers.ValidationError(
                        {'scheduled_time': "This time is outside the partner's available hours."}
                    )

            already_booked = ScheduledSession.objects.filter(
                Q(host_id=partner_id) | Q(partner_id=partner_id),
                status__in=['pending', 'confirmed'],
                scheduled_time=scheduled_time,
            ).exists()
            if already_booked:
                raise serializers.ValidationError(
                    {'scheduled_time': 'This time was just booked by someone else. Please pick another time.'}
                )
        return attrs

    def create(self, validated_data):
        partner_id = validated_data.pop('partner_id')
        auto_confirm = validated_data.pop('auto_confirm', False)
        request = self.context['request']
        return ScheduledSession.objects.create(
            host=request.user, partner_id=partner_id,
            status='confirmed' if auto_confirm else 'pending',
            **validated_data,
        )


# Ratings up to this many stars must come with a written reason.
LOW_RATING_MAX = 2


class SessionRatingSerializer(serializers.ModelSerializer):
    rater = SessionParticipantSerializer(read_only=True)
    ratee = SessionParticipantSerializer(read_only=True)

    class Meta:
        model = SessionRating
        fields = ['id', 'session', 'rater', 'ratee', 'score', 'comment', 'created_at']
        read_only_fields = ['id', 'session', 'rater', 'ratee', 'created_at']

    def validate(self, attrs):
        if attrs.get('score', 5) <= LOW_RATING_MAX and not (attrs.get('comment') or '').strip():
            raise serializers.ValidationError({'comment': 'Please write why you gave a low rating.'})
        return attrs

    def validate_score(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('Score must be between 1 and 5.')
        return value
