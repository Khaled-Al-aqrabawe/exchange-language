import random
from datetime import date, time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import AvailabilitySlot, User
from chat.models import Conversation, Message
from sessions_app.models import ScheduledSession, SessionRating

LANGUAGES = [
    'Arabic', 'English', 'Spanish', 'French', 'German', 'Mandarin Chinese',
    'Japanese', 'Korean', 'Portuguese', 'Italian', 'Russian', 'Turkish', 'Hindi',
]
COUNTRIES = {
    'Arabic': ['Egypt', 'Jordan', 'Morocco', 'Saudi Arabia', 'Lebanon'],
    'English': ['United States', 'United Kingdom', 'Canada', 'Australia'],
    'Spanish': ['Spain', 'Mexico', 'Argentina', 'Colombia'],
    'French': ['France', 'Belgium', 'Canada'],
    'German': ['Germany', 'Austria'],
    'Mandarin Chinese': ['China'],
    'Japanese': ['Japan'],
    'Korean': ['South Korea'],
    'Portuguese': ['Brazil', 'Portugal'],
    'Italian': ['Italy'],
    'Russian': ['Russia'],
    'Turkish': ['Turkey'],
    'Hindi': ['India'],
}
TIMEZONES = [
    'UTC', 'Europe/London', 'Europe/Paris', 'Africa/Cairo', 'Asia/Riyadh', 'Asia/Istanbul',
    'America/New_York', 'Asia/Tokyo', 'Asia/Kolkata', 'America/Sao_Paulo',
]
MALE = ['Omar', 'Ahmed', 'Youssef', 'Karim', 'Liam', 'Noah', 'Lucas', 'Mateo', 'Hiroshi', 'Min-jun',
        'Ivan', 'Marco', 'Hans', 'Mehmet', 'Arjun', 'Pedro', 'Ali', 'Khaled', 'Tariq', 'Daniel']
FEMALE = ['Layla', 'Fatima', 'Sara', 'Nour', 'Emma', 'Olivia', 'Sofia', 'Camille', 'Yuki', 'Ji-woo',
          'Anna', 'Giulia', 'Greta', 'Elif', 'Priya', 'Ana', 'Mariam', 'Hana', 'Aisha', 'Mei']
LAST = ['Hassan', 'Smith', 'Garcia', 'Martin', 'Muller', 'Wang', 'Tanaka', 'Kim', 'Silva', 'Rossi',
        'Ivanov', 'Yilmaz', 'Sharma', 'Haddad', 'Khalil', 'Brown', 'Lopez', 'Dubois', 'Schmidt', 'Nasser']
BIOS = [
    'Love meeting new people and sharing cultures.',
    'Here to practice speaking and have fun.',
    'Language exchange fan, coffee lover.',
    'Preparing for a trip and want real conversation practice.',
    'Happy to help and be corrected - patience is my superpower.',
    'Student who loves music and movies.',
]
MESSAGES = [
    'Hi! Want to practice together?', 'Sure, when are you free?', 'How about tomorrow evening?',
    'Perfect, see you then!', 'Thanks for the great session!',
]
LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
LEGACY = {'A1': 'beginner', 'A2': 'elementary', 'B1': 'intermediate', 'B2': 'advanced', 'C1': 'fluent', 'C2': 'fluent'}


class Command(BaseCommand):
    help = 'Fill the local database with demo users, availability, chats and sessions.'

    def add_arguments(self, parser):
        parser.add_argument('--users', type=int, default=150)
        parser.add_argument('--password', default='demo12345')

    def handle(self, *args, **opts):
        rnd = random.Random(42)
        now = timezone.now()
        users = []
        created = 0
        for i in range(opts['users']):
            email = f'demo{i + 1}@example.com'
            existing = User.objects.filter(email=email).first()
            if existing:
                users.append(existing)
                continue
            gender = rnd.choice(['male', 'female'])
            native = rnd.choice(LANGUAGES)
            learning = rnd.sample([l for l in LANGUAGES if l != native], rnd.choice([1, 1, 2]))
            spoken = rnd.sample([l for l in LANGUAGES if l != native and l not in learning], rnd.choice([0, 0, 1]))
            levels = {l: rnd.choice(LEVELS) for l in learning}
            levels.update({l: rnd.choice(LEVELS[2:]) for l in spoken})
            user = User.objects.create_user(
                email, opts['password'],
                first_name=rnd.choice(MALE if gender == 'male' else FEMALE),
                last_name=rnd.choice(LAST), email_verified=True,
            )
            p = user.profile
            p.gender = gender
            p.country = rnd.choice(COUNTRIES[native])
            p.date_of_birth = date.today() - timedelta(days=365 * rnd.randint(18, 55) + rnd.randint(0, 300))
            p.native_language = native
            p.learning_languages = learning
            p.learning_language = learning[0]
            p.spoken_languages = spoken
            p.language_levels = levels
            p.proficiency_level = LEGACY[levels[learning[0]]]
            p.timezone = rnd.choice(TIMEZONES)
            p.bio = rnd.choice(BIOS)
            p.learning_goals = f'Reach a comfortable conversational level in {learning[0]}.'
            # ~40% show as available now (a fresh heartbeat only lasts a few minutes).
            p.available_now = rnd.random() < 0.4
            p.last_seen = now
            p.save()
            for _ in range(rnd.randint(1, 4)):
                start = rnd.randint(8, 20)
                AvailabilitySlot.objects.create(
                    user=user, day_of_week=rnd.randint(0, 6),
                    start_time=time(start), end_time=time(min(start + rnd.randint(1, 3), 23), 30),
                )
            users.append(user)
            created += 1

        if created == 0:
            self.stdout.write('Demo users already exist; nothing new to create.')
            return

        sessions = 0
        for _ in range(len(users) * 2):
            host, partner = rnd.sample(users, 2)
            past = rnd.random() < 0.6
            days = rnd.randint(-30, -1) if past else rnd.randint(1, 14)
            if past:
                status = rnd.choice(['completed', 'completed', 'completed', 'not_completed'])
            else:
                status = rnd.choice(['pending', 'confirmed'])
            s = ScheduledSession.objects.create(
                host=host, partner=partner,
                scheduled_time=now + timedelta(days=days, hours=rnd.randint(0, 8)),
                duration_minutes=rnd.choice([30, 40, 60]), status=status,
            )
            sessions += 1
            if status == 'completed':
                for rater, ratee in ((host, partner), (partner, host)):
                    SessionRating.objects.get_or_create(
                        session=s, rater=rater, ratee=ratee,
                        defaults={'score': rnd.choice([3, 4, 4, 5, 5]), 'comment': ''},
                    )

        for _ in range(len(users)):
            a, b = rnd.sample(users, 2)
            conv = Conversation.objects.filter(participants=a).filter(participants=b).first()
            if not conv:
                conv = Conversation.objects.create()
                conv.participants.add(a, b)
            for n, text in enumerate(rnd.sample(MESSAGES, rnd.randint(2, 5))):
                Message.objects.create(conversation=conv, sender=a if n % 2 == 0 else b, text=text)

        self.stdout.write(self.style.SUCCESS(
            f'Created {created} users (demo1..demo{len(users)}@example.com / {opts["password"]}), '
            f'{sessions} sessions and chats.'
        ))
