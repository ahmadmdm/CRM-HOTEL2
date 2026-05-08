from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.models.team import Team, TeamMember, TeamType, UnitTeamAssignment
from app.domain.models.unit import Unit
from app.domain.models.user import User, UserRole
from app.domain.schemas.team import TeamCreate, TeamUpdate, UnitTeamAssignmentCreate


class TeamService:
    def __init__(self, session: AsyncSession):
        self.session = session

    def _base_query(self):
        return select(Team).options(
            selectinload(Team.supervisor),
            selectinload(Team.members).selectinload(TeamMember.user),
        )

    async def _get_team(self, team_id: UUID) -> Team:
        result = await self.session.execute(self._base_query().where(Team.id == team_id))
        team = result.scalar_one_or_none()
        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
        return team

    async def _ensure_unique_code(self, code: str, current_id: UUID | None = None) -> None:
        query = select(Team).where(Team.code == code)
        if current_id:
            query = query.where(Team.id != current_id)
        if (await self.session.execute(query)).scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Team code already exists")

    async def _get_user_map(self, user_ids: list[UUID]) -> dict[UUID, User]:
        if not user_ids:
            return {}
        ordered_ids = list(dict.fromkeys(user_ids))
        result = await self.session.execute(select(User).where(User.id.in_(ordered_ids)))
        users = result.scalars().all()
        users_by_id = {user.id: user for user in users}
        missing = [str(user_id) for user_id in ordered_ids if user_id not in users_by_id]
        if missing:
            raise HTTPException(status_code=422, detail=f"Unknown user ids in team assignment: {missing}")
        return users_by_id

    async def _validate_people(self, team_type: TeamType, supervisor_id: UUID | None, member_ids: list[UUID]) -> tuple[User | None, list[User]]:
        lookup_ids = list(member_ids)
        if supervisor_id:
            lookup_ids.append(supervisor_id)
        users_by_id = await self._get_user_map(lookup_ids)
        supervisor = users_by_id.get(supervisor_id) if supervisor_id else None
        if supervisor and supervisor.role not in {UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN, UserRole.OPERATIONS}:
            raise HTTPException(status_code=422, detail="Team supervisor must be an admin, sub admin, or operations user")

        expected_role = UserRole.HOUSEKEEPING if team_type == TeamType.HOUSEKEEPING else UserRole.MAINTENANCE
        members = [users_by_id[user_id] for user_id in list(dict.fromkeys(member_ids))]
        invalid = [member.full_name for member in members if member.role != expected_role]
        if invalid:
            raise HTTPException(status_code=422, detail=f"Team members must have {expected_role.value} role: {invalid}")
        return supervisor, members

    async def create_team(self, data: TeamCreate) -> Team:
        await self._ensure_unique_code(data.code)
        supervisor, members = await self._validate_people(data.team_type, data.supervisor_id, data.member_ids)
        payload = data.model_dump(exclude={"member_ids", "supervisor_id"})
        team = Team(**payload, supervisor=supervisor)
        team.members = [TeamMember(user=member) for member in members]
        self.session.add(team)
        await self.session.commit()
        return await self._get_team(team.id)

    async def update_team(self, team_id: UUID, data: TeamUpdate) -> Team:
        team = await self._get_team(team_id)
        if "code" in data.model_fields_set and data.code:
            await self._ensure_unique_code(data.code, team_id)
        target_type = data.team_type or team.team_type
        member_ids = data.member_ids if data.member_ids is not None else [member.user_id for member in team.members]
        supervisor_id = data.supervisor_id if "supervisor_id" in data.model_fields_set else team.supervisor_id
        supervisor, members = await self._validate_people(target_type, supervisor_id, member_ids)
        for key, value in data.model_dump(exclude={"member_ids", "supervisor_id"}, exclude_unset=True).items():
            setattr(team, key, value)
        if "supervisor_id" in data.model_fields_set:
            team.supervisor = supervisor
        if data.member_ids is not None:
            team.members = [TeamMember(user=member) for member in members]
        await self.session.commit()
        return await self._get_team(team.id)

    async def list_teams(self, skip: int = 0, limit: int = 20, team_type: TeamType | None = None):
        query = self._base_query()
        count_query = select(func.count()).select_from(Team)
        if team_type:
            query = query.where(Team.team_type == team_type)
            count_query = count_query.where(Team.team_type == team_type)
        total = (await self.session.execute(count_query)).scalar_one()
        result = await self.session.execute(query.order_by(Team.created_at.desc()).offset(skip).limit(limit))
        return result.scalars().all(), total

    async def assign_team_to_unit(self, data: UnitTeamAssignmentCreate) -> UnitTeamAssignment:
        unit = (await self.session.execute(select(Unit).where(Unit.id == data.unit_id))).scalar_one_or_none()
        if not unit:
            raise HTTPException(status_code=404, detail="Unit not found")
        await self._get_team(data.team_id)
        assignment = await self.session.get(UnitTeamAssignment, {"unit_id": data.unit_id, "team_id": data.team_id})
        if assignment:
            assignment.is_primary = data.is_primary
            assignment.notes = data.notes
        else:
            assignment = UnitTeamAssignment(**data.model_dump())
            self.session.add(assignment)
        await self.session.commit()
        await self.session.refresh(assignment)
        return assignment