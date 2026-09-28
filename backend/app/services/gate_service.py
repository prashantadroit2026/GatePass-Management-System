from app.db import supabase
from fastapi import HTTPException


def log_gate_movement(security_user: dict, data: dict) -> dict:
    payload = {
        "request_id": data["request_id"],
        "logged_by": security_user["id"],
        "direction": data["direction"],
        "notes": data.get("notes"),
    }

    try:
        res = supabase.table("gate_logs").insert(payload).execute()
    except Exception as e:
        # DB trigger will raise if not approved
        raise HTTPException(status_code=400, detail=str(e))

    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to log gate movement")

    log = res.data[0]

    # If direction is "in" and it's a vendor → notify relevant people
    if data["direction"] == "in":
        _notify_vendor_coming(data["request_id"])

    return log


def list_gate_logs(request_id: str | None = None) -> list[dict]:
    query = supabase.table("gate_logs").select("*").order("logged_at", desc=True)
    if request_id:
        query = query.eq("request_id", request_id)
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
