from fastapi import APIRouter, Depends, Query
from app.schemas.notification import NotificationOut, MarkRead
from app.services import notification_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=list[NotificationOut])
async def list_my_notifications(
    unread_only: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
    return notification_service.list_notifications(current_user["id"], unread_only)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    return notification_service.mark_as_read(notification_id, current_user["id"])


@router.post("/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    notification_service.mark_all_read(current_user["id"])
    return {"message": "All notifications marked as read"}
