from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.decorators.cache import never_cache
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/matching/', include('matching.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/calls/', include('calls.urls')),
    path('api/sessions/', include('sessions_app.urls')),
    path('api/courses/', include('courses.urls')),
]

# Uploaded media (course materials, avatars, videos) is served by Django itself.
# Plain static() applies the default XFrameOptionsMiddleware (X-Frame-Options:
# DENY), which silently blocks course materials from rendering in the <iframe>
# preview used when sharing a material in a call - exempt just this route
# rather than weakening clickjacking protection site-wide. never_cache avoids
# the browser reusing an old (pre-fix, blocked) cached response across reloads.
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', never_cache(xframe_options_exempt(serve)), {'document_root': settings.MEDIA_ROOT}),
]
