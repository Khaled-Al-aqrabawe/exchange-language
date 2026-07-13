"""
ASGI config for config project.
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

from calls.routing import websocket_urlpatterns as calls_ws_urlpatterns  # noqa: E402
from chat.routing import websocket_urlpatterns as chat_ws_urlpatterns  # noqa: E402
from config.ws_auth import JWTAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JWTAuthMiddleware(
        URLRouter(chat_ws_urlpatterns + calls_ws_urlpatterns)
    ),
})
