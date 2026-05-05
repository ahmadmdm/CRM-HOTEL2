from uuid import UUID
from typing import Optional
from datetime import date
from fastapi import APIRouter, Query, UploadFile, File
from app.domain.schemas.finance import (
    RevenueCreate, RevenueUpdate, RevenueResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, FinanceSummary
)
from app.domain.schemas.common import PaginatedResponse
from app.services.finance_service import FinanceService
from app.core.dependencies import DBSession, CurrentUserPayload, AdminOrFinancial

router = APIRouter(prefix="/finance", tags=["Finance"])


@router.post("/revenue", response_model=RevenueResponse, dependencies=[AdminOrFinancial])
async def create_revenue(
    data: RevenueCreate, db: DBSession, payload: CurrentUserPayload
):
    from uuid import UUID as PUUID
    service = FinanceService(db)
    return await service.create_revenue(data, PUUID(payload["sub"]))


@router.get("/revenue", response_model=PaginatedResponse[RevenueResponse], dependencies=[AdminOrFinancial])
async def list_revenue(
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unit_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
):
    from app.domain.models.finance import RevenueRecord
    service = FinanceService(db)
    filters = []
    if unit_id:
        filters.append(RevenueRecord.unit_id == unit_id)
    if start_date:
        filters.append(RevenueRecord.record_date >= start_date)
    if end_date:
        filters.append(RevenueRecord.record_date <= end_date)
    items, total = await service.list_revenue(
        skip=(page - 1) * page_size, limit=page_size, filters=filters
    )
    return PaginatedResponse.create(
        items=[RevenueResponse.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/expense", response_model=ExpenseResponse, dependencies=[AdminOrFinancial])
async def create_expense(
    data: ExpenseCreate, db: DBSession, payload: CurrentUserPayload
):
    from uuid import UUID as PUUID
    service = FinanceService(db)
    return await service.create_expense(data, PUUID(payload["sub"]))


@router.get("/expense", response_model=PaginatedResponse[ExpenseResponse], dependencies=[AdminOrFinancial])
async def list_expenses(
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unit_id: Optional[UUID] = Query(None),
):
    from app.domain.models.finance import ExpenseRecord
    service = FinanceService(db)
    filters = []
    if unit_id:
        filters.append(ExpenseRecord.unit_id == unit_id)
    items, total = await service.list_expenses(
        skip=(page - 1) * page_size, limit=page_size, filters=filters
    )
    return PaginatedResponse.create(
        items=[ExpenseResponse.model_validate(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/summary", response_model=FinanceSummary, dependencies=[AdminOrFinancial])
async def get_summary(
    db: DBSession,
    start_date: date = Query(...),
    end_date: date = Query(...),
    unit_id: Optional[UUID] = Query(None),
):
    service = FinanceService(db)
    return await service.get_financial_summary(start_date, end_date, unit_id)
