from fastapi import APIRouter, Depends, status
from app.schemas.request import (
    LeaveCreate, VisitorCreate, VendorCreate,
    ApproveRequest, RejectRequest, CancelRequest, RequestOut
)
from app.services import request_service
from app.api.deps import get_current_user, require_permission
from app.core.rbac import Permission

router = APIRouter(prefix="/requests", tags=["Requests"])


# ---------- Create ----------
@router.post("/leave", response_model=RequestOut, status_code=status.HTTP_201_CREATED)
async def create_leave(
    data: LeaveCreate,
    current_user: dict = Depends(require_permission(Permission.CREATE_LEAVE_REQUEST)),
):
    return request_service.create_leave_request(current_user, data.model_dump())


@router.post("/visitor", response_model=RequestOut, status_code=status.HTTP_201_CREATED)
async def create_visitor(
    data: VisitorCreate,
    current_user: dict = Depends(require_permission(Permission.CREATE_VISITOR_REQUEST)),
):
    return request_service.create_visitor_request(current_user, data.model_dump())


@router.post("/vendor", response_model=RequestOut, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    data: VendorCreate,
    current_user: dict = Depends(require_permission(Permission.CREATE_VENDOR_ENTRY_REQUEST)),
):
    return request_service.create_vendor_request(current_user, data.model_dump())


# ---------- List & Get ----------
@router.get("/", response_model=list[RequestOut])
async def list_requests(current_user: dict = Depends(get_current_user)):
    """List requests visible to the current user (role-based)"""
    return request_service.list_requests_for_user(current_user)


@router.get("/{request_id}", response_model=RequestOut)
async def get_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
):
    return request_service.get_request(request_id)


# ---------- Decisions ----------
@router.post("/{request_id}/approve", response_model=RequestOut)
async def approve(
    request_id: str,
    data: ApproveRequest = None,
    current_user: dict = Depends(require_permission(Permission.APPROVE_REJECT_REQUEST)),
):
    notes = data.notes if data else None
    return request_service.approve_request(request_id, current_user, notes)


@router.post("/{request_id}/reject", response_model=RequestOut)
async def reject(
    request_id: str,
    data: RejectRequest,
    current_user: dict = Depends(require_permission(Permission.APPROVE_REJECT_REQUEST)),
):
    return request_service.reject_request(request_id, current_user, data.rejection_reason)


@router.post("/{request_id}/cancel", response_model=RequestOut)
async def cancel(
    request_id: str,
    data: CancelRequest = None,
    current_user: dict = Depends(require_permission(Permission.CANCEL_REQUEST)),
):
    notes = data.notes if data else None
    return request_service.cancel_request(request_id, current_user, notes)
