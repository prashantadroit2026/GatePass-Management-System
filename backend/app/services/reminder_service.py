"""Reminder generation service.

Reminder rules (all use dedup key = (user_id, reminder_type, request_id)):

1. VENDOR_STILL_INSIDE  — vendor arrived (IN logged) but no OUT yet; notify HR+Admin
2. VISITOR_STILL_INSIDE — visitor arrived (IN logged) but no OUT yet; notify requester
3. PASS_EXPIRING_SOON   — approved request valid_until within next 2 hours; notify requester
4. PENDING_TOO_LONG     — pending request older than 4 hours; notify the approver
                          (HR → pending employee/vendor; Admin → pending HR)

Each generated reminder is inserted as a notification only if no un-read notification
with the same (user_id, type, related_id) already exists (deduplication).
"""

from datetime import datetime, timezone, timedelta
from app.db import db


_EXPIRY_WARN_WINDOW = timedelta(hours=2)
_PENDING_WARN_AFTER = timedelta(hours=4)


def _parse_iso(dt_str: str | None) -> datetime | None:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return None


def _dedup_key_exists(user_id: str, notif_type: str, related_id: str) -> bool:
    """Return True if an unread notification with this key already exists."""
    res = (
        db.table("notifications")
        .select("id")
        .eq("user_id", user_id)
        .eq("type", notif_type)
        .eq("related_id", related_id)
        .eq("is_read", False)
        .execute()
    )
    return bool(res.data)


def _send_reminder(user_id: str, title: str, message: str, notif_type: str, related_id: str):
    """Insert reminder only if no duplicate exists."""
    if _dedup_key_exists(user_id, notif_type, related_id):
        return False
    db.table("notifications").insert({
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "related_id": related_id,
        "is_read": False,
    }).execute()
    return True


def generate_reminders(now: datetime | None = None) -> int:
    """Run all reminder rules and return total count of new notifications sent.

    Rules:
    1. Vendor still inside  — vendor req approved, IN logged, no OUT yet
    2. Visitor still inside — visitor req approved, IN logged, no OUT yet
    3. Pass expiring soon   — approved req, valid_until within 2 h
    4. Pending too long     — pending req older than 4 h, notify responsible approver
    """
    if now is None:
        now = datetime.now(timezone.utc)

    total = 0

    # --- Fetch data once ---
    approved_res = (
        db.table("gatepass_requests").select("*").eq("status", "approved").execute()
    )
    approved = approved_res.data or []

    pending_res = (
        db.table("gatepass_requests").select("*").eq("status", "pending").execute()
    )
    pending = pending_res.data or []

    all_req_ids = [r["id"] for r in approved]
    logs_by_req: dict[str, list[dict]] = {}
    if all_req_ids:
        logs_res = (
            db.table("gate_logs")
            .select("request_id,direction")
            .in_("request_id", all_req_ids)
            .execute()
        )
        for log in (logs_res.data or []):
            rid = log["request_id"]
            logs_by_req.setdefault(rid, []).append(log)

    # Collect HR and Admin user IDs for rule 4
    hr_res = db.table("users").select("id").eq("role", "hr").execute()
    hr_ids = [u["id"] for u in (hr_res.data or [])]
    admin_res = db.table("users").select("id").eq("role", "admin").execute()
    admin_ids = [u["id"] for u in (admin_res.data or [])]

    # --- Rule 1 & 2: Vendor/Visitor still inside ---
    for req in approved:
        req_type = req.get("type")
        if req_type not in ("vendor", "visitor"):
            continue
        logs = logs_by_req.get(req["id"], [])
        directions = [lg["direction"] for lg in logs]
        # IN logged but not OUT yet = still inside
        if "in" in directions and "out" not in directions:
            if req_type == "vendor":
                # Notify HR + Admin
                for uid in hr_ids + admin_ids:
                    ok = _send_reminder(
                        user_id=uid,
                        title="Vendor Still Inside",
                        message=f"Vendor request {req['id']} — vendor has not exited yet.",
                        notif_type="vendor_still_inside",
                        related_id=req["id"],
                    )
                    if ok:
                        total += 1
            else:  # visitor
                # Notify requester (employee who raised it)
                if not req.get("requester_id"):
                    continue
                ok = _send_reminder(
                    user_id=req["requester_id"],
                    title="Visitor Still Inside",
                    message=f"Your visitor request {req['id']} — visitor has not exited yet.",
                    notif_type="visitor_still_inside",
                    related_id=req["id"],
                )
                if ok:
                    total += 1

    # --- Rule 3: Pass expiring soon (within 2 hours) ---
    warn_threshold = now + _EXPIRY_WARN_WINDOW
    for req in approved:
        valid_until = _parse_iso(req.get("valid_until"))
        if valid_until is None:
            continue
        if now < valid_until <= warn_threshold:
            if not req.get("requester_id"):
                continue
            ok = _send_reminder(
                user_id=req["requester_id"],
                title="Gatepass Expiring Soon",
                message=f"Your {req.get('type', 'gatepass')} request {req['id']} expires at {valid_until.isoformat()}.",
                notif_type="pass_expiring_soon",
                related_id=req["id"],
            )
            if ok:
                total += 1

    # --- Rule 4: Pending too long (> 4 hours) ---
    for req in pending:
        created_at = _parse_iso(req.get("created_at"))
        if created_at is None:
            continue
        if now - created_at < _PENDING_WARN_AFTER:
            continue

        if not req.get("requester_id"):
            continue
        req_type = req.get("type")
        requester_res = (
            db.table("users").select("role").eq("id", req["requester_id"]).single().execute()
        )
        requester = requester_res.data
        if not requester:
            continue
        requester_role = requester.get("role")

        # Determine who should act on this
        if requester_role in ("employee", "vendor"):
            notify_ids = hr_ids   # HR approves employee/vendor
        elif requester_role == "hr":
            notify_ids = admin_ids  # Admin approves HR
        else:
            continue  # security/admin don't submit requests that need approval

        for uid in notify_ids:
            ok = _send_reminder(
                user_id=uid,
                title="Request Pending Too Long",
                message=(
                    f"Request {req['id']} (type={req_type}, role={requester_role}) "
                    f"has been pending for over 4 hours."
                ),
                notif_type="pending_too_long",
                related_id=req["id"],
            )
            if ok:
                total += 1

    return total
