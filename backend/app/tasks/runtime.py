import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from celery import Task

from app.core.logging import reset_task_id, set_task_id

logger = logging.getLogger(__name__)


def run_async_task(
    task: Task,
    task_name: str,
    coroutine_factory: Callable[[], Awaitable[dict[str, Any]]],
) -> dict[str, Any]:
    task_id = getattr(getattr(task, "request", None), "id", None)
    task_token = set_task_id(task_id)
    logger.info("task.started", extra={"task_name": task_name})

    try:
        result = asyncio.run(coroutine_factory())
        logger.info("task.completed", extra={"task_name": task_name, **result})
        return result
    except Exception as exc:
        logger.exception("task.failed", extra={"task_name": task_name})
        raise task.retry(exc=exc)
    finally:
        reset_task_id(task_token)