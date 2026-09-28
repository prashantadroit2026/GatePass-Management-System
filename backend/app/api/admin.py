from fastapi import APIRouter, Depends
from app.services import request_service
from app.api.deps import require_permission
from app.core.rbac import Permission

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/expire-stale")
async def expire_stale(
    current_user: dict = Depends(require_permission(Permission.MANAGE_USER_ACCOUNTS)),
):
    """Expire all pending requests whose validity window has passed.

    Admin-only. Returns the count of expired requests.
    """
    # Only admin should reach this (MANAGE_USER_ACCOUNTS is held by admin + hr,
    # but we add an explicit role check to restrict to admin only)
    if current_user["role"] != "admin":
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can trigger stale expiry"
        )
    count = request_service.expire_stale_requests()
    return {"expired": count}
