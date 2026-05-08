from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.location import Location
from app.domain.models.property_management import (
    ContractStatus,
    ManagementEntity,
    Owner,
    PropertyGroup,
    UnitManagementContract,
)
from app.domain.models.unit import Unit
from app.domain.models.user import User, UserRole
from app.domain.schemas.location import LocationCreate, LocationUpdate
from app.domain.schemas.property_management import (
    ManagementEntityCreate,
    ManagementEntityUpdate,
    OwnerCreate,
    OwnerUpdate,
    PropertyGroupCreate,
    PropertyGroupUpdate,
    UnitManagementContractCreate,
    UnitManagementContractUpdate,
)


class ClassificationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _get_or_404(self, model: type, item_id: UUID, label: str):
        result = await self.session.execute(select(model).where(model.id == item_id))
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found")
        return item

    async def _ensure_unique_code(self, model: type, code: str, label: str, current_id: UUID | None = None) -> None:
        query = select(model).where(model.code == code)
        if current_id:
            query = query.where(model.id != current_id)
        existing = (await self.session.execute(query)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"{label} code already exists")

    async def _list(self, model: type, skip: int, limit: int, filters: list[Any] | None = None):
        query = select(model)
        count_query = select(func.count()).select_from(model)
        for condition in filters or []:
            query = query.where(condition)
            count_query = count_query.where(condition)
        total = (await self.session.execute(count_query)).scalar_one()
        result = await self.session.execute(query.order_by(model.created_at.desc()).offset(skip).limit(limit))
        return result.scalars().all(), total

    async def create_location(self, data: LocationCreate) -> Location:
        await self._ensure_unique_code(Location, data.code, "Location")
        if data.parent_id:
            await self._get_or_404(Location, data.parent_id, "Parent location")
        location = Location(**data.model_dump())
        self.session.add(location)
        await self.session.commit()
        await self.session.refresh(location)
        return location

    async def update_location(self, location_id: UUID, data: LocationUpdate) -> Location:
        location = await self._get_or_404(Location, location_id, "Location")
        if "code" in data.model_fields_set and data.code:
            await self._ensure_unique_code(Location, data.code, "Location", location_id)
        if "parent_id" in data.model_fields_set and data.parent_id:
            if data.parent_id == location_id:
                raise HTTPException(status_code=422, detail="Location cannot be its own parent")
            await self._get_or_404(Location, data.parent_id, "Parent location")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(location, key, value)
        await self.session.commit()
        await self.session.refresh(location)
        return location

    async def list_locations(self, skip: int = 0, limit: int = 20, kind=None, parent_id: UUID | None = None):
        filters = []
        if kind:
            filters.append(Location.kind == kind)
        if parent_id:
            filters.append(Location.parent_id == parent_id)
        return await self._list(Location, skip, limit, filters)

    async def create_owner(self, data: OwnerCreate) -> Owner:
        owner = Owner(**data.model_dump())
        self.session.add(owner)
        await self.session.commit()
        await self.session.refresh(owner)
        return owner

    async def update_owner(self, owner_id: UUID, data: OwnerUpdate) -> Owner:
        owner = await self._get_or_404(Owner, owner_id, "Owner")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(owner, key, value)
        await self.session.commit()
        await self.session.refresh(owner)
        return owner

    async def list_owners(self, skip: int = 0, limit: int = 20):
        return await self._list(Owner, skip, limit)

    async def _validate_manager(self, manager_id: UUID | None) -> None:
        if not manager_id:
            return
        manager = await self._get_or_404(User, manager_id, "Manager")
        if manager.role not in {UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN, UserRole.OPERATIONS}:
            raise HTTPException(status_code=422, detail="Manager must be an admin, sub admin, or operations user")

    async def create_management_entity(self, data: ManagementEntityCreate) -> ManagementEntity:
        await self._ensure_unique_code(ManagementEntity, data.code, "Management entity")
        await self._validate_manager(data.manager_id)
        entity = ManagementEntity(**data.model_dump())
        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity

    async def update_management_entity(self, entity_id: UUID, data: ManagementEntityUpdate) -> ManagementEntity:
        entity = await self._get_or_404(ManagementEntity, entity_id, "Management entity")
        if "code" in data.model_fields_set and data.code:
            await self._ensure_unique_code(ManagementEntity, data.code, "Management entity", entity_id)
        if "manager_id" in data.model_fields_set:
            await self._validate_manager(data.manager_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(entity, key, value)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity

    async def list_management_entities(self, skip: int = 0, limit: int = 20):
        return await self._list(ManagementEntity, skip, limit)

    async def _validate_group_links(self, owner_id: UUID | None, management_entity_id: UUID | None, location_id: UUID | None) -> None:
        if owner_id:
            await self._get_or_404(Owner, owner_id, "Owner")
        if management_entity_id:
            await self._get_or_404(ManagementEntity, management_entity_id, "Management entity")
        if location_id:
            await self._get_or_404(Location, location_id, "Location")

    async def create_property_group(self, data: PropertyGroupCreate) -> PropertyGroup:
        await self._ensure_unique_code(PropertyGroup, data.code, "Property group")
        await self._validate_group_links(data.owner_id, data.management_entity_id, data.location_id)
        group = PropertyGroup(**data.model_dump())
        self.session.add(group)
        await self.session.commit()
        await self.session.refresh(group)
        return group

    async def update_property_group(self, group_id: UUID, data: PropertyGroupUpdate) -> PropertyGroup:
        group = await self._get_or_404(PropertyGroup, group_id, "Property group")
        if "code" in data.model_fields_set and data.code:
            await self._ensure_unique_code(PropertyGroup, data.code, "Property group", group_id)
        await self._validate_group_links(data.owner_id, data.management_entity_id, data.location_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(group, key, value)
        await self.session.commit()
        await self.session.refresh(group)
        return group

    async def list_property_groups(self, skip: int = 0, limit: int = 20):
        return await self._list(PropertyGroup, skip, limit)

    async def create_contract(self, data: UnitManagementContractCreate) -> UnitManagementContract:
        unit = await self._get_or_404(Unit, data.unit_id, "Unit")
        await self._validate_group_links(data.owner_id, data.management_entity_id, None)
        if data.property_group_id:
            await self._get_or_404(PropertyGroup, data.property_group_id, "Property group")
        contract = UnitManagementContract(**data.model_dump())
        self.session.add(contract)
        if contract.status == ContractStatus.ACTIVE:
            self._sync_unit_from_contract(unit, contract)
        await self.session.commit()
        await self.session.refresh(contract)
        return contract

    async def update_contract(self, contract_id: UUID, data: UnitManagementContractUpdate) -> UnitManagementContract:
        contract = await self._get_or_404(UnitManagementContract, contract_id, "Management contract")
        await self._validate_group_links(data.owner_id, data.management_entity_id, None)
        if data.property_group_id:
            await self._get_or_404(PropertyGroup, data.property_group_id, "Property group")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(contract, key, value)
        if contract.status == ContractStatus.ACTIVE:
            unit = await self._get_or_404(Unit, contract.unit_id, "Unit")
            self._sync_unit_from_contract(unit, contract)
        await self.session.commit()
        await self.session.refresh(contract)
        return contract

    async def list_contracts(self, skip: int = 0, limit: int = 20, unit_id: UUID | None = None):
        filters = [UnitManagementContract.unit_id == unit_id] if unit_id else []
        return await self._list(UnitManagementContract, skip, limit, filters)

    def _sync_unit_from_contract(self, unit: Unit, contract: UnitManagementContract) -> None:
        unit.owner_id = contract.owner_id
        unit.management_entity_id = contract.management_entity_id
        unit.property_group_id = contract.property_group_id
        unit.is_managed_by_us = contract.management_entity_id is not None
        unit.admin_fee_percent = contract.admin_fee_percent