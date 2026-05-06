import os
import logging
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.logging import configure_logging, reset_request_id, set_request_id
from app.core.rate_limit import limiter
from app.api.v1.router import api_router

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info("Application started. Upload dir: %s", settings.UPLOAD_DIR)
    yield
    # Shutdown
    logger.info("Application shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)


def _error_content(request: Request, detail: str) -> dict[str, str]:
    payload = {"detail": detail}
    request_id = getattr(request.state, "request_id", None)
    if request_id:
        payload["request_id"] = request_id
    return payload


def _response_headers(request: Request) -> dict[str, str]:
    request_id = getattr(request.state, "request_id", None)
    if not request_id:
        return {}
    return {settings.REQUEST_ID_HEADER: request_id}


@app.middleware("http")
async def add_request_context(request: Request, call_next):
    request_id = request.headers.get(settings.REQUEST_ID_HEADER) or str(uuid4())
    request.state.request_id = request_id
    request_token = set_request_id(request_id)
    started_at = time.perf_counter()

    logger.info(
        "request.started",
        extra={"method": request.method, "path": request.url.path},
    )

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        logger.exception(
            "request.failed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "duration_ms": duration_ms,
            },
        )
        reset_request_id(request_token)
        raise

    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    response.headers[settings.REQUEST_ID_HEADER] = request_id
    logger.info(
        "request.completed",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    reset_request_id(request_token)
    return response

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (uploaded images/receipts)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API Router
app.include_router(api_router)


# Global exception handlers
@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.warning(
        "database.integrity_error",
        extra={"method": request.method, "path": request.url.path, "error": str(exc)},
    )
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content=_error_content(
            request,
            "Data conflict: a record with these details already exists.",
        ),
        headers=_response_headers(request),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(
        "request.unhandled_exception",
        extra={"method": request.method, "path": request.url.path, "error": str(exc)},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_content(
            request,
            "Internal server error. Please try again later.",
        ),
        headers=_response_headers(request),
    )


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}
