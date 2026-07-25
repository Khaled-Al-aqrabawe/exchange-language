"""
Django settings for config project.
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')


def env_list(name, default=''):
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(',') if item.strip()]


def env_bool(name, default=False):
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ('1', 'true', 'yes', 'on')


SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-5_$9kw7)e)d5ye2eq)9gc)1z)syd@s^-7w&3h#bum+ym7#g(8-',
)

DEBUG = env_bool('DJANGO_DEBUG', default=True)

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', default='localhost,127.0.0.1')


# Application definition

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',
    'channels',

    'accounts',
    'matching',
    'chat',
    'calls',
    'sessions_app',
    'courses',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

REDIS_URL = os.environ.get('REDIS_URL')

# Celery - reuses the same Redis instance as the channel layer. Falls back to
# eager (synchronous, in-process) execution when Redis isn't configured, so
# local dev without Redis still runs the reminder task, just not async.
CELERY_BROKER_URL = REDIS_URL or 'memory://'
CELERY_RESULT_BACKEND = REDIS_URL or 'cache+memory://'
CELERY_TASK_ALWAYS_EAGER = env_bool('CELERY_TASK_ALWAYS_EAGER', default=not bool(REDIS_URL))
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_BEAT_SCHEDULE = {
    'send-session-reminders': {
        'task': 'sessions_app.tasks.send_session_reminders',
        'schedule': 60.0,
    },
    'complete-past-sessions': {
        'task': 'sessions_app.tasks.complete_past_sessions',
        'schedule': 60.0,
    },
}

CHANNEL_LAYERS = {
    'default': (
        {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {'hosts': [REDIS_URL]},
        }
        if REDIS_URL
        else {'BACKEND': 'channels.layers.InMemoryChannelLayer'}
    ),
}


# Database
# DATABASE_URL (e.g. postgres://user:pass@host:5432/dbname) takes over when set;
# otherwise falls back to local SQLite so `manage.py runserver` works with zero setup.

DATABASE_URL = os.environ.get('DATABASE_URL')

DATABASES = {
    'default': (
        dj_database_url.parse(DATABASE_URL, conn_max_age=600)
        if DATABASE_URL
        else {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}
    )
}

AUTH_USER_MODEL = 'accounts.User'

# Password validation

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# Internationalization

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static & media files

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# REST Framework / JWT

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=12),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'ROTATE_REFRESH_TOKENS': True,
}

# CORS - the Vite dev server bumps to the next free port (5174, 5175, ...) if
# 5173 is taken, so match any localhost port in dev rather than hardcoding one.
# In production, set CORS_ALLOWED_ORIGINS to the deployed frontend URL(s).

CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^http://localhost:\d+$',
    r'^http://127\.0\.0\.1:\d+$',
]
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS')
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS')

# Email - SMTP when host/user are configured (e.g. Gmail SMTP), otherwise
# falls back to the console backend so local dev without credentials just
# prints emails instead of failing.
EMAIL_HOST = os.environ.get('EMAIL_HOST')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
EMAIL_USE_SSL = env_bool('EMAIL_USE_SSL', default=False)
# TLS and SSL are mutually exclusive - only default TLS on when SSL isn't in use.
EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', default=not EMAIL_USE_SSL)
# Bounds how long a request can block on a slow/unreachable SMTP server before
# giving up, so a flaky mail provider can't stall unrelated API requests.
EMAIL_TIMEOUT = int(os.environ.get('EMAIL_TIMEOUT', '5'))
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER or 'noreply@localhost')
EMAIL_BACKEND = (
    'django.core.mail.backends.smtp.EmailBackend'
    if EMAIL_HOST and EMAIL_HOST_USER
    else 'django.core.mail.backends.console.EmailBackend'
)

# Used to build links (e.g. email verification) that point back at the SPA.
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Coolify (via Traefik) terminates TLS and proxies plain HTTP to the container,
# so Django needs to trust the forwarded proto/host to know a request was HTTPS.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    USE_X_FORWARDED_HOST = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
