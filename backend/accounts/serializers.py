from rest_framework import serializers

from .models import AvailabilitySlot, Profile, User


class ProfileSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()

    class Meta:
        model = Profile
        fields = [
            'bio', 'gender', 'country', 'date_of_birth', 'age', 'ui_language', 'native_language',
            'learning_language', 'spoken_languages', 'proficiency_level', 'timezone', 'learning_goals', 'avatar',
            'intro_video', 'updated_at',
        ]
        read_only_fields = ['avatar', 'intro_video', 'age', 'updated_at']

    def validate_date_of_birth(self, value):
        if value is None:
            return value
        from django.utils import timezone as dj_timezone

        today = dj_timezone.localdate()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 16:
            raise serializers.ValidationError('You must be at least 16 years old.')
        if age > 120:
            raise serializers.ValidationError('Enter a valid date of birth.')
        return value


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'date_joined', 'email_verified', 'profile']
        read_only_fields = ['id', 'email', 'date_joined', 'full_name', 'email_verified']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if profile_data is not None:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    gender = serializers.ChoiceField(
        choices=Profile.GENDER_CHOICES, write_only=True, required=False, allow_blank=True, default='',
    )
    country = serializers.CharField(write_only=True, max_length=100)
    date_of_birth = serializers.DateField(write_only=True)
    native_language = serializers.CharField(write_only=True, required=False, allow_blank=True)
    learning_language = serializers.CharField(write_only=True, required=False, allow_blank=True)
    proficiency_level = serializers.ChoiceField(
        choices=Profile.LEVEL_CHOICES, write_only=True, required=False, default='beginner',
    )
    speaking_level = serializers.ChoiceField(
        choices=Profile.LEVEL_CHOICES, write_only=True, required=False, default='fluent',
    )
    timezone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    ui_language = serializers.ChoiceField(
        choices=Profile.UI_LANGUAGE_CHOICES, write_only=True, required=False, default='en',
    )

    class Meta:
        model = User
        fields = [
            'email', 'password', 'first_name', 'last_name', 'gender', 'country', 'date_of_birth',
            'native_language', 'learning_language', 'proficiency_level', 'speaking_level', 'timezone', 'ui_language',
        ]

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate_date_of_birth(self, value):
        from django.utils import timezone as dj_timezone

        today = dj_timezone.localdate()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 16:
            raise serializers.ValidationError('You must be at least 16 years old to register.')
        if age > 120:
            raise serializers.ValidationError('Enter a valid date of birth.')
        return value

    # No create(): registration only stages a PendingRegistration until the
    # email code is confirmed (see RegisterView / PendingRegistration.create_user) -
    # nothing is written to the User table at this point.


class LoginPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    is_recurring = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = AvailabilitySlot
        fields = ['id', 'day_of_week', 'start_time', 'end_time', 'is_recurring', 'specific_date']
        read_only_fields = ['id']

    def validate(self, attrs):
        start_time = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = attrs.get('end_time', getattr(self.instance, 'end_time', None))
        day_of_week = attrs.get('day_of_week', getattr(self.instance, 'day_of_week', None))
        is_recurring = attrs.get('is_recurring', getattr(self.instance, 'is_recurring', True))
        specific_date = attrs.get('specific_date', getattr(self.instance, 'specific_date', None))

        if start_time is not None and end_time is not None and end_time <= start_time:
            raise serializers.ValidationError({'end_time': 'End time must be after start time.'})

        if not is_recurring and not specific_date:
            raise serializers.ValidationError({'specific_date': 'A specific date is required for a one-time slot.'})
        if is_recurring:
            attrs['specific_date'] = None

        request = self.context.get('request')
        if request and day_of_week is not None and start_time is not None and end_time is not None:
            overlapping = AvailabilitySlot.objects.filter(
                user=request.user, day_of_week=day_of_week, start_time__lt=end_time, end_time__gt=start_time,
            )
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)
            if overlapping.exists():
                raise serializers.ValidationError({'start_time': 'You already have an overlapping time slot on this day.'})
        return attrs
