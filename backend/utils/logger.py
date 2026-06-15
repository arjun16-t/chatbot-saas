import logging
import json
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "module": record.module,
            "file": record.pathname,
            "line": record.lineno,
            "function": record.funcName,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log["exception"] = self.formatException(record.exc_info)

        return json.dumps(log)

def get_logger(name: str) -> logging.Logger:
    """
    Returns a named logger. Logging is configured via Django's
    LOGGING setting in settings.py at startup.

    Args:
        name: Logger name, typically __name__ from the calling module.

    Returns:
        A configured logging.Logger instance.
    """
    return logging.getLogger(name)