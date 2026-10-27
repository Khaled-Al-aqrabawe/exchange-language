# Lingua Hub

Peer-to-peer language learning platform: native-speaker exchange, peer practice, and
structured video courses, with built-in real-time messaging and WebRTC video calls.

## Stack

- **Backend**: Django 5 + Django REST Framework + Django Channels (ASGI/WebSockets) + SimpleJWT + SQLite
- **Frontend**: React (Vite) + React Router + Tailwind CSS + Axios

## Running locally

### Backend

```bash
cd backend
./venv/Scripts/activate        # Windows
python manage.py migrate
python manage.py seed_courses  # loads sample Arabic/English courses
python manage.py runserver 8000
```

The Django admin is at `http://127.0.0.1:8000/admin/`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://127.0.0.1:5173` and talks to the backend at `http://127.0.0.1:8000`.

## Architecture notes

- **Auth**: JWT (access + refresh), stored in `localStorage` on the frontend so the same
  API can later serve a React Native mobile app.
- **Real-time messaging**: `chat` app — REST endpoint for history, a Channels
  `AsyncWebsocketConsumer` at `ws://.../ws/chat/<conversation_id>/` for live delivery.
- **Video calls**: `calls` app — a Channels consumer at `ws://.../ws/call/<room_id>/`
  relays WebRTC offer/answer/ICE-candidate signaling only; media is peer-to-peer via
  the browser's `RTCPeerConnection` using a public STUN server. No TURN server is
  configured, so calls may fail across strict corporate/mobile NATs — add a TURN
  provider (e.g. Twilio, Cloudflare) before relying on this in production.
- **WebSocket auth**: Channels has no concept of the SPA's JWT by default, so
  `backend/config/ws_auth.py` adds a small middleware that reads a `?token=` query
  param and authenticates the connection the same way DRF does over HTTP.
- **Matching**: `matching` app ranks partners — exact exchange match (their native
  language is your target language and vice versa) first, then same-language peer
  practice as a fallback.
- **Admin**: moderation and course content management use Django's built-in admin
  site rather than a custom dashboard (see project plan for rationale).

## What's not built yet

- No automated test suite.
- No TURN server (video calls may be unreliable on some networks).
- No email verification / password reset flow.
- No production deployment config (this is a local-dev MVP).
