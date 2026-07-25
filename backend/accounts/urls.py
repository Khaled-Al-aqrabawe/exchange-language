from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AvailabilityDetailView,
    AvailabilityListCreateView,
    AvatarUploadView,
    ChangePasswordView,
    IntroVideoUploadView,
    LoginResendCodeView,
    LoginVerifyView,
    LoginView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    ResendVerificationView,
    VerifyEmailView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend-verification'),
    path('login/', LoginView.as_view(), name='login'),
    path('login/verify/', LoginVerifyView.as_view(), name='login-verify'),
    path('login/resend-code/', LoginResendCodeView.as_view(), name='login-resend-code'),
    path('login/refresh/', TokenRefreshView.as_view(), name='login-refresh'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('me/', MeView.as_view(), name='me'),
    path('me/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('me/avatar/', AvatarUploadView.as_view(), name='me-avatar'),
    path('me/video/', IntroVideoUploadView.as_view(), name='me-video'),
    path('me/availability/', AvailabilityListCreateView.as_view(), name='me-availability'),
    path('me/availability/<int:pk>/', AvailabilityDetailView.as_view(), name='me-availability-detail'),
]
