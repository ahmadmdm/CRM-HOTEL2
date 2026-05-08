from __future__ import annotations

import logging
from uuid import UUID

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self) -> None:
        self._app_id = settings.ONESIGNAL_APP_ID
        self._api_key = settings.ONESIGNAL_REST_API_KEY
        self._api_url = settings.ONESIGNAL_API_URL

    @property
    def enabled(self) -> bool:
        return bool(self._app_id and self._api_key)

    async def notify_user(
        self,
        *,
        user_id: UUID,
        headings: dict[str, str],
        contents: dict[str, str],
        url: str,
        web_push_topic: str,
        data: dict[str, str],
    ) -> None:
        if not self.enabled:
            return

        payload = {
            "app_id": self._app_id,
            "target_channel": "push",
            "include_aliases": {"external_id": [str(user_id)]},
            "headings": headings,
            "contents": contents,
            "url": url,
            "web_push_topic": web_push_topic,
            "data": data,
        }
        headers = {
            "Authorization": f"Key {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self._api_url, json=payload, headers=headers)
                response.raise_for_status()
        except httpx.HTTPError:
            logger.exception("Failed to send OneSignal notification", extra={"user_id": str(user_id), "topic": web_push_topic})