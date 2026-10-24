from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/call/(?P<room_id>[\w-]+)/$', consumers.CallConsumer.as_asgi()),
    re_path(r'ws/notify/$', consumers.UserNotifyConsumer.as_asgi()),
]
