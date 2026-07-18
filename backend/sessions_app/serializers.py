from rest_framework import serializers

from accounts.models import User

from .models import ScheduledSession


class SessionParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name']


class ScheduledSessionSerializer(serializers.ModelSerializer):
    host = SessionParticipantSerializer(read_only=True)
    partner = SessionParticipantSerializer(read_only=True)
    partner_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ScheduledSession
        fields = [
            'id', 'host', 'partner', 'partner_id', 'scheduled_time',
            'duration_minutes', 'status', 'notes', 'cancellation_reason', 'room_id', 'created_at',
        ]
        read_only_fields = ['id', 'host', 'partner', 'status', 'cancellation_reason', 'room_id', 'created_at']

    def validate_partner_id(self, value):
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError('No such user.')
        return value

    def create(self, validated_data):
        partner_id = validated_data.pop('partner_id')
        request = self.context['request']
        return ScheduledSession.objects.create(
            host=request.user, partner_id=partner_id, **validated_data
        )
