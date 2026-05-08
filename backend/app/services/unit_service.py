import os
import uuid
import aiofiles
from typing import Optional, List
from uuid import UUID
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.unit_repository import UnitRepository
from app.domain.models.unit import Unit, UnitStatus, UNIT_STATUS_TRANSITIONS
from app.domain.models.location import Location
from app.domain.models.property_management import ManagementEntity, Owner, PropertyGroup
from app.domain.models.team import UnitTeamAssignment
from app.domain.schemas.unit import UnitCreate, UnitUpdate
from app.core.config import settings
from app.domain.models.user import User, UserRole


class UnitService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = UnitRepository(session)

    async def _get_user_map(self, user_ids: list[UUID]) -> dict[UUID, User]:
        if not user_ids:
            return {}

        ordered_ids = list(dict.fromkeys(user_ids))
        result = await self.session.execute(select(User).where(User.id.in_(ordered_ids)))
        users = result.scalars().all()
        users_by_id = {user.id: user for user in users}
        missing = [str(user_id) for user_id in ordered_ids if user_id not in users_by_id]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unknown user ids in unit assignment: {missing}",
            )
        return users_by_id

    async def _ensure_exists(self, model: type, item_id: UUID | None, label: str) -> None:
        if item_id is None:
            return
        result = await self.session.execute(select(model.id).where(model.id == item_id))
        if result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{label} not found",
            )

    async def _validate_unit_classification(self, data: UnitCreate | UnitUpdate) -> None:
        if "location_id" in data.model_fields_set:
            await self._ensure_exists(Location, data.location_id, "Location")
        if "owner_id" in data.model_fields_set:
            await self._ensure_exists(Owner, data.owner_id, "Owner")
        if "management_entity_id" in data.model_fields_set:
            await self._ensure_exists(ManagementEntity, data.management_entity_id, "Management entity")
        if "property_group_id" in data.model_fields_set:
            await self._ensure_exists(PropertyGroup, data.property_group_id, "Property group")

    async def _resolve_assignments(
        self,
        supervisor_id: UUID | None,
        housekeeping_team_ids: list[UUID] | None,
        maintenance_team_ids: list[UUID] | None,
    ) -> tuple[User | None, list[User], list[User]]:
        housekeeping_ids = list(dict.fromkeys(housekeeping_team_ids or []))
        maintenance_ids = list(dict.fromkeys(maintenance_team_ids or []))
        lookup_ids: list[UUID] = []
        if supervisor_id is not None:
            lookup_ids.append(supervisor_id)
        lookup_ids.extend(housekeeping_ids)
        lookup_ids.extend(maintenance_ids)
        users_by_id = await self._get_user_map(lookup_ids)

        supervisor = users_by_id.get(supervisor_id) if supervisor_id is not None else None
        if supervisor and supervisor.role not in {
            UserRole.SUPER_ADMIN,
            UserRole.SUB_ADMIN,
            UserRole.OPERATIONS,
        }:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Supervisor must be a super admin, sub admin, or operations user",
            )

        housekeeping_team = [users_by_id[user_id] for user_id in housekeeping_ids]
        invalid_housekeeping = [
            member.full_name for member in housekeeping_team if member.role != UserRole.HOUSEKEEPING
        ]
        if invalid_housekeeping:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Housekeeping team members must have housekeeping role: {invalid_housekeeping}",
            )

        maintenance_team = [users_by_id[user_id] for user_id in maintenance_ids]
        invalid_maintenance = [
            member.full_name for member in maintenance_team if member.role != UserRole.MAINTENANCE
        ]
        if invalid_maintenance:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Maintenance team members must have maintenance role: {invalid_maintenance}",
            )

        return supervisor, housekeeping_team, maintenance_team

    async def create_unit(self, data: UnitCreate) -> Unit:
        existing = await self.repo.get_by_code(data.code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Unit with code '{data.code}' already exists",
            )
        supervisor, housekeeping_team, maintenance_team = await self._resolve_assignments(
            data.supervisor_id,
            data.housekeeping_team_ids,
            data.maintenance_team_ids,
        )
        await self._validate_unit_classification(data)
        unit_payload = data.model_dump(
            exclude={"supervisor_id", "housekeeping_team_ids", "maintenance_team_ids"}
        )
        unit = Unit(**unit_payload, supervisor=supervisor)
        unit.housekeeping_team = housekeeping_team
        unit.maintenance_team = maintenance_team
        created = await self.repo.create(unit)
        await self.repo.commit()
        return await self.get_unit(created.id)

    async def get_unit(self, unit_id: UUID) -> Unit:
        unit = await self.repo.get_by_id(unit_id)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found"
            )
        return unit

    async def update_unit(self, unit_id: UUID, data: UnitUpdate) -> Unit:
        unit = await self.get_unit(unit_id)
        await self._validate_unit_classification(data)
        payload = data.model_dump(
            exclude={"supervisor_id", "housekeeping_team_ids", "maintenance_team_ids"},
            exclude_unset=True,
        )
        for key, value in payload.items():
            setattr(unit, key, value)
        updated = unit

        if "supervisor_id" in data.model_fields_set:
            supervisor, _, _ = await self._resolve_assignments(
                data.supervisor_id,
                None,
                None,
            )
            updated.supervisor = supervisor

        if "housekeeping_team_ids" in data.model_fields_set:
            _, housekeeping_team, _ = await self._resolve_assignments(
                None,
                data.housekeeping_team_ids,
                None,
            )
            updated.housekeeping_team = housekeeping_team

        if "maintenance_team_ids" in data.model_fields_set:
            _, _, maintenance_team = await self._resolve_assignments(
                None,
                None,
                data.maintenance_team_ids,
            )
            updated.maintenance_team = maintenance_team

        await self.repo.commit()
        return await self.get_unit(updated.id)

    async def change_unit_status(
        self, unit_id: UUID, new_status: UnitStatus, reason: Optional[str] = None
    ) -> Unit:
        unit = await self.get_unit(unit_id)
        if not unit.can_transition_to(new_status):
            allowed = [s.value for s in UNIT_STATUS_TRANSITIONS.get(unit.status, [])]
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot transition from '{unit.status.value}' to '{new_status.value}'. "
                       f"Allowed: {allowed}",
            )
        unit.status = new_status
        await self.repo.commit()
        return await self.get_unit(unit_id)

    async def delete_unit(self, unit_id: UUID) -> None:
        unit = await self.get_unit(unit_id)
        if unit.status in [UnitStatus.OCCUPIED, UnitStatus.RESERVED]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete a unit that is occupied or reserved",
            )
        await self.repo.delete(unit)
        await self.repo.commit()

    async def list_units(
        self,
        skip: int = 0,
        limit: int = 20,
        status_filter: Optional[UnitStatus] = None,
        location_id: Optional[UUID] = None,
        owner_id: Optional[UUID] = None,
        management_entity_id: Optional[UUID] = None,
        property_group_id: Optional[UUID] = None,
        team_id: Optional[UUID] = None,
        is_managed_by_us: Optional[bool] = None,
    ):
        filters = []
        if status_filter:
            filters.append(Unit.status == status_filter)
        if location_id:
            filters.append(Unit.location_id == location_id)
        if owner_id:
            filters.append(Unit.owner_id == owner_id)
        if management_entity_id:
            filters.append(Unit.management_entity_id == management_entity_id)
        if property_group_id:
            filters.append(Unit.property_group_id == property_group_id)
        if team_id:
            filters.append(
                Unit.id.in_(
                    select(UnitTeamAssignment.unit_id).where(UnitTeamAssignment.team_id == team_id)
                )
            )
        if is_managed_by_us is not None:
            filters.append(Unit.is_managed_by_us == is_managed_by_us)
        return await self.repo.get_all(skip=skip, limit=limit, filters=filters)

    async def upload_unit_image(self, unit_id: UUID, file: UploadFile) -> Unit:
        unit = await self.get_unit(unit_id)
        if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {settings.ALLOWED_IMAGE_TYPES}",
            )
        unit_dir = os.path.join(settings.UPLOAD_DIR, "units", str(unit_id))
        os.makedirs(unit_dir, exist_ok=True)
        filename = f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}"
        filepath = os.path.join(unit_dir, filename)
        async with aiofiles.open(filepath, "wb") as out_file:
            content = await file.read(settings.MAX_FILE_SIZE + 1)
            if len(content) > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File too large",
                )
            await out_file.write(content)
        relative_path = f"/uploads/units/{unit_id}/{filename}"
        images = list(unit.images or [])
        images.append(relative_path)
        unit.images = images
        await self.repo.commit()
        return unit

    async def get_status_summary(self) -> dict:
        return await self.repo.count_by_status()
