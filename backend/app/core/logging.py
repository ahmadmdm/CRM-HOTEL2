import json
import logging
from contextvars import ContextVar, Token
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings

request_id_context: ContextVar[str | None] = ContextVar("request_id", default=None)
task_id_context: ContextVar[str | None] = ContextVar("task_id", default=None)

_RESERVED_LOG_FIELDS = set(logging.makeLogRecord({}).__dict__.keys()) | {
    "message",
    "asctime",
}
_LOGGING_CONFIGURED = False


def set_request_id(request_id: str | None) -> Token[str | None]:
    return request_id_context.set(request_id)


def reset_request_id(token: Token[str | None]) -> None:
    request_id_context.reset(token)


def get_request_id() -> str | None:
    return request_id_context.get()


def set_task_id(task_id: str | None) -> Token[str | None]:
    return task_id_context.set(task_id)


def reset_task_id(token: Token[str | None]) -> None:
    task_id_context.reset(token)


def _make_json_safe(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, (list, tuple)):
        return [_make_json_safe(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _make_json_safe(item) for key, item in value.items()}
    return str(value)


class ContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_context.get() or "-"
        record.task_id = task_id_context.get() or "-"
        record.environment = settings.ENVIRONMENT
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "environment": getattr(record, "environment", settings.ENVIRONMENT),
            "request_id": getattr(record, "request_id", "-"),
            "task_id": getattr(record, "task_id", "-"),
        }

        extras = {
            key: _make_json_safe(value)
            for key, value in record.__dict__.items()
            if key not in _RESERVED_LOG_FIELDS and not key.startswith("_")
        }
        payload.update(extras)

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    global _LOGGING_CONFIGURED
    if _LOGGING_CONFIGURED:
        return

    handler = logging.StreamHandler()
    handler.addFilter(ContextFilter())

    if settings.LOG_JSON:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s [req=%(request_id)s task=%(task_id)s] %(name)s: %(message)s"
            )
        )

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL, logging.INFO))

    for logger_name in (
        "uvicorn",
        "uvicorn.error",
        "uvicorn.access",
        "celery",
        "celery.app.trace",
    ):
        current_logger = logging.getLogger(logger_name)
        current_logger.handlers.clear()
        current_logger.propagate = True

    _LOGGING_CONFIGURED = True