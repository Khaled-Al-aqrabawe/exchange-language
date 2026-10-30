import secrets
import uuid
from datetime import date, timedelta

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone as dj_timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip() or self.email


class Profile(models.Model):
    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('elementary', 'Elementary'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('fluent', 'Fluent'),
    ]

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
    ]

    UI_LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ar', 'Arabic'),
        ('de', 'German'),
        ('es', 'Spanish'),
        ('fr', 'French'),
        ('tr', 'Turkish'),
    ]

    user = models.OneToOneField(User, related_name='profile', on_delete=models.CASCADE)
    bio = models.TextField(blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    country = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    # Site/UI language preference (distinct from native_language/learning_language,
    # which are about the languages being practiced). Drives which language emails
    # are sent in.
    ui_language = models.CharField(max_length=5, choices=UI_LANGUAGE_CHOICES, default='en')
    native_language = models.CharField(max_length=50, blank=True)
    learning_language = models.CharField(max_length=50, blank=True)
    # Extra languages the user speaks besides native_language ("I speak" list).
    spoken_languages = models.JSONField(default=list, blank=True)
    # Languages the user wants to learn (learning_language mirrors the first one).
    learning_languages = models.JSONField(default=list, blank=True)
    # CEFR level (A1-C2) per language, e.g. {"French": "B1"}; set by choice or placement exam.
    language_levels = models.JSONField(default=dict, blank=True)
    # Presence: the "Available now" header toggle. The client sends a heartbeat while
    # the site is open, so a stale True (closed tab) expires after PRESENCE_TIMEOUT.
    available_now = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    # Proficiency in learning_language.
    proficiency_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='beginner')
    # Proficiency in native_language - not always a true native speaker (e.g. a
    # fluent second-language speaker offering to help teach it).
    speaking_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='fluent')
    timezone = models.CharField(max_length=50, default='UTC')
    learning_goals = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/%Y/%m/', blank=True, null=True)
    intro_video = models.FileField(upload_to='intro_videos/%Y/%m/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notifications_seen_at = models.DateTimeField(null=True, blank=True)

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = dj_timezone.localdate()
        years = today.year - self.date_of_birth.year
        if (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day):
            years -= 1
        return years

    def __str__(self):
        return f'Profile<{self.user.email}>'


@receiver(post_save, sender=User)
def create_profile_for_new_user(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)


def generate_verification_token():
    # Kept for historical migration 0003, which references this as a field
    # default. No longer used by any current model field.
    return secrets.token_urlsafe(32)


def generate_login_reference():
    # Kept for historical migration 0003, which references this as a field
    # default. No longer used by any current model field.
    return uuid.uuid4().hex


class PendingRegistration(models.Model):
    """A registration that hasn't been email-verified yet.

    No User row exists until the code is confirmed, so an abandoned signup
    (wrong email, never checks inbox, etc.) leaves nothing behind - the email
    address stays free and re-registering just overwrites this record.
    """

    MAX_ATTEMPTS = 5

    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=128)
    payload = models.JSONField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)

    def is_valid(self):
        return self.attempts < self.MAX_ATTEMPTS and self.expires_at > dj_timezone.now()

    @property
    def first_name(self):
        # Lets this stand in for a User when passed to the verification email
        # renderer, which reads `.email`, `.first_name`, `.profile.ui_language`.
        return self.payload.get('first_name', '')

    @property
    def profile(self):
        from types import SimpleNamespace
        return SimpleNamespace(ui_language=self.payload.get('ui_language', 'en'))

    @classmethod
    def create_for_email(cls, email, password_hash, payload, lifetime_hours=24):
        code = f'{secrets.randbelow(1_000_000):06d}'
        obj, _ = cls.objects.update_or_create(
            email=email,
            defaults={
                'password_hash': password_hash,
                'payload': payload,
                'code': code,
                'attempts': 0,
                'expires_at': dj_timezone.now() + timedelta(hours=lifetime_hours),
            },
        )
        return obj

    def create_user(self):
        payload = dict(self.payload)
        date_of_birth = payload.pop('date_of_birth', None)
        first_name = payload.pop('first_name', '')
        last_name = payload.pop('last_name', '')

        user = User(email=self.email, first_name=first_name, last_name=last_name, email_verified=True)
        user.password = self.password_hash
        user.save()

        profile = user.profile
        profile.gender = payload.get('gender', '')
        profile.country = payload.get('country', '')
        if date_of_birth:
            profile.date_of_birth = date.fromisoformat(date_of_birth)
        profile.native_language = payload.get('native_language', '')
        profile.learning_language = payload.get('learning_language', '')
        profile.spoken_languages = payload.get('spoken_languages', [])
        profile.learning_languages = payload.get('learning_languages', [])
        profile.language_levels = payload.get('language_levels', {})
        # The learning language's CEFR level also sets the older five-step level.
        cefr_to_level = {'A1': 'beginner', 'A2': 'elementary', 'B1': 'intermediate', 'B2': 'intermediate', 'C1': 'advanced', 'C2': 'fluent'}
        learning_cefr = profile.language_levels.get(profile.learning_language)
        profile.proficiency_level = cefr_to_level.get(learning_cefr) or payload.get('proficiency_level', 'beginner')
        profile.speaking_level = payload.get('speaking_level', 'fluent')
        profile.timezone = payload.get('timezone') or 'UTC'
        profile.ui_language = payload.get('ui_language', 'en')
        profile.save()
        return user

    def __str__(self):
        return f'PendingRegistration<{self.email}>'


class PasswordResetCode(models.Model):
    MAX_ATTEMPTS = 5

    user = models.ForeignKey(User, related_name='password_reset_codes', on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)

    def is_valid(self):
        return (
            self.used_at is None
            and self.attempts < self.MAX_ATTEMPTS
            and self.expires_at > dj_timezone.now()
        )

    @classmethod
    def create_for_user(cls, user, lifetime_minutes=15):
        code = f'{secrets.randbelow(1_000_000):06d}'
        return cls.objects.create(user=user, code=code, expires_at=dj_timezone.now() + timedelta(minutes=lifetime_minutes))

    def __str__(self):
        return f'PasswordResetCode<{self.user_id}>'


class AvailabilitySlot(models.Model):
    DAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]

    user = models.ForeignKey(User, related_name='availability_slots', on_delete=models.CASCADE)
    day_of_week = models.PositiveSmallIntegerField(choices=DAY_CHOICES)
    # Wall-clock times in the user's own Profile.timezone.
    start_time = models.TimeField()
    end_time = models.TimeField()
    # When True (default), this slot recurs every week on `day_of_week` indefinitely.
    # When False, it's only available once, on `specific_date`.
    is_recurring = models.BooleanField(default=True)
    specific_date = models.DateField(null=True, blank=True)
    # What the time is for: a lesson from the course, or an ordinary free conversation.
    SESSION_TYPES = [('lesson', 'Lesson'), ('conversation', 'Free conversation')]
    session_type = models.CharField(max_length=20, choices=SESSION_TYPES, default='lesson')
    # Optional: the lesson number the two want to work through (only for a lesson).
    lesson = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        return f'AvailabilitySlot<{self.user_id}: {self.day_of_week} {self.start_time}-{self.end_time}>'
