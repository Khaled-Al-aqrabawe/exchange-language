import logging

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .emails import send_login_code_email, send_password_reset_email, send_verification_email
from .models import AvailabilitySlot, EmailVerificationToken, LoginCode, PasswordResetCode, User
from .serializers import (
    AvailabilitySlotSerializer,
    ChangePasswordSerializer,
    LoginCodeVerifySerializer,
    LoginPasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)

RESEND_CODE_COOLDOWN_SECONDS = 30


class EmailDeliveryError(APIException):
    status_code = 503
    default_detail = 'Could not send the email right now. Please try again shortly.'
    default_code = 'email_delivery_failed'


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token = EmailVerificationToken.create_for_user(user)
        try:
            send_verification_email(user, token.code)
        except Exception:
            # The account still exists; the user can request the code again once
            # email delivery is working via ResendVerificationView.
            logger.exception('Failed to send verification email to %s', user.email)

        return Response({'detail': 'Account created. Check your email to verify your address.', 'email': user.email}, status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').lower().strip()
        code = request.data.get('code', '')

        user = User.objects.filter(email=email).first()
        if not user:
            raise ValidationError({'detail': 'Invalid email or code.'})

        token = EmailVerificationToken.objects.filter(user=user, used_at__isnull=True).order_by('-created_at').first()
        if not token or not token.is_valid():
            raise ValidationError({'detail': 'This code has expired. Please request a new one.'})

        if token.code != code:
            token.attempts += 1
            token.save(update_fields=['attempts'])
            raise ValidationError({'detail': 'Incorrect code.'})

        token.used_at = timezone.now()
        token.save(update_fields=['used_at'])

        user.email_verified = True
        user.save(update_fields=['email_verified'])

        return Response({'detail': 'Email verified. You can now log in.'})


class ResendVerificationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').lower().strip()
        user = User.objects.filter(email=email).first()
        if user and not user.email_verified:
            token = EmailVerificationToken.create_for_user(user)
            try:
                send_verification_email(user, token.code)
            except Exception:
                logger.exception('Failed to send verification email to %s', user.email)
        return Response({'detail': 'If that account exists and is unverified, a new email has been sent.'})


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

        login_code = LoginCode.create_for_user(user)
        try:
            send_login_code_email(user, login_code.code)
        except Exception:
            logger.exception('Failed to send login code email to %s', user.email)
            raise EmailDeliveryError()

        return Response({'login_ref': login_code.reference, 'expires_in': 600})


class LoginVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginCodeVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        login_ref = serializer.validated_data['login_ref']
        code = serializer.validated_data['code']

        try:
            login_code = LoginCode.objects.select_related('user').get(reference=login_ref)
        except LoginCode.DoesNotExist:
            raise ValidationError({'detail': 'Invalid or expired login attempt.'})

        if not login_code.is_valid():
            raise ValidationError({'detail': 'This code has expired. Please log in again.'})

        if login_code.code != code:
            login_code.attempts += 1
            login_code.save(update_fields=['attempts'])
            raise ValidationError({'detail': 'Incorrect code.'})

        login_code.consumed_at = timezone.now()
        login_code.save(update_fields=['consumed_at'])

        user = login_code.user
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })


class LoginResendCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        login_ref = request.data.get('login_ref', '')
        try:
            login_code = LoginCode.objects.select_related('user').get(reference=login_ref)
        except LoginCode.DoesNotExist:
            raise ValidationError({'detail': 'Invalid or expired login attempt.'})

        seconds_since_created = (timezone.now() - login_code.created_at).total_seconds()
        if login_code.consumed_at is None and seconds_since_created < RESEND_CODE_COOLDOWN_SECONDS:
            raise ValidationError({'detail': 'Please wait before requesting another code.'})

        new_code = LoginCode.create_for_user(login_code.user)
        try:
            send_login_code_email(login_code.user, new_code.code)
        except Exception:
            logger.exception('Failed to send login code email to %s', login_code.user.email)
            raise EmailDeliveryError()
        return Response({'login_ref': new_code.reference, 'expires_in': 600})


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
