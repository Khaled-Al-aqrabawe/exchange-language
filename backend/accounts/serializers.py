from rest_framework import serializers

from .models import AvailabilitySlot, Profile, User


CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
# Languages a person says they speak (other than their native one) must be at least B1.
SPOKEN_MIN_LEVELS = CEFR_LEVELS[CEFR_LEVELS.index('B1'):]
MIN_SPEAKING_LEVEL = 'B1'


class ProfileSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()

    class Meta:
        model = Profile
        fields = [
            'bio', 'gender', 'country', 'date_of_birth', 'age', 'ui_language', 'native_language',
            'learning_language', 'learning_languages', 'spoken_languages', 'language_levels', 'proficiency_level', 'timezone', 'learning_goals', 'avatar',
            'intro_video', 'available_now', 'updated_at',
        ]
        read_only_fields = ['avatar', 'intro_video', 'age', 'updated_at', 'available_now']

    def validate(self, attrs):
        langs = attrs.get('learning_languages')
        if langs:
            attrs['learning_language'] = langs[0]

        if not any(k in attrs for k in ('spoken_languages', 'learning_languages', 'language_levels')):
            return attrs

        instance = self.instance
        spoken = attrs.get('spoken_languages', getattr(instance, 'spoken_languages', None) or [])
        learning = attrs.get('learning_languages', getattr(instance, 'learning_languages', None) or [])
        levels = attrs.get('language_levels', getattr(instance, 'language_levels', None) or {})
        native = attrs.get('native_language', getattr(instance, 'native_language', ''))

        errors = {}
        for lang, level in levels.items():
            if level not in CEFR_LEVELS:
                errors['language_levels'] = f'Invalid level for {lang}.'
        for lang in learning:
            if levels.get(lang) not in CEFR_LEVELS:
                errors['language_levels'] = f'Choose your level in {lang} (or take the exam).'
        for lang in spoken:
            if lang == native:
                continue
            level = levels.get(lang)
            if level not in CEFR_LEVELS:
                errors['language_levels'] = f'Choose your level in {lang} (or take the exam).'
            elif level not in SPOKEN_MIN_LEVELS:
                errors['language_levels'] = f'Languages you speak need at least level B1 ({lang}).'
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

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
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'date_joined', 'email_verified', 'is_superuser', 'profile']
        read_only_fields = ['id', 'email', 'date_joined', 'full_name', 'email_verified', 'is_superuser']

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
    spoken_languages = serializers.ListField(child=serializers.CharField(), write_only=True, required=False, max_length=5)
    learning_languages = serializers.ListField(child=serializers.CharField(), write_only=True, required=False, max_length=5)
    language_levels = serializers.DictField(child=serializers.CharField(), write_only=True, required=False)
    timezone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    ui_language = serializers.ChoiceField(
        choices=Profile.UI_LANGUAGE_CHOICES, write_only=True, required=False, default='en',
    )

    class Meta:
        model = User
        fields = [
            'email', 'password', 'first_name', 'last_name', 'gender', 'country', 'date_of_birth',
            'native_language', 'learning_language', 'spoken_languages', 'learning_languages', 'language_levels',
            'proficiency_level', 'speaking_level', 'timezone', 'ui_language',
        ]

    def validate(self, attrs):
        levels = attrs.get('language_levels', {})
        native = attrs.get('native_language', '')
        errors = {}
        for lang in attrs.get('learning_languages', []):
            if levels.get(lang) not in CEFR_LEVELS:
                errors['language_levels'] = f'Choose your level in {lang}.'
        for lang in attrs.get('spoken_languages', []):
            if lang != native and levels.get(lang) not in SPOKEN_MIN_LEVELS:
                errors['language_levels'] = f'Languages you can teach need at least level B1 ({lang}).'
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

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
