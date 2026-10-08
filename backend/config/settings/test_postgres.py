"""Real row-lock tests, isolated from application data in a fresh test database."""
import copy
import uuid
from .base import DATABASES as application_databases
from .test import *  # noqa: F403

DATABASES = copy.deepcopy(application_databases)
DATABASES["default"]["TEST"] = {"NAME": "test_iod_exams_" + uuid.uuid4().hex[:12]}
DATABASES["default"]["CONN_MAX_AGE"] = 0
