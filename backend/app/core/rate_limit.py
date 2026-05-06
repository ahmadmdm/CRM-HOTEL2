from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings


def get_client_address(request: Request) -> str:
    if settings.ENVIRONMENT in {"staging", "production"}:
        cloudflare_ip = request.headers.get("cf-connecting-ip")
        if cloudflare_ip:
            return cloudflare_ip.strip()

        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            forwarded_ip = forwarded_for.split(",", 1)[0].strip()
            if forwarded_ip:
                return forwarded_ip

    return get_remote_address(request)


limiter = Limiter(
    key_func=get_client_address,
    storage_uri=settings.REDIS_URL,
    in_memory_fallback_enabled=True,
)