from datetime import datetime, timezone
from app.db import supabase
from fastapi import HTTPException, status


def _parse_iso(dt_str: str | None) -> datetime | None:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return None


def log_gate_movement(security_user: dict, data: dict) -> dict:
    request_id = data["request_id"]
    direction = data["direction"]
    notes = data.get("notes")

    # 1. Fetch request
    req_res = supabase.table("gatepass_requests").select("*").eq("id", request_id).single().execute()
    if not req_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gatepass request not found")
    req = req_res.data

    # 2. Reject if status is not approved
    if req["status"] != "approved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot log movement for request in '{req['status']}' status (must be 'approved')"
        )

    # 3. Check validity window
    now = datetime.now(timezone.utc)
    valid_from = _parse_iso(req.get("valid_from"))
    valid_until = _parse_iso(req.get("valid_until"))

    if valid_from and now < valid_from:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gatepass is not valid yet")
    if valid_until and now > valid_until:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gatepass validity has expired")

    # 4. Fetch existing logs to determine sequence
    logs_res = supabase.table("gate_logs").select("*").eq("request_id", request_id).order("logged_at", desc=False).execute()
    existing_logs = logs_res.data or []
    log_count = len(existing_logs)

    req_type = req.get("type")
    leave_type = req.get("leave_type")

    # Movement flow per type:
    # Leave outing: OUT then IN (max 2)
    # Leave full_leave: OUT only (max 1)
    # Visitor: IN then OUT (max 2)
    # Vendor: IN then OUT (max 2)
    if req_type == "leave":
        if leave_type == "full_leave":
            if log_count >= 1:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full leave gatepass already used (OUT completed)")
            if direction != "out":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full leave pass requires OUT movement")
        else:
            if log_count == 0:
                if direction != "out":
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Outing pass requires OUT movement first")
            elif log_count == 1:
                if direction != "in":
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Outing pass already logged OUT; next movement must be IN")
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Outing pass is already completed (both OUT and IN logged)")
    elif req_type in ("visitor", "vendor"):
        if log_count == 0:
            if direction != "in":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{req_type.capitalize()} pass requires IN movement first")
        elif log_count == 1:
            if direction != "out":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{req_type.capitalize()} pass already logged IN; next movement must be OUT")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{req_type.capitalize()} pass is already completed (both IN and OUT logged)")

    # 5. Insert gate log
    payload = {
        "request_id": request_id,
        "logged_by": security_user["id"],
        "direction": direction,
        "notes": notes,
    }

    res = supabase.table("gate_logs").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to log gate movement")

    log = res.data[0]

    # Notify if vendor arrives
    if direction == "in" and req_type == "vendor":
        _notify_vendor_coming(request_id)

    return log


def list_gate_logs(request_id: str | None = None, current_user: dict | None = None) -> list[dict]:
    if current_user and request_id:
        from app.services.request_service import get_request
        # This will raise 404 if current_user has no right to see this request
        get_request(request_id, current_user)

    query = supabase.table("gate_logs").select("*").order("logged_at", desc=True)
    if request_id:
        query = query.eq("request_id", request_id)
    elif current_user and current_user["role"] in ("employee", "vendor"):
        # If no specific request_id, filter to own requests for regular users
        own_reqs = supabase.table("gatepass_requests").select("id").eq("requester_id", current_user["id"]).execute()
        req_ids = [r["id"] for r in (own_reqs.data or [])]
        if not req_ids:
            return []
        query = query.in_("request_id", req_ids)

    res = query.execute()
    return res.data or []


def _notify_vendor_coming(request_id: str):
    """Create notification when vendor enters"""
    req = supabase.table("gatepass_requests").select("*").eq("id", request_id).single().execute().data
    if not req or req["type"] != "vendor":
        return

    # Notify HR and Admin
    users = supabase.table("users").select("id").in_("role", ["hr", "admin"]).execute().data or []
    for u in users:
        supabase.table("notifications").insert({
            "user_id": u["id"],
            "title": "Vendor Arrived",
            "message": f"Vendor has entered the gate. Item: {req.get('vendor_item_description', 'N/A')}",
            "type": "vendor_coming",
            "related_id": request_id,
        }).execute()


def _next_movement(req_type: str, leave_type: str | None, log_count: int) -> str | None:
    """Return the expected next gate direction for an approved request."""
    if req_type == "leave":
        if leave_type == "full_leave":
            return None if log_count >= 1 else "out"
        else:  # outing
            if log_count == 0:
                return "out"
            elif log_count == 1:
                return "in"
            else:
                return None  # completed
    elif req_type in ("visitor", "vendor"):
        if log_count == 0:
            return "in"
        elif log_count == 1:
            return "out"
        else:
            return None  # completed
    return None


def get_accepted_list(
    req_type: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Return approved gatepass requests with next expected movement.

    Filters:
    - type: leave | visitor | vendor
    - search: case-insensitive substring match on requester name, visitor name,
              vendor company, or vendor item description

    Each item gets a `next_movement` field: "in" | "out" | None (completed).
    """
    query = supabase.table("gatepass_requests").select("*").eq("status", "approved").order("valid_until", desc=False)
    if req_type:
        query = query.eq("type", req_type)

    res = query.execute()
    requests = res.data or []

    # Resolve requester names in one pass
    user_ids = list({r["requester_id"] for r in requests if r.get("requester_id")})
    users_map: dict[str, str] = {}
    if user_ids:
        users_res = supabase.table("users").select("id,name").in_("id", user_ids).execute()
        users_map = {u["id"]: u["name"] for u in (users_res.data or [])}

    # Fetch all gate_logs for these requests at once
    req_ids = [r["id"] for r in requests]
    logs_by_req: dict[str, int] = {}
    if req_ids:
        logs_res = supabase.table("gate_logs").select("request_id").in_("request_id", req_ids).execute()
        for log in (logs_res.data or []):
            rid = log["request_id"]
            logs_by_req[rid] = logs_by_req.get(rid, 0) + 1

    result = []
    for req in requests:
        req_name = users_map.get(req["requester_id"], "")
        nxt = _next_movement(req.get("type", ""), req.get("leave_type"), logs_by_req.get(req["id"], 0))

        # Search filter (post-fetch since MockSupabase lacks ILIKE)
        if search:
            s = search.lower()
            haystack = " ".join(filter(None, [
                req_name,
                req.get("visitor_name", ""),
                req.get("vendor_company", ""),
                req.get("vendor_item_description", ""),
            ])).lower()
            if s not in haystack:
                continue

        result.append({
            "id": req["id"],
            "type": req.get("type"),
            "requester_id": req["requester_id"],
            "requester_name": req_name or None,
            "leave_type": req.get("leave_type"),
            "visitor_name": req.get("visitor_name"),
            "vendor_company": req.get("vendor_company"),
            "vendor_item_description": req.get("vendor_item_description"),
            "valid_from": req.get("valid_from"),
            "valid_until": req.get("valid_until"),
            "next_movement": nxt,
        })

    # Pagination
    return result[offset: offset + limit]

