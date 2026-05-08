import os
import uuid
import aiofiles
from typing import Optional
from uuid import UUID
from datetime import date
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.finance_repository import FinanceRepository
from app.domain.models.finance import RevenueRecord, ExpenseRecord
from app.services.accounting_service import AccountingService
from app.domain.schemas.finance import (
    RevenueCreate, RevenueUpdate, ExpenseCreate, ExpenseUpdate, FinanceSummary
)
from app.core.config import settings


class FinanceService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = FinanceRepository(session)
        self.accounting = AccountingService(session)

    async def create_revenue(self, data: RevenueCreate, created_by: UUID) -> RevenueRecord:
        record = RevenueRecord(**data.model_dump(), created_by=created_by)
        created = await self.repo.create(record)
        await self.accounting.create_revenue_entry(created)
        await self.repo.commit()
        return created

    async def create_expense(self, data: ExpenseCreate, created_by: UUID) -> ExpenseRecord:
        record = ExpenseRecord(**data.model_dump(), created_by=created_by)
        created = await self.repo.create_expense(record)
        await self.accounting.create_expense_entry(created)
        await self.repo.commit()
        return created

    async def get_financial_summary(
        self,
        start_date: date,
        end_date: date,
        unit_id: Optional[UUID] = None,
    ) -> FinanceSummary:
        total_revenue = await self.repo.get_revenue_sum(start_date, end_date, unit_id)
        total_expenses = await self.repo.get_expense_sum(start_date, end_date, unit_id)
        return FinanceSummary(
            total_revenue=total_revenue,
            total_expenses=total_expenses,
            net_profit=total_revenue - total_expenses,
            period_start=start_date,
            period_end=end_date,
        )

    async def list_revenue(self, skip: int = 0, limit: int = 20, filters=None):
        return await self.repo.get_all(skip=skip, limit=limit, filters=filters)

    async def list_expenses(self, skip: int = 0, limit: int = 20, filters=None):
        return await self.repo.get_expenses(skip=skip, limit=limit, filters=filters)

    async def upload_receipt(
        self, record_id: UUID, file: UploadFile, record_type: str
    ) -> str:
        if file.content_type not in settings.ALLOWED_IMAGE_TYPES + ["application/pdf"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type for receipt",
            )
        receipt_dir = os.path.join(settings.UPLOAD_DIR, "receipts")
        os.makedirs(receipt_dir, exist_ok=True)
        filename = f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}"
        filepath = os.path.join(receipt_dir, filename)
        async with aiofiles.open(filepath, "wb") as out_file:
            content = await file.read(settings.MAX_FILE_SIZE + 1)
            if len(content) > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File too large",
                )
            await out_file.write(content)
        return f"/uploads/receipts/{filename}"
