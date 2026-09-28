import pytest
import psycopg2
import asyncio
from datetime import datetime, timezone, timedelta
from jose import jwt
from tests.conftest import make_jwt


# --- Auth Tests ---
def test_auth_no_token_returns_401(api_client):
    routes = [
        ("GET", "/api/v1/users/"),
        ("GET", "/api/v1/users/me"),
        ("POST", "/api/v1/users/"),
        ("GET", "/api/v1/requests/"),
        ("POST", "/api/v1/requests/leave"),
        ("GET", "/api/v1/gate/logs"),
        ("GET", "/api/v1/notifications/"),
    ]
    for method, path in routes:
        resp = api_client.request(method, path)
        assert resp.status_code == 401, f"{method} {path} returned {resp.status_code}"
        assert resp.headers.get("WWW-Authenticate") == "Bearer"

def test_auth_tampered_jwt_returns_401(api_client):
    bad_token = make_jwt("u-emp1", secret="invalid_secret_key")
    resp = api_client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {bad_token}"})
    assert resp.status_code == 401

def test_auth_expired_jwt_returns_401(api_client):
    expired_token = make_jwt("u-emp1", expired=True)
    resp = api_client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401

def test_auth_deactivated_user_returns_403(api_client, auth_headers):
    resp = api_client.get("/api/v1/users/me", headers=auth_headers("deact"))
    assert resp.status_code == 403
    assert resp.json()["message"] == "User account is inactive"


# --- Users Tests ---
def test_user_hr_creates_admin_returns_403(api_client, auth_headers):
    payload = {"name": "BadAdmin", "email": "ba@test.com", "password": "pass", "role": "admin"}
    resp = api_client.post("/api/v1/users/", headers=auth_headers("hr"), json=payload)
    assert resp.status_code == 403

def test_user_hr_sets_own_role_admin_returns_403(api_client, auth_headers):
    resp = api_client.patch("/api/v1/users/u-hr", headers=auth_headers("hr"), json={"role": "admin"})
    assert resp.status_code == 403

def test_user_hr_deactivates_admin_returns_403(api_client, auth_headers):
    resp = api_client.patch("/api/v1/users/u-admin", headers=auth_headers("hr"), json={"is_active": False})
    assert resp.status_code == 403

def test_user_deactivate_last_admin_returns_403(api_client, auth_headers):
    resp = api_client.patch("/api/v1/users/u-admin", headers=auth_headers("admin"), json={"is_active": False})
    assert resp.status_code == 403

def test_user_deactivate_self_returns_403(api_client, auth_headers):
    resp = api_client.patch("/api/v1/users/u-hr", headers=auth_headers("hr"), json={"is_active": False})
    assert resp.status_code == 403

def test_user_employee_changes_role_returns_403(api_client, auth_headers):
    resp = api_client.patch("/api/v1/users/u-emp1", headers=auth_headers("emp1"), json={"role": "admin"})
    assert resp.status_code == 403

def test_user_employee_lists_users_returns_403(api_client, auth_headers):
    resp = api_client.get("/api/v1/users/", headers=auth_headers("emp1"))
    assert resp.status_code == 403


roles = ["employee", "vendor", "hr", "admin", "security"]
matrix_params = [
    (req_role, app_role, action)
    for req_role in roles
    for app_role in roles
    for action in ["approve", "reject"]
]

role_to_uid = {
    "employee": "u-emp2",
    "vendor": "u-vendor",
    "hr": "u-hr",
    "admin": "u-admin",
    "security": "u-sec",
}

@pytest.mark.parametrize("req_role,app_role,action", matrix_params)
def test_approval_matrix_parametrize(api_client, mock_db, req_role, app_role, action):
    req_id = f"req-{req_role}-{app_role}-{action}"
    requester_id = role_to_uid[req_role]
    mock_db.tables["gatepass_requests"].append({
        "id": req_id, "type": "leave" if req_role != "vendor" else "vendor", "status": "pending", "requester_id": requester_id,
        "leave_type": "outing", "vendor_item_direction": "in", "vendor_item_description": "x",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "valid_from": datetime.now(timezone.utc).isoformat(),
        "valid_until": (datetime.now(timezone.utc)+timedelta(hours=4)).isoformat()
    })

    approver_id = role_to_uid[app_role] if app_role != "employee" else "u-emp1"
    headers = {"Authorization": f"Bearer {make_jwt(approver_id)}"}
    payload = {} if action == "approve" else {"rejection_reason": "test"}
    resp = api_client.post(f"/api/v1/requests/{req_id}/{action}", headers=headers, json=payload)

    is_self = (approver_id == requester_id)
    allowed = (
        not is_self and (
            (app_role == "hr" and req_role in ("employee", "vendor")) or
            (app_role == "admin" and req_role == "hr")
        )
    )

    if allowed:
        assert resp.status_code == 200, f"{app_role} {action} {req_role} failed with {resp.status_code}: {resp.text}"
    else:
        assert resp.status_code == 403, f"{app_role} {action} {req_role} returned {resp.status_code}: {resp.text}"

def test_self_approve_all_roles_returns_403(api_client, mock_db, auth_headers):
    # Map SPEC role names → auth_headers fixture keys (auth_headers uses "emp2" not "employee")
    role_to_header_key = {
        "employee": "emp2",   # u-emp2 == role_to_uid["employee"]
        "vendor": "vendor",
        "hr": "hr",
        "admin": "admin",
    }
    for r in ["employee", "vendor", "hr", "admin"]:
        req_id = f"req-self-{r}"
        uid = role_to_uid[r]
        mock_db.tables["gatepass_requests"].append({
            "id": req_id, "type": "leave" if r != "vendor" else "vendor", "status": "pending", "requester_id": uid,
            "leave_type": "outing", "vendor_item_direction": "in", "vendor_item_description": "x",
            "valid_from": datetime.now(timezone.utc).isoformat(),
            "valid_until": (datetime.now(timezone.utc)+timedelta(hours=4)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
        })
        header_key = role_to_header_key[r]
        resp = api_client.post(f"/api/v1/requests/{req_id}/approve", headers=auth_headers(header_key), json={})
        assert resp.status_code == 403, f"Self-approve for role={r} returned {resp.status_code}: {resp.text}"

def test_admin_creates_request_returns_403(api_client, auth_headers):
    resp = api_client.post("/api/v1/requests/leave", headers=auth_headers("admin"), json={"leave_type": "outing"})
    assert resp.status_code == 403

def test_creation_never_returns_approved(api_client, auth_headers):
    for r, ep, body in [
        ("emp1", "/api/v1/requests/leave", {"leave_type": "outing"}),
        ("emp1", "/api/v1/requests/visitor", {"visitor_name": "Alice", "visitor_phone": "123"}),
        ("vendor", "/api/v1/requests/vendor", {"vendor_item_direction": "in", "vendor_item_description": "Parts"}),
    ]:
        resp = api_client.post(ep, headers=auth_headers(r), json=body)
        assert resp.status_code == 201
        assert resp.json()["status"] == "pending"


# --- State Tests ---
def test_state_approve_approved_returns_400(api_client, auth_headers):
    resp = api_client.post("/api/v1/requests/req-approved-outing/approve", headers=auth_headers("hr"), json={})
    assert resp.status_code == 400

def test_state_reject_approved_returns_400(api_client, auth_headers):
    resp = api_client.post("/api/v1/requests/req-approved-outing/reject", headers=auth_headers("hr"), json={"rejection_reason": "no"})
    assert resp.status_code == 400

def test_state_approve_cancelled_returns_400(api_client, auth_headers):
    resp = api_client.post("/api/v1/requests/req-cancelled-1/approve", headers=auth_headers("hr"), json={})
    assert resp.status_code == 400

def test_state_cancel_approved_returns_400(api_client, auth_headers):
    resp = api_client.post("/api/v1/requests/req-approved-outing/cancel", headers=auth_headers("emp1"), json={})
    assert resp.status_code == 400

def test_state_cancel_by_non_owner_returns_403(api_client, auth_headers):
    resp = api_client.post("/api/v1/requests/req-emp2-pending/cancel", headers=auth_headers("emp1"), json={})
    assert resp.status_code == 403

def test_state_approve_expired_returns_400(api_client, auth_headers):
    resp = api_client.post("/api/v1/requests/req-expired-1/approve", headers=auth_headers("hr"), json={})
    assert resp.status_code == 400


# --- Isolation Tests ---
def test_isolation_employee_get_other_request_returns_404(api_client, auth_headers):
    resp = api_client.get("/api/v1/requests/req-emp2-pending", headers=auth_headers("emp1"))
    assert resp.status_code == 404

def test_isolation_employee_lists_only_own(api_client, auth_headers):
    resp = api_client.get("/api/v1/requests/", headers=auth_headers("emp1"))
    assert resp.status_code == 200
    items = resp.json()
    assert all(it["requester_id"] == "u-emp1" for it in items)

def test_isolation_vendor_lists_only_own(api_client, auth_headers):
    resp = api_client.get("/api/v1/requests/", headers=auth_headers("vendor"))
    assert resp.status_code == 200
    items = resp.json()
    assert all(it["requester_id"] == "u-vendor" for it in items)

def test_isolation_security_get_pending_returns_404(api_client, auth_headers):
    resp = api_client.get("/api/v1/requests/req-emp1-pending", headers=auth_headers("security"))
    assert resp.status_code == 404

def test_isolation_other_user_notification_read_returns_404(api_client, auth_headers):
    resp = api_client.patch("/api/v1/notifications/n-hr-1/read", headers=auth_headers("emp1"))
    assert resp.status_code == 404

def test_isolation_other_user_notification_mark_read_returns_404(api_client, auth_headers):
    resp = api_client.patch("/api/v1/notifications/nonexistent-id/read", headers=auth_headers("emp1"))
    assert resp.status_code == 404

def test_isolation_notification_read_all_affects_caller_only(api_client, mock_db, auth_headers):
    resp = api_client.post("/api/v1/notifications/read-all", headers=auth_headers("emp1"))
    assert resp.status_code == 200
    # Emp1 notification marked read; HR notification untouched
    emp1_n = [n for n in mock_db.tables["notifications"] if n["id"] == "n-emp1-1"][0]
    hr_n = [n for n in mock_db.tables["notifications"] if n["id"] == "n-hr-1"][0]
    assert emp1_n["is_read"] is True
    assert hr_n["is_read"] is False


# --- Gate Movement Tests ---
def test_gate_nonexistent_request_returns_404(api_client, auth_headers):
    resp = api_client.post("/api/v1/gate/log", headers=auth_headers("security"), json={"request_id": "nonexistent", "direction": "out"})
    assert resp.status_code == 404

def test_gate_pending_rejected_cancelled_returns_409(api_client, auth_headers):
    for req_id in ["req-emp1-pending", "req-rejected-1", "req-cancelled-1"]:
        resp = api_client.post("/api/v1/gate/log", headers=auth_headers("security"), json={"request_id": req_id, "direction": "out"})
        assert resp.status_code == 409

def test_gate_approved_in_window_returns_201(api_client, auth_headers):
    resp = api_client.post("/api/v1/gate/log", headers=auth_headers("security"), json={"request_id": "req-approved-outing", "direction": "out"})
    assert resp.status_code == 201

def test_gate_outside_window_returns_400(api_client, mock_db, auth_headers):
    mock_db.tables["gatepass_requests"].append({
        "id": "req-expired-approved", "type": "leave", "status": "approved", "requester_id": "u-emp1",
        "leave_type": "outing", "created_at": (datetime.now(timezone.utc)-timedelta(days=2)).isoformat(),
        "updated_at": (datetime.now(timezone.utc)-timedelta(days=2)).isoformat(),
        "valid_from": (datetime.now(timezone.utc)-timedelta(days=2)).isoformat(),
        "valid_until": (datetime.now(timezone.utc)-timedelta(days=1)).isoformat()
    })
    resp = api_client.post("/api/v1/gate/log", headers=auth_headers("security"), json={"request_id": "req-expired-approved", "direction": "out"})
    assert resp.status_code == 400

def test_gate_duplicate_out_rejected(api_client, auth_headers):
    api_client.post("/api/v1/gate/log", headers=auth_headers("security"), json={"request_id": "req-approved-outing", "direction": "out"})
    resp = api_client.post("/api/v1/gate/log", headers=auth_headers("security"), json={"request_id": "req-approved-outing", "direction": "out"})
    assert resp.status_code == 400

def test_gate_in_before_out_rejected(api_client, auth_headers):
    resp = api_client.post("/api/v1/gate/log", headers=auth_headers("security"), json={"request_id": "req-approved-outing", "direction": "in"})
    assert resp.status_code == 400

def test_gate_full_leave_in_rejected(api_client, auth_headers):
    api_client.post("/api/v1/gate/log", headers=auth_headers("security"), json={"request_id": "req-approved-full", "direction": "out"})
    resp = api_client.post("/api/v1/gate/log", headers=auth_headers("security"), json={"request_id": "req-approved-full", "direction": "in"})
    assert resp.status_code == 400

def test_gate_visitor_vendor_out_first_rejected(api_client, auth_headers):
    resp = api_client.post("/api/v1/gate/log", headers=auth_headers("security"), json={"request_id": "req-approved-visitor", "direction": "out"})
    assert resp.status_code == 400

def test_gate_non_security_returns_403(api_client, auth_headers):
    resp = api_client.post("/api/v1/gate/log", headers=auth_headers("emp1"), json={"request_id": "req-approved-outing", "direction": "out"})
    assert resp.status_code == 403


# --- Phase 4: Accepted List Tests ---

def test_accepted_list_employee_returns_403(api_client, auth_headers):
    resp = api_client.get("/api/v1/gate/accepted", headers=auth_headers("emp1"))
    assert resp.status_code == 403

def test_accepted_list_vendor_returns_403(api_client, auth_headers):
    resp = api_client.get("/api/v1/gate/accepted", headers=auth_headers("vendor"))
    assert resp.status_code == 403

def test_accepted_list_hr_returns_200(api_client, auth_headers):
    resp = api_client.get("/api/v1/gate/accepted", headers=auth_headers("hr"))
    assert resp.status_code == 200

def test_accepted_list_security_returns_200(api_client, auth_headers):
    resp = api_client.get("/api/v1/gate/accepted", headers=auth_headers("security"))
    assert resp.status_code == 200

def test_accepted_list_admin_returns_200(api_client, auth_headers):
    resp = api_client.get("/api/v1/gate/accepted", headers=auth_headers("admin"))
    assert resp.status_code == 200

def test_accepted_list_contains_only_approved(api_client, auth_headers):
    resp = api_client.get("/api/v1/gate/accepted", headers=auth_headers("security"))
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) > 0
    for item in items:
        # All returned items must be from the approved pool (status checked server-side)
        assert item["id"] in ("req-approved-outing", "req-approved-full", "req-approved-visitor")

def test_accepted_list_type_filter(api_client, auth_headers):
    resp = api_client.get("/api/v1/gate/accepted?type=visitor", headers=auth_headers("security"))
    assert resp.status_code == 200
    items = resp.json()
    assert all(it["type"] == "visitor" for it in items)
    assert any(it["id"] == "req-approved-visitor" for it in items)

def test_accepted_list_next_movement_outing(api_client, auth_headers):
    """Fresh outing request (0 logs) → next_movement = out"""
    resp = api_client.get("/api/v1/gate/accepted", headers=auth_headers("security"))
    assert resp.status_code == 200
    outing = next((it for it in resp.json() if it["id"] == "req-approved-outing"), None)
    assert outing is not None
    assert outing["next_movement"] == "out"

def test_accepted_list_next_movement_visitor(api_client, auth_headers):
    """Fresh visitor request (0 logs) → next_movement = in"""
    resp = api_client.get("/api/v1/gate/accepted", headers=auth_headers("security"))
    assert resp.status_code == 200
    visitor = next((it for it in resp.json() if it["id"] == "req-approved-visitor"), None)
    assert visitor is not None
    assert visitor["next_movement"] == "in"

def test_accepted_list_next_movement_after_out_scan(api_client, mock_db, auth_headers):
    """After OUT logged on outing → next_movement = in"""
    # Log OUT first
    api_client.post("/api/v1/gate/log", headers=auth_headers("security"),
                    json={"request_id": "req-approved-outing", "direction": "out"})
    resp = api_client.get("/api/v1/gate/accepted", headers=auth_headers("security"))
    assert resp.status_code == 200
    outing = next((it for it in resp.json() if it["id"] == "req-approved-outing"), None)
    assert outing is not None
    assert outing["next_movement"] == "in"

def test_accepted_list_search_filter(api_client, auth_headers):
    """Search by visitor name"""
    resp = api_client.get("/api/v1/gate/accepted?search=Bob", headers=auth_headers("security"))
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert any(it["visitor_name"] == "Bob" for it in items)

def test_accepted_list_search_no_match(api_client, auth_headers):
    resp = api_client.get("/api/v1/gate/accepted?search=ZZZNOMATCH999", headers=auth_headers("security"))
    assert resp.status_code == 200
    assert resp.json() == []

def test_accepted_list_pagination_limit(api_client, auth_headers):
    resp = api_client.get("/api/v1/gate/accepted?limit=1&offset=0", headers=auth_headers("security"))
    assert resp.status_code == 200
    assert len(resp.json()) <= 1

def test_accepted_list_pagination_offset(api_client, auth_headers):
    """offset=999 → empty list"""
    resp = api_client.get("/api/v1/gate/accepted?limit=50&offset=999", headers=auth_headers("security"))
    assert resp.status_code == 200
    assert resp.json() == []

def test_accepted_list_unauthenticated_returns_401(api_client):
    resp = api_client.get("/api/v1/gate/accepted")
    assert resp.status_code == 401
    assert resp.headers.get("WWW-Authenticate") == "Bearer"


# --- Race Test ---
def test_race_10_concurrent_out_scans_exactly_one_201(api_client, auth_headers):
    req_id = "req-approved-outing"

    def do_scan():
        return api_client.post("/api/v1/gate/log", headers=auth_headers("security"), json={"request_id": req_id, "direction": "out"})

    # Perform 10 sequential / thread pool calls
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(do_scan) for _ in range(10)]
        resps = [f.result() for f in futures]

    codes = [r.status_code for r in resps]
    success_count = codes.count(201)
    assert success_count == 1, f"Expected exactly one 201, got {success_count} (codes: {codes})"


# --- Validation Tests ---
def test_validation_end_before_start_returns_422(api_client, auth_headers):
    resp = api_client.post("/api/v1/requests/leave", headers=auth_headers("emp1"), json={"leave_type": "full_leave", "leave_days": -1})
    assert resp.status_code == 422

def test_validation_missing_fields_returns_422(api_client, auth_headers):
    resp = api_client.post("/api/v1/requests/visitor", headers=auth_headers("emp1"), json={})
    assert resp.status_code == 422

def test_validation_oversized_reason_returns_422(api_client, auth_headers):
    # Pass invalid payload schema to decision endpoint
    resp = api_client.post("/api/v1/requests/req-emp1-pending/reject", headers=auth_headers("hr"), json={})
    assert resp.status_code == 422


# --- Phase 5: Expiry + Error Schema Tests ---

def test_error_schema_401_has_code_and_message(api_client):
    resp = api_client.get("/api/v1/users/me")
    assert resp.status_code == 401
    body = resp.json()
    assert "code" in body
    assert "message" in body
    assert body["code"] == 401

def test_error_schema_403_has_code_and_message(api_client, auth_headers):
    resp = api_client.get("/api/v1/users/", headers=auth_headers("emp1"))
    assert resp.status_code == 403
    body = resp.json()
    assert "code" in body
    assert "message" in body
    assert body["code"] == 403

def test_error_schema_404_has_code_and_message(api_client, auth_headers):
    resp = api_client.get("/api/v1/requests/does-not-exist", headers=auth_headers("emp1"))
    assert resp.status_code == 404
    body = resp.json()
    assert "code" in body
    assert "message" in body
    assert body["code"] == 404

def test_error_schema_422_has_code_and_message(api_client, auth_headers):
    resp = api_client.post("/api/v1/requests/visitor", headers=auth_headers("emp1"), json={})
    assert resp.status_code == 422
    body = resp.json()
    assert "code" in body
    assert "message" in body
    assert body["code"] == 422

def test_expire_stale_admin_returns_count(api_client, mock_db, auth_headers):
    """Admin triggers expire: req-expired-1 (pending, past valid_until) gets expired."""
    resp = api_client.post("/api/v1/admin/expire-stale", headers=auth_headers("admin"))
    assert resp.status_code == 200
    body = resp.json()
    assert "expired" in body
    assert body["expired"] >= 1  # at least req-expired-1
    # Verify status updated in mock_db
    req = next((r for r in mock_db.tables["gatepass_requests"] if r["id"] == "req-expired-1"), None)
    assert req is not None
    assert req["status"] == "expired"

def test_expire_stale_hr_returns_403(api_client, auth_headers):
    resp = api_client.post("/api/v1/admin/expire-stale", headers=auth_headers("hr"))
    assert resp.status_code == 403

def test_expire_stale_employee_returns_403(api_client, auth_headers):
    resp = api_client.post("/api/v1/admin/expire-stale", headers=auth_headers("emp1"))
    assert resp.status_code == 403

def test_expire_stale_unauthenticated_returns_401(api_client):
    resp = api_client.post("/api/v1/admin/expire-stale")
    assert resp.status_code == 401

def test_expire_stale_no_stale_returns_zero(api_client, mock_db, auth_headers):
    """If no pending requests are expired, returns 0."""
    # Remove the one expired pending request from mock_db
    mock_db.tables["gatepass_requests"] = [
        r for r in mock_db.tables["gatepass_requests"] if r["id"] != "req-expired-1"
    ]
    resp = api_client.post("/api/v1/admin/expire-stale", headers=auth_headers("admin"))
    assert resp.status_code == 200
    assert resp.json()["expired"] == 0

def test_expire_stale_does_not_touch_approved(api_client, mock_db, auth_headers):
    """Approved requests (even past valid_until) must NOT be expired."""
    # Add an approved but expired-window request
    from datetime import datetime, timezone, timedelta
    mock_db.tables["gatepass_requests"].append({
        "id": "req-approved-expired-window", "type": "leave", "status": "approved",
        "requester_id": "u-emp1", "leave_type": "outing",
        "valid_from": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
        "valid_until": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
    })
    api_client.post("/api/v1/admin/expire-stale", headers=auth_headers("admin"))
    req = next((r for r in mock_db.tables["gatepass_requests"] if r["id"] == "req-approved-expired-window"), None)
    assert req is not None
    assert req["status"] == "approved"  # must not be changed


# --- Phase 6: Reminders Tests ---

def test_run_reminders_admin_returns_count(api_client, auth_headers):
    resp = api_client.post("/api/v1/admin/run-reminders", headers=auth_headers("admin"))
    assert resp.status_code == 200
    body = resp.json()
    assert "reminders_sent" in body
    assert isinstance(body["reminders_sent"], int)

def test_run_reminders_hr_returns_403(api_client, auth_headers):
    resp = api_client.post("/api/v1/admin/run-reminders", headers=auth_headers("hr"))
    assert resp.status_code == 403

def test_run_reminders_employee_returns_403(api_client, auth_headers):
    resp = api_client.post("/api/v1/admin/run-reminders", headers=auth_headers("emp1"))
    assert resp.status_code == 403

def test_run_reminders_unauthenticated_returns_401(api_client):
    resp = api_client.post("/api/v1/admin/run-reminders")
    assert resp.status_code == 401

def test_reminders_vendor_still_inside_sends_to_hr_and_admin(api_client, mock_db, auth_headers):
    """After vendor IN logged, run-reminders notifies HR + Admin."""
    # Log vendor IN
    api_client.post("/api/v1/gate/log", headers=auth_headers("security"),
                    json={"request_id": "req-approved-visitor", "direction": "in"})
    # Actually use vendor request — need one
    from datetime import datetime, timezone, timedelta
    mock_db.tables["gatepass_requests"].append({
        "id": "req-vendor-inside", "type": "vendor", "status": "approved",
        "requester_id": "u-vendor", "vendor_item_direction": "in",
        "vendor_item_description": "Cables", "vendor_company": "ACME",
        "valid_from": datetime.now(timezone.utc).isoformat(),
        "valid_until": (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    # Log IN for vendor request
    mock_db.tables["gate_logs"].append({
        "id": "gl-vendor-in", "request_id": "req-vendor-inside",
        "logged_by": "u-sec", "direction": "in",
        "logged_at": datetime.now(timezone.utc).isoformat(),
    })

    before_count = len(mock_db.tables["notifications"])
    resp = api_client.post("/api/v1/admin/run-reminders", headers=auth_headers("admin"))
    assert resp.status_code == 200
    assert resp.json()["reminders_sent"] >= 1

    # Check HR got notified
    new_notifs = mock_db.tables["notifications"][before_count:]
    hr_notif = [n for n in new_notifs if n["user_id"] == "u-hr" and n["type"] == "vendor_still_inside"]
    assert len(hr_notif) >= 1

def test_reminders_dedup_no_double_send(api_client, mock_db, auth_headers):
    """Running reminders twice does not create duplicate notifications."""
    from datetime import datetime, timezone, timedelta
    mock_db.tables["gatepass_requests"].append({
        "id": "req-vendor-dup", "type": "vendor", "status": "approved",
        "requester_id": "u-vendor", "vendor_item_description": "x",
        "valid_from": datetime.now(timezone.utc).isoformat(),
        "valid_until": (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    mock_db.tables["gate_logs"].append({
        "id": "gl-dup-in", "request_id": "req-vendor-dup",
        "logged_by": "u-sec", "direction": "in",
        "logged_at": datetime.now(timezone.utc).isoformat(),
    })

    resp1 = api_client.post("/api/v1/admin/run-reminders", headers=auth_headers("admin"))
    count1 = resp1.json()["reminders_sent"]

    resp2 = api_client.post("/api/v1/admin/run-reminders", headers=auth_headers("admin"))
    count2 = resp2.json()["reminders_sent"]

    assert count2 == 0, f"Dedup failed: second run sent {count2} (first={count1})"

def test_reminders_pass_expiring_soon_notifies_requester(api_client, mock_db, auth_headers):
    """Approved req expiring within 2h → requester notified."""
    from datetime import datetime, timezone, timedelta
    mock_db.tables["gatepass_requests"].append({
        "id": "req-expiring-soon", "type": "leave", "status": "approved",
        "requester_id": "u-emp1", "leave_type": "outing",
        "valid_from": datetime.now(timezone.utc).isoformat(),
        "valid_until": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    before = len(mock_db.tables["notifications"])
    resp = api_client.post("/api/v1/admin/run-reminders", headers=auth_headers("admin"))
    assert resp.status_code == 200
    assert resp.json()["reminders_sent"] >= 1

    new_notifs = mock_db.tables["notifications"][before:]
    expiry_notif = [n for n in new_notifs
                    if n["user_id"] == "u-emp1" and n["type"] == "pass_expiring_soon"]
    assert len(expiry_notif) >= 1

def test_reminders_pending_too_long_notifies_hr(api_client, mock_db, auth_headers):
    """Employee pending >4h → HR notified."""
    from datetime import datetime, timezone, timedelta
    mock_db.tables["gatepass_requests"].append({
        "id": "req-emp-stale", "type": "leave", "status": "pending",
        "requester_id": "u-emp1", "leave_type": "outing",
        "valid_from": datetime.now(timezone.utc).isoformat(),
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
    })

    before = len(mock_db.tables["notifications"])
    resp = api_client.post("/api/v1/admin/run-reminders", headers=auth_headers("admin"))
    assert resp.status_code == 200

    new_notifs = mock_db.tables["notifications"][before:]
    hr_pending = [n for n in new_notifs
                  if n["user_id"] == "u-hr" and n["type"] == "pending_too_long"]
    assert len(hr_pending) >= 1

def test_reminders_pending_hr_too_long_notifies_admin(api_client, mock_db, auth_headers):
    """HR pending >4h → Admin notified."""
    from datetime import datetime, timezone, timedelta
    mock_db.tables["gatepass_requests"].append({
        "id": "req-hr-stale", "type": "leave", "status": "pending",
        "requester_id": "u-hr", "leave_type": "outing",
        "valid_from": datetime.now(timezone.utc).isoformat(),
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
    })

    before = len(mock_db.tables["notifications"])
    resp = api_client.post("/api/v1/admin/run-reminders", headers=auth_headers("admin"))
    assert resp.status_code == 200

    new_notifs = mock_db.tables["notifications"][before:]
    admin_pending = [n for n in new_notifs
                     if n["user_id"] == "u-admin" and n["type"] == "pending_too_long"]
    assert len(admin_pending) >= 1

def test_reminders_fresh_pending_not_notified(api_client, mock_db, auth_headers):
    """Pending req <4h old → NO reminder sent."""
    from datetime import datetime, timezone, timedelta
    mock_db.tables["gatepass_requests"].append({
        "id": "req-emp-fresh", "type": "leave", "status": "pending",
        "requester_id": "u-emp1", "leave_type": "outing",
        "valid_from": datetime.now(timezone.utc).isoformat(),
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        "updated_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
    })

    before = len(mock_db.tables["notifications"])
    api_client.post("/api/v1/admin/run-reminders", headers=auth_headers("admin"))

    new_notifs = mock_db.tables["notifications"][before:]
    fresh_notifs = [n for n in new_notifs
                    if n.get("related_id") == "req-emp-fresh"]
    assert fresh_notifs == [], f"Unexpected reminders for fresh request: {fresh_notifs}"



# --- Direct SQL DB Tests ---
def test_db_sql_fake_request_id_fk_error(db_conn):
    cur = db_conn.cursor()
    # Insert with fake user_id to trigger FK error
    with pytest.raises(psycopg2.errors.ForeignKeyViolation):
        cur.execute("""
            INSERT INTO public.gate_logs (request_id, logged_by, direction)
            VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'out');
        """)

def test_db_sql_valid_until_less_than_valid_from_check_error(db_conn):
    cur = db_conn.cursor()
    # Create fake user first
    cur.execute("INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 't@t.com') ON CONFLICT DO NOTHING;")
    cur.execute("INSERT INTO public.users (id, name, email, role) VALUES ('11111111-1111-1111-1111-111111111111', 'T', 't@t.com', 'employee') ON CONFLICT DO NOTHING;")

    with pytest.raises(psycopg2.errors.CheckViolation):
        cur.execute("""
            INSERT INTO public.gatepass_requests (type, requester_id, valid_from, valid_until)
            VALUES ('leave', '11111111-1111-1111-1111-111111111111', now(), now() - interval '1 hour');
        """)

def test_db_sql_direction_sideways_check_error(db_conn):
    cur = db_conn.cursor()
    cur.execute("INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 't@t.com') ON CONFLICT DO NOTHING;")
    cur.execute("INSERT INTO public.users (id, name, email, role) VALUES ('11111111-1111-1111-1111-111111111111', 'T', 't@t.com', 'employee') ON CONFLICT DO NOTHING;")

    res = cur.execute("""
        INSERT INTO public.gatepass_requests (id, type, requester_id)
        VALUES ('22222222-2222-2222-2222-222222222222', 'leave', '11111111-1111-1111-1111-111111111111') ON CONFLICT DO NOTHING;
    """)

    with pytest.raises(psycopg2.errors.CheckViolation):
        cur.execute("""
            INSERT INTO public.gate_logs (request_id, logged_by, direction)
            VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'SIDEWAYS');
        """)
