from django.core.management.base import BaseCommand

from courses.models import Course, Lesson

SAMPLE_VIDEOS = [
    'https://www.w3schools.com/html/mov_bbb.mp4',
    'https://download.samplelib.com/mp4/sample-10s.mp4',
    'https://download.samplelib.com/mp4/sample-15s.mp4',
]

COURSES = [
    {
        'language': 'English', 'level': 'beginner', 'title': 'English for Beginners',
        'description': 'Greetings, everyday phrases, and the basics of English conversation.',
        'lessons': ['Saying Hello', 'Introducing Yourself', 'Numbers and Time'],
    },
    {
        'language': 'English', 'level': 'intermediate', 'title': 'Intermediate English Conversation',
        'description': 'Build fluency with common conversational patterns and idioms.',
        'lessons': ['Making Small Talk', 'Talking About Your Day', 'Common Idioms'],
    },
    {
        'language': 'English', 'level': 'advanced', 'title': 'Advanced English Fluency',
        'description': 'Refine pronunciation, nuance, and natural expression.',
        'lessons': ['Debating Opinions', 'Business English', 'Storytelling'],
    },
    {
        'language': 'Arabic', 'level': 'beginner', 'title': 'Arabic for Beginners',
        'description': 'Learn the Arabic alphabet, greetings, and basic phrases.',
        'lessons': ['The Arabic Alphabet', 'Greetings and Introductions', 'Numbers 1-10'],
    },
    {
        'language': 'Arabic', 'level': 'intermediate', 'title': 'Intermediate Arabic',
        'description': 'Everyday conversation, verbs, and sentence structure.',
        'lessons': ['Ordering Food', 'Asking for Directions', 'Talking About Family'],
    },
    {
        'language': 'Arabic', 'level': 'advanced', 'title': 'Advanced Arabic Fluency',
        'description': 'Dialects, formal Arabic, and natural conversation flow.',
        'lessons': ['Modern Standard vs. Dialect', 'News and Current Events', 'Formal Writing'],
    },
]


class Command(BaseCommand):
    help = 'Seeds sample Arabic and English courses with placeholder video lessons.'

    def handle(self, *args, **options):
        created_courses = 0
        created_lessons = 0

        for entry in COURSES:
            course, was_created = Course.objects.get_or_create(
                title=entry['title'],
                defaults={
                    'language': entry['language'],
                    'level': entry['level'],
                    'description': entry['description'],
                },
            )
            if was_created:
                created_courses += 1

            for order, lesson_title in enumerate(entry['lessons']):
                _, lesson_created = Lesson.objects.get_or_create(
                    course=course, title=lesson_title,
                    defaults={
                        'video_url': SAMPLE_VIDEOS[order % len(SAMPLE_VIDEOS)],
                        'order': order,
                        'duration_minutes': 5 + order * 2,
                    },
                )
                if lesson_created:
                    created_lessons += 1

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {created_courses} new courses and {created_lessons} new lessons.'
        ))
