from fastapi import APIRouter, Depends, Query, status
from app.schemas.gate import GateLogCreate, GateLogOut, AcceptedItem
from app.services import gate_service
from app.api.deps import get_current_user, require_permission
from app.core.rbac import Permission

router = APIRouter(prefix="/gate", tags=["Gate Logs"])


@router.post("/log", response_model=GateLogOut, status_code=status.HTTP_201_CREATED)
async def log_movement(
    data: GateLogCreate,
    current_user: dict = Depends(require_permission(Permission.LOG_GATE_MOVEMENT)),
):
    """Security logs In/Out against an approved request"""
    return gate_service.log_gate_movement(current_user, data.model_dump())


@router.get("/logs", response_model=list[GateLogOut])
async def list_logs(
    request_id: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    return gate_service.list_gate_logs(request_id, current_user)


@router.get("/accepted", response_model=list[AcceptedItem])
async def list_accepted(
    type: str | None = Query(None, description="Filter by request type: leave|visitor|vendor"),
    search: str | None = Query(None, description="Search by name, company, or description"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_permission(Permission.VIEW_ACCEPTED_LIST)),
):
    """List approved gatepasses with next expected movement.
    Accessible by security and admin roles.
    """
    return gate_service.get_accepted_list(
        req_type=type,
        search=search,
        limit=limit,
        offset=offset,
    )
