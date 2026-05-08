from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    accounting,
    bookings,
    customers,
    finance,
    invoices,
    locations,
    management,
    operations,
    teams,
    units,
    users,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(accounting.router)
api_router.include_router(users.router)
api_router.include_router(units.router)
api_router.include_router(bookings.router)
api_router.include_router(customers.router)
api_router.include_router(finance.router)
api_router.include_router(invoices.router)
api_router.include_router(operations.router)
api_router.include_router(locations.router)
api_router.include_router(management.router)
api_router.include_router(teams.router)
