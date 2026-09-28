from datetime import datetime, timedelta, timezone
from app.db import supabase
from app.services import notification_service
from fastapi import HTTPException, status


def _now():
    return datetime.now(timezone.utc)


def _calculate_validity(req_type: str, leave_days: int | None = None) -> tuple[datetime, datetime]:
    now = _now()
    if req_type == "leave" and leave_days:
        return now, now + timedelta(days=leave_days)
    return now, now + timedelta(hours=24)


def can_decide(approver: dict, requester: dict) -> None:
    if approver["id"] == requester["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-approval or self-rejection is not allowed"
        )
    req_role = requester.get("role")
    appr_role = approver.get("role")
    if req_role == "hr":
        if appr_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HR requests can only be approved or rejected by Admin"
            )
    elif req_role in ("employee", "vendor"):
        if appr_role != "hr":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employee and vendor requests can only be approved or rejected by HR"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to approve or reject this request"
        )


def create_leave_request(requester: dict, data: dict) -> dict:
    valid_from, valid_until = _calculate_validity("leave", data.get("leave_days"))

    payload = {
        "type": "leave",
        "status": "pending",
        "requester_id": requester["id"],
        "leave_type": data["leave_type"],
        "leave_days": data.get("leave_days"),
        "leave_reason": data.get("leave_reason"),
        "notes": data.get("notes"),
        "valid_from": valid_from.isoformat(),
        "valid_until": valid_until.isoformat(),
    }

    res = supabase.table("gatepass_requests").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create leave request")
    return res.data[0]


def create_visitor_request(requester: dict, data: dict) -> dict:
    valid_from, valid_until = _calculate_validity("visitor")

    payload = {
        "type": "visitor",
        "status": "pending",
        "requester_id": requester["id"],
        "visitor_name": data["visitor_name"],
        "visitor_phone": data["visitor_phone"],
        "visitor_purpose": data.get("visitor_purpose"),
        "notes": data.get("notes"),
        "valid_from": valid_from.isoformat(),
        "valid_until": valid_until.isoformat(),
    }

    res = supabase.table("gatepass_requests").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create visitor request")
    return res.data[0]


def create_vendor_request(requester: dict, data: dict) -> dict:
    valid_from, valid_until = _calculate_validity("vendor")

    payload = {
        "type": "vendor",
        "status": "pending",
        "requester_id": requester["id"],
        "vendor_item_direction": data["vendor_item_direction"],
        "vendor_item_description": data["vendor_item_description"],
        "vendor_company": data.get("vendor_company"),
        "notes": data.get("notes"),
        "valid_from": valid_from.isoformat(),
        "valid_until": valid_until.isoformat(),
    }

    res = supabase.table("gatepass_requests").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create vendor request")
    return res.data[0]


def get_request(request_id: str, current_user: dict | None = None) -> dict:
    res = supabase.table("gatepass_requests").select("*").eq("id", request_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Request not found")
    req = res.data

    if current_user is not None:
        user_id = current_user["id"]
        role = current_user["role"]

        if req["requester_id"] == user_id:
            return req

        if role == "admin":
            return req

        if role == "hr":
            requester = supabase.table("users").select("role").eq("id", req["requester_id"]).single().execute().data
            if requester and requester.get("role") == "admin":
                raise HTTPException(status_code=404, detail="Request not found")
            return req

        if role == "security":
            if req.get("status") == "approved":
                return req
            raise HTTPException(status_code=404, detail="Request not found")

        raise HTTPException(status_code=404, detail="Request not found")

    return req


def list_requests_for_user(user: dict) -> list[dict]:
    role = user["role"]
    query = supabase.table("gatepass_requests").select("*").order("created_at", desc=True)

    if role == "admin":
        pass
    elif role == "hr":
        admins = supabase.table("users").select("id").eq("role", "admin").execute()
        admin_ids = [a["id"] for a in (admins.data or [])]
        if admin_ids:
            query = query.not_.in_("requester_id", admin_ids)
    elif role == "security":
        query = query.eq("status", "approved")
    else:
        query = query.eq("requester_id", user["id"])

    res = query.execute()
    return res.data or []


def _parse_iso(dt_str: str | None) -> datetime | None:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return None


def approve_request(request_id: str, approver: dict, notes: str | None = None) -> dict:
    req = get_request(request_id)

    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot approve request in status: {req['status']}")

    valid_until = _parse_iso(req.get("valid_until"))
    if valid_until and valid_until < _now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve request after its validity window has expired"
        )

    requester = supabase.table("users").select("*").eq("id", req["requester_id"]).single().execute().data
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    can_decide(approver, requester)

    update = {
        "status": "approved",
        "approver_id": approver["id"],
        "decided_at": _now().isoformat(),
    }
    if notes:
        update["notes"] = notes

    res = supabase.table("gatepass_requests").update(update).eq("id", request_id).execute()
    updated = res.data[0]

    # Send notification
    notification_service.notify_approval(updated, approver.get("name", "Approver"))

    return updated


def reject_request(request_id: str, approver: dict, reason: str) -> dict:
    req = get_request(request_id)

    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject request in status: {req['status']}")

    requester = supabase.table("users").select("*").eq("id", req["requester_id"]).single().execute().data
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")

    can_decide(approver, requester)

    update = {
        "status": "rejected",
        "approver_id": approver["id"],
        "decided_at": _now().isoformat(),
        "rejection_reason": reason,
    }
    res = supabase.table("gatepass_requests").update(update).eq("id", request_id).execute()
    updated = res.data[0]

    # Send notification
    notification_service.notify_rejection(updated, reason, approver.get("name", "Approver"))

    return updated


def cancel_request(request_id: str, user: dict, notes: str | None = None) -> dict:
    req = get_request(request_id)

    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be cancelled")

    is_requester = req["requester_id"] == user["id"]
    is_approver_role = user["role"] in ("hr", "admin")

    if not (is_requester or is_approver_role):
        raise HTTPException(status_code=403, detail="Not allowed to cancel this request")

    update = {
        "status": "cancelled",
        "decided_at": _now().isoformat(),
    }
    if notes:
        update["notes"] = notes

    res = supabase.table("gatepass_requests").update(update).eq("id", request_id).execute()
    return res.data[0]


def expire_stale_requests() -> int:
    """Set status='expired' on all pending requests whose valid_until < now.

    Returns the count of expired records.
    """
    now = _now()

    # Fetch all pending requests (MockSupabase doesn't support server-side
    # datetime comparisons, so we filter in Python)
    res = supabase.table("gatepass_requests").select("id,valid_until").eq("status", "pending").execute()
    pending = res.data or []

    expired_ids = []
    for req in pending:
        valid_until = _parse_iso(req.get("valid_until"))
        if valid_until and valid_until < now:
            expired_ids.append(req["id"])

    if not expired_ids:
        return 0

    # Bulk-update each expired request (MockSupabase doesn't support IN-based
    # bulk update, so update one by one; real Supabase can use .in_)
    for req_id in expired_ids:
        supabase.table("gatepass_requests").update({"status": "expired"}).eq("id", req_id).execute()

    return len(expired_ids)

