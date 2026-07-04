import os

from celery import Celery

# Set the default Django settings module for the 'celery' program,
# before doing anything else with Celery. Must come first — Celery
# needs to know which settings module to read when it configures itself
# in the next step.


app = Celery("config")

# Tell this Celery app to pull its configuration from Django's settings.py,
# but only look at settings prefixed with 'CELERY_' (e.g. CELERY_BROKER_URL).
# namespace='CELERY' is what enforces that prefix convention.


# Auto-discover task modules in every app listed in INSTALLED_APPS.
# Celery will look for a 'tasks.py' inside each app and register any
# @shared_task-decorated functions it finds — no manual registration needed.