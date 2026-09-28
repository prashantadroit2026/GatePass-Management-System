from fastapi import APIRouter, Depends
from app.services import request_service
from app.services import reminder_service
from app.api.deps import require_permission
from app.core.rbac import Permission

router = APIRouter(prefix="/admin", tags=["Admin"])


def _require_admin(current_user: dict) -> dict:
    """Raise 403 if caller is not admin. Returns user."""
    if current_user["role"] != "admin":
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can use this endpoint"
        )
    return current_user


@router.post("/expire-stale")
async def expire_stale(
    current_user: dict = Depends(require_permission(Permission.MANAGE_USER_ACCOUNTS)),
):
    """Expire all pending requests whose validity window has passed.

    Admin-only. Returns the count of expired requests.
    """
    _require_admin(current_user)
    count = request_service.expire_stale_requests()
    return {"expired": count}


@router.post("/run-reminders")
async def run_reminders(
    current_user: dict = Depends(require_permission(Permission.MANAGE_USER_ACCOUNTS)),
):
    """Generate and send all pending reminders.

    Admin-only. Returns the count of new notifications sent.
    """
    _require_admin(current_user)
    count = reminder_service.generate_reminders()
    return {"reminders_sent": count}
