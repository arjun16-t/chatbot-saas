from django.db import migrations

from django_celery_beat import models


def create_deletion_sweep_schedule(apps, schema_editor):
    """
    Data migration: seeds the initial CrontabSchedule + PeriodicTask
    rows so the daily deletion sweep exists automatically in any
    fresh environment (dev, CI, production) without requiring a
    manual admin step.

    Steps:
    1. Get CrontabSchedule and PeriodicTask via apps.get_model(...)
       (historical models -- NOT a direct import of the real model
       classes, since migrations must work against the schema as it
       existed at migration time, not today's version of the model).
       django_celery_beat is a third-party app, so use
       apps.get_model('django_celery_beat', 'CrontabSchedule') etc.
    2. CrontabSchedule.objects.get_or_create(...) for "2:00 AM daily"
       (hour='2', minute='0', all other fields '*' for daily).
       get_or_create, not create -- migrations should be safe to
       reason about even if something already created an identical
       schedule, and avoids duplicate rows if this were ever re-run
       in an unusual scenario.
    3. PeriodicTask.objects.get_or_create(...) -- name= a human-
       readable label, task='documents.tasks.sweep_deleted_documents'
       (the dotted import path, as a string -- Beat resolves it at
       runtime, doesn't import your task module directly), crontab=
       the schedule from step 2.

    Note: PeriodicTask.task is a plain string field. If you ever
    rename the task function or move it to a different module, this
    string won't update automatically -- it would silently stop
    matching and the sweep would stop firing with no error anywhere.
    Worth remembering if you ever refactor tasks.py later.
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
    Reverse migration: delete the PeriodicTask/CrontabSchedule rows
    created above, so `migrate` backwards cleanly undoes this.
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
