import re

from django.conf import settings
from django.db import models


MATERIAL_LANGUAGES = [
    (name, name) for name in [
        'Arabic', 'English', 'Spanish', 'French', 'German', 'Mandarin Chinese',
        'Japanese', 'Korean', 'Portuguese', 'Italian', 'Russian', 'Turkish', 'Hindi',
    ]
]
MATERIAL_LEVELS = [(lvl, lvl) for lvl in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']]


class Material(models.Model):
    title = models.CharField(max_length=200, blank=True)
    language = models.CharField(max_length=50, choices=MATERIAL_LANGUAGES)
    level = models.CharField(max_length=20, choices=MATERIAL_LEVELS, default='A1')
    order = models.PositiveIntegerField(default=0, help_text='Lesson number, filled from the file name')
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='materials/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['language', 'level', 'order', 'title']

    def save(self, *args, **kwargs):
        if self.file and (not self.title or not self.order):
            title, order = parse_material_name(self.file.name)
            self.title = self.title or title
            self.order = self.order or order
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.title} ({self.language}, {self.level})'


def parse_material_name(filename):
    """'English-A1-Lesson-01-Greetings-&-Introductions.pptx' -> ('Lesson 01 - Greetings & Introductions', 1)"""
    stem = re.sub(r'\.[^.]+$', '', filename.rsplit('/', 1)[-1])
    m = re.search(r'(?i)lesson[-_ ]*(\d+)[-_ ]*(.*)$', stem)
    if m:
        number, rest = m.group(1), m.group(2).replace('-', ' ').replace('_', ' ').strip()
        return (f'Lesson {number} - {rest}' if rest else f'Lesson {number}'), int(number)
    return stem.replace('-', ' ').replace('_', ' ').strip(), 0


class MaterialProgress(models.Model):
    """How far a user got in one lesson (material) during live sessions."""

    STATUS_CHOICES = [
        ('complete', 'Complete'),
        ('partial', 'Partial'),
        ('not_started', 'Not started'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='material_progress', on_delete=models.CASCADE)
    material = models.ForeignKey(Material, related_name='progress_entries', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    # Slide the user stopped at (only meaningful for 'partial').
    last_slide = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'material')

    def __str__(self):
        return f'{self.user_id} - {self.material_id} ({self.status})'
