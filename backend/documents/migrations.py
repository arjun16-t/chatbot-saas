from django.db import migrations

from django_celery_beat import models


def create_deletion_sweep_schedule(apps, schema_editor):
    """
    Seed CrontabSchedule + PeriodicTask for the daily deletion sweep.

    Uses apps.get_model() (historical models) for django_celery_beat's
    CrontabSchedule/PeriodicTask, not a direct import. get_or_create
    for both, to stay idempotent.

    Args:
        apps: historical app registry, injected by RunPython.
        schema_editor: unused here, required by RunPython's signature.
    """
    CrontabSchedule = apps.get_model('django_celery_beat', 'CrontabSchedule')
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')

    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute='0',
        hour='2',
        day_of_week='*',
        day_of_month='*',
        month_of_year='*',
    )

    PeriodicTask.objects.get_or_create(
        name='Sweep Deleted Documents',
        task='documents.tasks.sweep_deleted_documents',
        crontab=schedule
    )


def reverse_deletion_sweep_schedule(apps, schema_editor):
    """
    Delete the CrontabSchedule + PeriodicTask rows created above.

    Args:
        apps: historical app registry, injected by RunPython.
        schema_editor: unused here, required by RunPython's signature.
    """
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')
    PeriodicTask.objects.filter(name='Sweep deleted documents').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0004_alter_document_doc_id_alter_document_filename_and_more'),
        ('django_celery_beat', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(
            create_deletion_sweep_schedule,
            reverse_deletion_sweep_schedule,
        )
    ]
