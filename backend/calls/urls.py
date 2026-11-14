from django.urls import path

from .views import CancelCallView, DeclineCallView, IncomingCallView, NotifyCallView, RingPartnerView

urlpatterns = [
    path('ring/', RingPartnerView.as_view(), name='call-ring'),
    path('notify/', NotifyCallView.as_view(), name='call-notify'),
    path('cancel/', CancelCallView.as_view(), name='call-cancel'),
    path('decline/', DeclineCallView.as_view(), name='call-decline'),
    path('incoming/', IncomingCallView.as_view(), name='call-incoming'),
]
