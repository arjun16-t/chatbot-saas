# core/migrations/000X_seed_otp_cleanup_schedule.py
from django.db import migrations


def seed_schedule(apps, schema_editor):
    CrontabSchedule = apps.get_model('django_celery_beat', 'CrontabSchedule')
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')

    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute='30',
        hour='2',
        day_of_week='*',
        day_of_month='*',
        month_of_year='*',
        timezone='Asia/Kolkata',
    )

    PeriodicTask.objects.get_or_create(
        crontab=schedule,
        name='Cleanup expired OTPs',
        task='core.tasks.cleanup_expired_otps',
    )


def reverse_seed_schedule(apps, schema_editor):
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')
    PeriodicTask.objects.filter(name='Cleanup expired OTPs').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_otpverification'),  # adjust to your latest core migration
        ('django_celery_beat', '0019_alter_periodictasks_options'),  # match your installed django-celery-beat version
    ]

    operations = [
        migrations.RunPython(seed_schedule, reverse_seed_schedule),
    ]