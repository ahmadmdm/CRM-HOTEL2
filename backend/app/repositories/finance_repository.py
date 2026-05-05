from typing import List
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.repositories.base import BaseRepository
from app.domain.models.finance import RevenueRecord, ExpenseRecord


class FinanceRepository(BaseRepository[RevenueRecord]):
    def __init__(self, session: AsyncSession):
        super().__init__(RevenueRecord, session)
        self.expense_model = ExpenseRecord

    async def get_revenue_sum(
        self, start_date: date, end_date: date, unit_id=None
    ) -> float:
        query = select(func.coalesce(func.sum(RevenueRecord.amount), 0)).where(
            and_(
                RevenueRecord.record_date >= start_date,
                RevenueRecord.record_date <= end_date,
            )
        )
        if unit_id:
            query = query.where(RevenueRecord.unit_id == unit_id)
        result = await self.session.execute(query)
        return float(result.scalar_one())

    async def get_expense_sum(
        self, start_date: date, end_date: date, unit_id=None
    ) -> float:
        query = select(func.coalesce(func.sum(ExpenseRecord.amount), 0)).where(
            and_(
                ExpenseRecord.record_date >= start_date,
                ExpenseRecord.record_date <= end_date,
            )
        )
        if unit_id:
            query = query.where(ExpenseRecord.unit_id == unit_id)
        result = await self.session.execute(query)
        return float(result.scalar_one())

    async def get_expenses(self, skip: int = 0, limit: int = 20, filters=None):
        query = select(ExpenseRecord)
        count_query = select(func.count()).select_from(ExpenseRecord)
        if filters:
            for f in filters:
                query = query.where(f)
                count_query = count_query.where(f)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()
        result = await self.session.execute(
            query.offset(skip).limit(limit).order_by(ExpenseRecord.record_date.desc())
        )
        return result.scalars().all(), total

    async def create_expense(self, obj: ExpenseRecord) -> ExpenseRecord:
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj
