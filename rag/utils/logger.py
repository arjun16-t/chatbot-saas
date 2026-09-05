import json
import logging
from datetime import UTC, datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path

from rich.logging import RichHandler

from rag.config import DEBUG

_CONFIGURED = False

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
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

def setup_logging() -> None:
    global _CONFIGURED

    if _CONFIGURED:
        return
    
    Path("logs").mkdir(exist_ok=True, parents=True)
    
    root = logging.getLogger()
    root.setLevel(logging.DEBUG if DEBUG else logging.INFO)

    console_handler = RichHandler(
        rich_tracebacks=True,
        show_path=True,
        markup=True
    )
    console_handler.setLevel(logging.DEBUG if DEBUG else logging.INFO)

    # JSON file
    file_handler = RotatingFileHandler(
        "logs/app.jsonl",
        maxBytes=5_000_000,
        backupCount=5
    )
    file_handler.setFormatter(JSONFormatter())
    file_handler.setLevel(logging.DEBUG)

    root.addHandler(console_handler)
    root.addHandler(file_handler)
    _CONFIGURED = True

def get_logger(name) -> logging.Logger:
    setup_logging()
    return logging.getLogger(name)