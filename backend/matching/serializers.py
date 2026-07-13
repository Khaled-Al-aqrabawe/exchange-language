from rest_framework import serializers

from accounts.models import Profile


class PartnerSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id')
    email = serializers.EmailField(source='user.email')
    full_name = serializers.CharField(source='user.full_name')
    match_type = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'user_id', 'email', 'full_name', 'bio', 'native_language', 'learning_language',
            'proficiency_level', 'timezone', 'learning_goals', 'avatar_url', 'match_type',
        ]

    def get_match_type(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile'):
            return None
        my_profile = request.user.profile
        if (obj.native_language.lower() == my_profile.learning_language.lower()
                and obj.learning_language.lower() == my_profile.native_language.lower()):
            return 'exchange'
        return 'peer'
