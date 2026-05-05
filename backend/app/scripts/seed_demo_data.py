from __future__ import annotations

import asyncio
import os
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.domain.models.booking import (
    Booking,
    BookingChannel,
    BookingStatus,
    PaymentStatus,
)
from app.domain.models.customer import Customer
from app.domain.models.finance import ExpenseRecord, FinanceCategory, RevenueRecord
from app.domain.models.operation import (
    CleaningTask,
    MaintenanceTicket,
    TaskStatus,
    TicketPriority,
    TicketStatus,
)
from app.domain.models.unit import Unit, UnitStatus
from app.domain.models.user import User, UserRole

DEMO_PASSWORD = os.getenv("DEMO_USER_PASSWORD", "Demo@1234")
DEMO_MARKER = "[demo-seed]"


async def get_by_field(
    session: AsyncSession,
    model,
    field_name: str,
    value,
):
    field = getattr(model, field_name)
    result = await session.execute(select(model).where(field == value))
    return result.scalar_one_or_none()


async def upsert_user(
    session: AsyncSession,
    *,
    email: str,
    full_name: str,
    role: UserRole,
    phone: str,
    is_active: bool = True,
) -> User:
    user = await get_by_field(session, User, "email", email)
    if user is None:
        user = User(email=email, password_hash="", full_name=full_name, role=role)
        session.add(user)

    user.password_hash = get_password_hash(DEMO_PASSWORD)
    user.full_name = full_name
    user.role = role
    user.phone = phone
    user.is_active = is_active
    await session.flush()
    return user


async def upsert_unit(session: AsyncSession, *, code: str, **values) -> Unit:
    unit = await get_by_field(session, Unit, "code", code)
    if unit is None:
        unit = Unit(code=code, name=values["name"])
        session.add(unit)

    for key, value in values.items():
        setattr(unit, key, value)
    await session.flush()
    return unit


async def upsert_customer(
    session: AsyncSession,
    *,
    phone: str,
    **values,
) -> Customer:
    customer = await get_by_field(session, Customer, "phone", phone)
    if customer is None:
        customer = Customer(phone=phone, full_name=values["full_name"])
        session.add(customer)

    for key, value in values.items():
        setattr(customer, key, value)
    await session.flush()
    return customer


async def upsert_booking(session: AsyncSession, *, marker: str, **values) -> Booking:
    booking = await get_by_field(session, Booking, "notes", marker)
    if booking is None:
        booking = Booking(notes=marker, unit_id=values["unit_id"], customer_id=values["customer_id"])
        session.add(booking)

    for key, value in values.items():
        setattr(booking, key, value)
    booking.notes = marker
    await session.flush()
    return booking


async def upsert_cleaning_task(session: AsyncSession, *, marker: str, **values) -> CleaningTask:
    task = await get_by_field(session, CleaningTask, "notes", marker)
    if task is None:
        task = CleaningTask(notes=marker, unit_id=values["unit_id"])
        session.add(task)

    for key, value in values.items():
        setattr(task, key, value)
    task.notes = marker
    await session.flush()
    return task


async def upsert_maintenance_ticket(
    session: AsyncSession,
    *,
    title: str,
    legacy_titles: tuple[str, ...] = (),
    **values,
) -> MaintenanceTicket:
    ticket = await get_by_field(session, MaintenanceTicket, "title", title)
    if ticket is None:
        for legacy_title in legacy_titles:
            ticket = await get_by_field(session, MaintenanceTicket, "title", legacy_title)
            if ticket is not None:
                break
    if ticket is None:
        ticket = MaintenanceTicket(title=title, unit_id=values["unit_id"])
        session.add(ticket)

    ticket.title = title
    for key, value in values.items():
        setattr(ticket, key, value)
    await session.flush()
    return ticket


async def upsert_revenue_record(
    session: AsyncSession,
    *,
    description: str,
    legacy_descriptions: tuple[str, ...] = (),
    **values,
) -> RevenueRecord:
    record = await get_by_field(session, RevenueRecord, "description", description)
    if record is None:
        for legacy_description in legacy_descriptions:
            record = await get_by_field(session, RevenueRecord, "description", legacy_description)
            if record is not None:
                break
    if record is None:
        record = RevenueRecord(
            description=description,
            unit_id=values["unit_id"],
            amount=values["amount"],
            category=values["category"],
            record_date=values["record_date"],
        )
        session.add(record)

    record.description = description
    for key, value in values.items():
        setattr(record, key, value)
    await session.flush()
    return record


async def upsert_expense_record(
    session: AsyncSession,
    *,
    description: str,
    legacy_descriptions: tuple[str, ...] = (),
    **values,
) -> ExpenseRecord:
    record = await get_by_field(session, ExpenseRecord, "description", description)
    if record is None:
        for legacy_description in legacy_descriptions:
            record = await get_by_field(session, ExpenseRecord, "description", legacy_description)
            if record is not None:
                break
    if record is None:
        record = ExpenseRecord(
            description=description,
            amount=values["amount"],
            category=values["category"],
            record_date=values["record_date"],
        )
        session.add(record)

    record.description = description
    for key, value in values.items():
        setattr(record, key, value)
    await session.flush()
    return record


async def seed_demo_data() -> None:
    today = date.today()
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        sub_admin = await upsert_user(
            session,
            email="subadmin@crm.local",
            full_name="مدير التشغيل التنفيذي",
            role=UserRole.SUB_ADMIN,
            phone="0500001001",
        )
        financial = await upsert_user(
            session,
            email="financial@crm.local",
            full_name="مدير المالية",
            role=UserRole.FINANCIAL,
            phone="0500001002",
        )
        operations = await upsert_user(
            session,
            email="operations@crm.local",
            full_name="قائد العمليات",
            role=UserRole.OPERATIONS,
            phone="0500001003",
        )
        maintenance = await upsert_user(
            session,
            email="maintenance@crm.local",
            full_name="مسؤول الصيانة",
            role=UserRole.MAINTENANCE,
            phone="0500001004",
        )
        housekeeping = await upsert_user(
            session,
            email="housekeeping@crm.local",
            full_name="مشرفة النظافة",
            role=UserRole.HOUSEKEEPING,
            phone="0500001005",
        )

        units = {
            "RM-101": await upsert_unit(
                session,
                code="RM-101",
                name="جناح الأفق",
                description="جناح جاهز بتشطيب راقٍ وإطلالة مفتوحة.",
                floor=1,
                area_sqm=68,
                price_per_night=420,
                price_per_month=7800,
                location="الرياض / الياسمين",
                amenities=["دخول ذاتي", "تلفاز ذكي", "ركن قهوة", "مساحة عمل"],
                images=[],
                smart_lock_code="RM101-LOCK",
                status=UnitStatus.READY,
                notes=f"{DEMO_MARKER} premium-ready-suite",
            ),
            "RM-102": await upsert_unit(
                session,
                code="RM-102",
                name="إقامة المرسى",
                description="وحدة مشغولة حاليًا ضمن خط الإشغال النشط.",
                floor=1,
                area_sqm=74,
                price_per_night=510,
                price_per_month=9200,
                location="الرياض / حطين",
                amenities=["شرفة", "سرير ملكي", "واي فاي 6", "خدمة كونسيرج"],
                images=[],
                smart_lock_code="RM102-LOCK",
                status=UnitStatus.OCCUPIED,
                notes=f"{DEMO_MARKER} occupied-suite",
            ),
            "RM-103": await upsert_unit(
                session,
                code="RM-103",
                name="استوديو النخيل",
                description="وحدة خرج منها الضيف وتنتظر تسليم النظافة.",
                floor=1,
                area_sqm=52,
                price_per_night=310,
                price_per_month=6400,
                location="الرياض / الصحافة",
                amenities=["إنترنت سريع", "غسيل ملابس", "دخول ذكي"],
                images=[],
                smart_lock_code="RM103-LOCK",
                status=UnitStatus.WAITING_CLEANING,
                notes=f"{DEMO_MARKER} waiting-cleaning-studio",
            ),
            "RM-104": await upsert_unit(
                session,
                code="RM-104",
                name="جناح المعرض",
                description="حجز مؤكد قادم خلال أيام ويحتاج جاهزية دقيقة.",
                floor=2,
                area_sqm=79,
                price_per_night=560,
                price_per_month=9800,
                location="الرياض / الملقا",
                amenities=["دش مطري", "جدار وسائط", "ركن قهوة"],
                images=[],
                smart_lock_code="RM104-LOCK",
                status=UnitStatus.RESERVED,
                notes=f"{DEMO_MARKER} reserved-suite",
            ),
            "RM-201": await upsert_unit(
                session,
                code="RM-201",
                name="لوفت المدار",
                description="وحدة تحت الصيانة مع تذكرة عاجلة مفتوحة.",
                floor=2,
                area_sqm=81,
                price_per_night=590,
                price_per_month=10100,
                location="الرياض / النرجس",
                amenities=["مطبخ جزيرة", "ركن جلوس", "مدخل خاص"],
                images=[],
                smart_lock_code="RM201-LOCK",
                status=UnitStatus.MAINTENANCE,
                notes=f"{DEMO_MARKER} maintenance-loft",
            ),
            "RM-202": await upsert_unit(
                session,
                code="RM-202",
                name="بنتهاوس الأفق",
                description="وحدة شاغرة حالياً تستخدم لإظهار حالات الإلغاء والعروض.",
                floor=2,
                area_sqm=95,
                price_per_night=720,
                price_per_month=12400,
                location="الرياض / العقيق",
                amenities=["تراس", "مفروشات فاخرة", "إضاءة ذكية"],
                images=[],
                smart_lock_code="RM202-LOCK",
                status=UnitStatus.VACANT,
                notes=f"{DEMO_MARKER} vacant-penthouse",
            ),
        }

        customers = {
            "0507000001": await upsert_customer(
                session,
                phone="0507000001",
                full_name="ليلى حسن",
                email="layla.demo@example.com",
                national_id="2468101214",
                nationality="سعودية",
                notes="عميلة متكررة تفضّل الوصول الذاتي.",
                is_blacklisted=False,
                blacklist_reason=None,
            ),
            "0507000002": await upsert_customer(
                session,
                phone="0507000002",
                full_name="عمر ناصر",
                email="omar.demo@example.com",
                national_id="2468101215",
                nationality="سعودي",
                notes="ضيف شركة مع حجز حالي.",
                is_blacklisted=False,
                blacklist_reason=None,
            ),
            "0507000003": await upsert_customer(
                session,
                phone="0507000003",
                full_name="سارة عادل",
                email="sara.demo@example.com",
                national_id="2468101216",
                nationality="مصرية",
                notes="غادرت مؤخرًا بعد إقامة قصيرة.",
                is_blacklisted=False,
                blacklist_reason=None,
            ),
            "0507000004": await upsert_customer(
                session,
                phone="0507000004",
                full_name="رامي كريم",
                email="rami.demo@example.com",
                national_id="2468101217",
                nationality="أردني",
                notes="تم إلغاء حجزه ضمن سيناريوهات العرض.",
                is_blacklisted=False,
                blacklist_reason=None,
            ),
            "0507000005": await upsert_customer(
                session,
                phone="0507000005",
                full_name="نورة سالم",
                email="noura.demo@example.com",
                national_id="2468101218",
                nationality="سعودية",
                notes="عميلة موقوفة لحين مراجعة السجل المالي.",
                is_blacklisted=True,
                blacklist_reason="تكرار تأخير السداد ووجود تلفيات غير مسددة.",
            ),
        }

        confirmed_booking = await upsert_booking(
            session,
            marker=f"{DEMO_MARKER} booking-confirmed-rm104",
            unit_id=units["RM-104"].id,
            customer_id=customers["0507000001"].id,
            created_by=sub_admin.id,
            check_in=today + timedelta(days=4),
            check_out=today + timedelta(days=8),
            actual_check_in=None,
            actual_check_out=None,
            total_cost=3360,
            tax_amount=504,
            deposit_amount=1000,
            amount_paid=1000,
            status=BookingStatus.CONFIRMED,
            payment_status=PaymentStatus.PARTIAL,
            booking_channel=BookingChannel.AIRBNB,
            guests_count=2,
        )

        checked_in_booking = await upsert_booking(
            session,
            marker=f"{DEMO_MARKER} booking-checked-in-rm102",
            unit_id=units["RM-102"].id,
            customer_id=customers["0507000002"].id,
            created_by=operations.id,
            check_in=today - timedelta(days=1),
            check_out=today + timedelta(days=2),
            actual_check_in=now - timedelta(days=1),
            actual_check_out=None,
            total_cost=4200,
            tax_amount=630,
            deposit_amount=1500,
            amount_paid=4830,
            status=BookingStatus.CHECKED_IN,
            payment_status=PaymentStatus.PAID,
            booking_channel=BookingChannel.DIRECT,
            guests_count=3,
        )

        checked_out_booking = await upsert_booking(
            session,
            marker=f"{DEMO_MARKER} booking-checked-out-rm103",
            unit_id=units["RM-103"].id,
            customer_id=customers["0507000003"].id,
            created_by=operations.id,
            check_in=today - timedelta(days=5),
            check_out=today - timedelta(days=1),
            actual_check_in=now - timedelta(days=5),
            actual_check_out=now - timedelta(days=1),
            total_cost=2100,
            tax_amount=315,
            deposit_amount=800,
            amount_paid=2415,
            status=BookingStatus.CHECKED_OUT,
            payment_status=PaymentStatus.PAID,
            booking_channel=BookingChannel.BOOKING_COM,
            guests_count=2,
        )

        await upsert_booking(
            session,
            marker=f"{DEMO_MARKER} booking-cancelled-rm202",
            unit_id=units["RM-202"].id,
            customer_id=customers["0507000004"].id,
            created_by=sub_admin.id,
            check_in=today + timedelta(days=10),
            check_out=today + timedelta(days=12),
            actual_check_in=None,
            actual_check_out=None,
            total_cost=1440,
            tax_amount=216,
            deposit_amount=0,
            amount_paid=0,
            status=BookingStatus.CANCELLED,
            payment_status=PaymentStatus.UNPAID,
            booking_channel=BookingChannel.AGODA,
            guests_count=1,
        )

        await upsert_cleaning_task(
            session,
            marker=f"{DEMO_MARKER} cleaning-rm103-turnaround",
            unit_id=units["RM-103"].id,
            booking_id=checked_out_booking.id,
            assigned_to=housekeeping.id,
            status=TaskStatus.IN_PROGRESS,
            completed_at=None,
        )

        await upsert_cleaning_task(
            session,
            marker=f"{DEMO_MARKER} cleaning-rm101-vip-reset",
            unit_id=units["RM-101"].id,
            booking_id=None,
            assigned_to=housekeeping.id,
            status=TaskStatus.DONE,
            completed_at=now - timedelta(days=1),
        )

        await upsert_maintenance_ticket(
            session,
            title="معايرة التكييف - RM-201",
            legacy_titles=(f"{DEMO_MARKER} HVAC calibration - RM-201",),
            unit_id=units["RM-201"].id,
            created_by=operations.id,
            assigned_to=maintenance.id,
            description="اهتزاز في وحدة التكييف المركزية يتطلب فحصًا عاجلًا.",
            priority=TicketPriority.URGENT,
            status=TicketStatus.IN_PROGRESS,
            images=[],
            resolved_at=None,
            resolution_notes=None,
        )

        await upsert_maintenance_ticket(
            session,
            title="تجديد الإضاءة - RM-101",
            legacy_titles=(f"{DEMO_MARKER} Lighting refresh - RM-101",),
            unit_id=units["RM-101"].id,
            created_by=sub_admin.id,
            assigned_to=maintenance.id,
            description="استبدال وحدات الإضاءة الديكورية بعد مراجعة الضيف السابق.",
            priority=TicketPriority.LOW,
            status=TicketStatus.RESOLVED,
            images=[],
            resolved_at=now - timedelta(days=2),
            resolution_notes="تم الاستبدال واختبار الشدة اللونية.",
        )

        await upsert_revenue_record(
            session,
            description="إيجار إقامة RM-102 الحالية",
            legacy_descriptions=(f"{DEMO_MARKER} rent-rm102-active-stay",),
            unit_id=units["RM-102"].id,
            booking_id=checked_in_booking.id,
            created_by=financial.id,
            amount=4830,
            category=FinanceCategory.RENT,
            record_date=today - timedelta(days=1),
        )

        await upsert_revenue_record(
            session,
            description="تأمين حجز RM-104 المؤكد",
            legacy_descriptions=(f"{DEMO_MARKER} deposit-rm104-confirmed",),
            unit_id=units["RM-104"].id,
            booking_id=confirmed_booking.id,
            created_by=financial.id,
            amount=1000,
            category=FinanceCategory.DEPOSIT,
            record_date=today,
        )

        await upsert_revenue_record(
            session,
            description="رسوم خدمة خروج RM-103",
            legacy_descriptions=(f"{DEMO_MARKER} service-fee-rm103-checkout",),
            unit_id=units["RM-103"].id,
            booking_id=checked_out_booking.id,
            created_by=financial.id,
            amount=180,
            category=FinanceCategory.SERVICE_FEE,
            record_date=today - timedelta(days=1),
        )

        await upsert_expense_record(
            session,
            description="صيانة تكييف RM-201",
            legacy_descriptions=(f"{DEMO_MARKER} maintenance-rm201-hvac",),
            unit_id=units["RM-201"].id,
            created_by=financial.id,
            amount=950,
            category=FinanceCategory.MAINTENANCE_COST,
            record_date=today,
        )

        await upsert_expense_record(
            session,
            description="تنظيف تجهيز RM-103",
            legacy_descriptions=(f"{DEMO_MARKER} cleaning-rm103-turnaround",),
            unit_id=units["RM-103"].id,
            created_by=financial.id,
            amount=180,
            category=FinanceCategory.CLEANING_COST,
            record_date=today,
        )

        await upsert_expense_record(
            session,
            description="باقة خدمات شهرية",
            legacy_descriptions=(f"{DEMO_MARKER} utilities-monthly-bundle",),
            unit_id=None,
            created_by=financial.id,
            amount=420,
            category=FinanceCategory.UTILITIES,
            record_date=today - timedelta(days=2),
        )

        await upsert_expense_record(
            session,
            description="تجديد مستلزمات التشغيل",
            legacy_descriptions=(f"{DEMO_MARKER} supplies-launch-refresh",),
            unit_id=None,
            created_by=financial.id,
            amount=110,
            category=FinanceCategory.SUPPLIES,
            record_date=today - timedelta(days=3),
        )

        await session.commit()

    print("Demo seed complete.")
    print("Role accounts are ready with the shared demo password.")
    print("subadmin@crm.local")
    print("financial@crm.local")
    print("operations@crm.local")
    print("maintenance@crm.local")
    print("housekeeping@crm.local")


if __name__ == "__main__":
    asyncio.run(seed_demo_data())