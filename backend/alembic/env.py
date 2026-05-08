import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add the app to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.db.session import Base

# Import all models so Alembic can detect them
from app.domain.models.user import User
from app.domain.models.unit import Unit
from app.domain.models.booking import Booking
from app.domain.models.customer import Customer
from app.domain.models.finance import RevenueRecord, ExpenseRecord
from app.domain.models.operation import CleaningTask, MaintenanceTicket
from app.domain.models.accounting import Account, JournalEntry, JournalLine
from app.domain.models.invoice import Invoice, InvoiceLine, InvoicePayment, InvoiceSequence
from app.domain.models.location import Location
from app.domain.models.property_management import (
    ManagementEntity,
    Owner,
    PropertyGroup,
    UnitManagementContract,
)
from app.domain.models.team import Team, TeamMember, UnitTeamAssignment

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_SYNC_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
