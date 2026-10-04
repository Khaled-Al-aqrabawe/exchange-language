import logging

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .emails import send_password_reset_email, send_verification_email
from .models import AvailabilitySlot, PasswordResetCode, PendingRegistration, User
from .serializers import (
    AvailabilitySlotSerializer,
    ChangePasswordSerializer,
    LoginPasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)

RESEND_CODE_COOLDOWN_SECONDS = 30


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        email = data.pop('email')
        password = data.pop('password')
        date_of_birth = data.pop('date_of_birth', None)
        if date_of_birth is not None:
            data['date_of_birth'] = date_of_birth.isoformat()

        # No User row is created here - only once the code below is confirmed
        # in VerifyEmailView. An abandoned signup leaves nothing behind, and
        # the same email can just be re-registered (this overwrites any
        # earlier unconfirmed attempt for it).
        pending = PendingRegistration.create_for_email(email, make_password(password), data)
        try:
            send_verification_email(pending, pending.code)
        except Exception:
            # Nothing was created yet; the user can request the code again
            # once email delivery is working via ResendVerificationView.
            logger.exception('Failed to send verification email to %s', email)

        return Response(
            {'detail': 'Check your email for a code to finish creating your account.', 'email': email},
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').lower().strip()
        code = request.data.get('code', '')

        pending = PendingRegistration.objects.filter(email=email).first()
        if not pending:
            raise ValidationError({'detail': 'Invalid email or code.'})

        if not pending.is_valid():
            raise ValidationError({'detail': 'This code has expired. Please register again.'})

        if pending.code != code:
            pending.attempts += 1
            pending.save(update_fields=['attempts'])
            raise ValidationError({'detail': 'Incorrect code.'})

        user = pending.create_user()
        pending.delete()

        # Verifying the code is proof of both email ownership and the
        # password (set at registration), so log the user straight in rather
        # than making them re-enter credentials immediately after.
        refresh = RefreshToken.for_user(user)
        return Response({
            'detail': 'Email verified.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class ResendVerificationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').lower().strip()
        pending = PendingRegistration.objects.filter(email=email).first()
        if pending:
            pending = PendingRegistration.create_for_email(pending.email, pending.password_hash, pending.payload)
            try:
                send_verification_email(pending, pending.code)
            except Exception:
                logger.exception('Failed to send verification email to %s', email)
        return Response({'detail': 'If that registration is still pending, a new code has been sent.'})


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower().strip()
        password = serializer.validated_data['password']

        user = authenticate(request, username=email, password=password)
        if user is None:
            raise ValidationError({'detail': 'Invalid email or password.'})

        if not user.email_verified:
            return Response({'code': 'email_not_verified', 'detail': 'Please verify your email before logging in.'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower().strip()

        user = User.objects.filter(email=email).first()
        if user:
            recent = PasswordResetCode.objects.filter(user=user).order_by('-created_at').first()
            if recent and (timezone.now() - recent.created_at).total_seconds() < RESEND_CODE_COOLDOWN_SECONDS:
                # Silently no-op on rapid repeat requests rather than revealing account
                # existence via a different response than the generic one below.
                return Response({'detail': 'If that account exists, a password reset code has been sent.'})

            reset_code = PasswordResetCode.create_for_user(user)
            try:
                send_password_reset_email(user, reset_code.code)
            except Exception:
                logger.exception('Failed to send password reset email to %s', user.email)

        # Always return the same generic message so this endpoint can't be used to
        # discover whether an email address has an account.
        return Response({'detail': 'If that account exists, a password reset code has been sent.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower().strip()
        code = serializer.validated_data['code']
        new_password = serializer.validated_data['new_password']

        user = User.objects.filter(email=email).first()
        reset_code = (
            PasswordResetCode.objects.filter(user=user, used_at__isnull=True).order_by('-created_at').first()
            if user else None
        )
        if not user or not reset_code or not reset_code.is_valid():
            raise ValidationError({'detail': 'This code has expired. Please request a new one.'})

        if reset_code.code != code:
            reset_code.attempts += 1
            reset_code.save(update_fields=['attempts'])
            raise ValidationError({'detail': 'Incorrect code.'})

        reset_code.used_at = timezone.now()
        reset_code.save(update_fields=['used_at'])

        user.set_password(new_password)
        user.save(update_fields=['password'])

        return Response({'detail': 'Your password has been reset. You can now log in.'})


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data['old_password']):
            raise ValidationError({'old_password': 'Incorrect current password.'})

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password changed.'})


class PresenceView(APIView):
    """Heartbeat + 'Available now' toggle. Body: {"available": bool} (optional)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = request.user.profile
        if 'available' in request.data:
            profile.available_now = bool(request.data['available'])
        profile.last_seen = timezone.now()
        profile.save(update_fields=['available_now', 'last_seen'])
        return Response({'available_now': profile.available_now})


class AvatarUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        avatar = request.FILES.get('avatar')
        if not avatar:
            raise ValidationError({'avatar': 'No file provided.'})

        profile = request.user.profile
        profile.avatar = avatar
        profile.save(update_fields=['avatar'])
        return Response(ProfileSerializer(profile, context={'request': request}).data)


class IntroVideoUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]
    MAX_SIZE_BYTES = 50 * 1024 * 1024

    def post(self, request):
        video = request.FILES.get('intro_video')
        if not video:
            raise ValidationError({'intro_video': 'No file provided.'})
        if video.size > self.MAX_SIZE_BYTES:
            raise ValidationError({'intro_video': 'Video must be under 50MB.'})

        profile = request.user.profile
        profile.intro_video = video
        profile.save(update_fields=['intro_video'])
        return Response(ProfileSerializer(profile, context={'request': request}).data)

    def delete(self, request):
        profile = request.user.profile
        profile.intro_video.delete(save=False)
        profile.intro_video = None
        profile.save(update_fields=['intro_video'])
        return Response(ProfileSerializer(profile, context={'request': request}).data)


class AvailabilityListCreateView(generics.ListCreateAPIView):
    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AvailabilityDetailView(generics.DestroyAPIView):
    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(user=self.request.user)
