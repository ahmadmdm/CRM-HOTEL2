from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Query

from app.core.dependencies import AdminOrFinancial, CurrentUserPayload, DBSession
from app.domain.models.accounting import JournalSource
from app.domain.schemas.accounting import (
    AccountCreate,
    AccountResponse,
    JournalEntryCreate,
    JournalEntryResponse,
    TrialBalanceResponse,
)
from app.domain.schemas.common import PaginatedResponse
from app.services.accounting_service import AccountingService

router = APIRouter(prefix="/accounting", tags=["Accounting"])


@router.post("/accounts", response_model=AccountResponse, dependencies=[AdminOrFinancial])
async def create_account(data: AccountCreate, db: DBSession):
    service = AccountingService(db)
    return await service.create_account(data)


@router.get("/accounts", response_model=list[AccountResponse], dependencies=[AdminOrFinancial])
async def list_accounts(db: DBSession, active_only: bool = Query(False)):
    service = AccountingService(db)
    return await service.list_accounts(active_only=active_only)


@router.post("/journal-entries", response_model=JournalEntryResponse, dependencies=[AdminOrFinancial])
async def create_journal_entry(data: JournalEntryCreate, db: DBSession, payload: CurrentUserPayload):
    from uuid import UUID as PUUID

    service = AccountingService(db)
    return await service.create_journal_entry(data, PUUID(payload["sub"]))


@router.get("/journal-entries", response_model=PaginatedResponse[JournalEntryResponse], dependencies=[AdminOrFinancial])
async def list_journal_entries(
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source: Optional[JournalSource] = Query(None),
):
    service = AccountingService(db)
    items, total = await service.list_journal_entries(skip=(page - 1) * page_size, limit=page_size, source=source)
    return PaginatedResponse.create(
        items=[JournalEntryResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/journal-entries/{entry_id}", response_model=JournalEntryResponse, dependencies=[AdminOrFinancial])
async def get_journal_entry(entry_id: UUID, db: DBSession):
    service = AccountingService(db)
    return await service.get_journal_entry(entry_id)


@router.get("/trial-balance", response_model=TrialBalanceResponse, dependencies=[AdminOrFinancial])
async def get_trial_balance(
    db: DBSession,
    start_date: date = Query(...),
    end_date: date = Query(...),
):
    service = AccountingService(db)
    return await service.trial_balance(start_date, end_date)