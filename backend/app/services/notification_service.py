from app.db import supabase
from fastapi import HTTPException


def create_notification(user_id: str, title: str, message: str, type_: str, related_id: str | None = None):
    supabase.table("notifications").insert({
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": type_,
        "related_id": related_id,
    }).execute()


def notify_approval(request: dict, approver_name: str = "Approver"):
    if not request.get("requester_id"):
        return
    try:
        create_notification(
            user_id=request["requester_id"],
            title="Request Approved",
            message=f"Your {request['type']} request has been approved by {approver_name}.",
            type_="approval",
            related_id=request["id"],
        )
    except Exception:
        pass


def notify_rejection(request: dict, reason: str, approver_name: str = "Approver"):
    if not request.get("requester_id"):
        return
    try:
        create_notification(
            user_id=request["requester_id"],
            title="Request Rejected",
            message=f"Your {request['type']} request was rejected. Reason: {reason}",
            type_="rejection",
            related_id=request["id"],
        )
    except Exception:
        pass


def list_notifications(user_id: str, unread_only: bool = False) -> list[dict]:
    query = supabase.table("notifications").select("*").eq("user_id", user_id).order("created_at", desc=True)
    if unread_only:
        query = query.eq("is_read", False)
    res = query.execute()
    return res.data or []


def mark_as_read(notification_id: str, user_id: str) -> dict:
    res = supabase.table("notifications").update({"is_read": True})\
        .eq("id", notification_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return res.data[0]


def mark_all_read(user_id: str):
    supabase.table("notifications").update({"is_read": True})\
        .eq("user_id", user_id).eq("is_read", False).execute()
