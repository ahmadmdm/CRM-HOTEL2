#!/bin/sh
set -e

echo "Running Alembic migrations..."
alembic upgrade head

echo "Seeding initial super admin..."
python -c "
import asyncio
from app.db.session import AsyncSessionLocal
import app.db.base
from app.domain.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select
import os, uuid

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@crm.local')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Admin@1234')
ADMIN_NAME = os.environ.get('ADMIN_NAME', 'مدير النظام')

async def seed():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
        existing = result.scalar_one_or_none()
        if existing:
            print(f'Admin already exists: {ADMIN_EMAIL}')
            return
        admin = User(
            id=uuid.uuid4(),
            email=ADMIN_EMAIL,
            password_hash=get_password_hash(ADMIN_PASSWORD),
            full_name=ADMIN_NAME,
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        print(f'Created admin: {ADMIN_EMAIL}')

asyncio.run(seed())
"

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
    echo "Seeding demo dataset..."
    python -m app.scripts.seed_demo_data
fi

echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
