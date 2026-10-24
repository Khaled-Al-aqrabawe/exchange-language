from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0003_material_cefr'),
    ]

    operations = [
        migrations.DeleteModel(name='LessonProgress'),
        migrations.DeleteModel(name='Lesson'),
        migrations.DeleteModel(name='Course'),
    ]
