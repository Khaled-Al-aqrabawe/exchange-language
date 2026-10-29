from django.urls import path

from .views import CancelCallView, IncomingCallView, NotifyCallView, RingPartnerView

urlpatterns = [
    path('ring/', RingPartnerView.as_view(), name='call-ring'),
    path('notify/', NotifyCallView.as_view(), name='call-notify'),
    path('cancel/', CancelCallView.as_view(), name='call-cancel'),
    path('incoming/', IncomingCallView.as_view(), name='call-incoming'),
]
