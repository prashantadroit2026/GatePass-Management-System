from fastapi import APIRouter, Depends, status
from app.schemas.gate import GateLogCreate, GateLogOut
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
    return gate_service.list_gate_logs(request_id)
