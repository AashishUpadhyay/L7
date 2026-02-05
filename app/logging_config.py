"""Configure application logging to file and console."""

import logging
import os
import sys

# Directory for log files (default: /app/data/logs in container, cwd when not set)
LOG_DIR = os.environ.get("LOG_DIR", "/app/data/logs")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
LOG_FILE = os.path.join(LOG_DIR, "app.log")
# Max size per file, keep 3 backups
LOG_FILE_MAX_BYTES = int(os.environ.get("LOG_FILE_MAX_BYTES", "5_000_000"))
LOG_FILE_BACKUP_COUNT = int(os.environ.get("LOG_FILE_BACKUP_COUNT", "3"))

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging() -> None:
    """Configure root logger to write to a file and to stdout."""
    os.makedirs(LOG_DIR, exist_ok=True)

    from logging.handlers import RotatingFileHandler

    root = logging.getLogger()
    root.setLevel(LOG_LEVEL)
    formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

    file_handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=LOG_FILE_MAX_BYTES,
        backupCount=LOG_FILE_BACKUP_COUNT,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)

    # Reduce noise from third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
