import pytest
import psycopg2
from datetime import datetime, timezone, timedelta
from jose import jwt

# ---------------------------------------------------------------------------
# MockSupabase – in-memory stand-in for the Supabase client
# ---------------------------------------------------------------------------

class MockTable:
    def __init__(self, name, db):
        self.name = name
        self.db = db
        self._filters = []
        self._order = None
        self._limit = None
        self._single = False
        self._not_in = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, column, value):
        self._filters.append(('eq', column, value))
        return self

    def in_(self, column, values):
        self._filters.append(('in', column, values))
        return self

    def single(self):
        self._single = True
        return self

    def order(self, column, desc=False):
        self._order = (column, desc)
        return self

    def limit(self, count):
        self._limit = count
        return self

    @property
    def not_(self):
        class NotProxy:
            def __init__(self, parent):
                self.parent = parent
            def in_(self, column, values):
                self.parent._not_in = (column, values)
                return self.parent
        return NotProxy(self)

    def insert(self, record):
        self._insert_record = record
        return self

    def update(self, update_data):
        self._update_data = update_data
        return self

    def execute(self):
        table_data = self.db.tables[self.name]
        # Handle insert
        if hasattr(self, '_insert_record'):
            record = self._insert_record
            del self._insert_record
            if isinstance(record, list):
                inserted = []
                for r in record:
                    item = dict(r)
                    if "id" not in item:
                        item["id"] = f"{self.name}-{len(table_data)+1}"
                    if "created_at" not in item:
                        item["created_at"] = datetime.now(timezone.utc).isoformat()
                    if "updated_at" not in item:
                        item["updated_at"] = datetime.now(timezone.utc).isoformat()
                    if self.name == "gate_logs" and "logged_at" not in item:
                        item["logged_at"] = datetime.now(timezone.utc).isoformat()
                    table_data.append(item)
                    inserted.append(item)
                class Res:
                    data = inserted
                return Res()
            else:
                item = dict(record)
                if "id" not in item:
                    item["id"] = f"{self.name}-{len(table_data)+1}"
                if "created_at" not in item:
                    item["created_at"] = datetime.now(timezone.utc).isoformat()
                if "updated_at" not in item:
                    item["updated_at"] = datetime.now(timezone.utc).isoformat()
                if self.name == "gate_logs" and "logged_at" not in item:
                    item["logged_at"] = datetime.now(timezone.utc).isoformat()
                table_data.append(item)
                class Res:
                    data = [item]
                return Res()

        # Handle update
        if hasattr(self, '_update_data'):
            matched = []
            up = self._update_data
            del self._update_data
            for item in table_data:
                match = True
                for f in self._filters:
                    if f[0] == 'in':
                        if item.get(f[1]) not in f[2]:
                            match = False
                            break
                    elif f[0] == 'eq':
                        if str(item.get(f[1])) != str(f[2]):
                            match = False
                            break
                if match:
                    item.update(up)
                    item["updated_at"] = datetime.now(timezone.utc).isoformat()
                    matched.append(item)
            class Res:
                data = matched
            return Res()

        # Handle select
        matched = []
        for item in table_data:
            match = True
            for f in self._filters:
                if f[0] == 'in':
                    if item.get(f[1]) not in f[2]:
                        match = False
                        break
                elif f[0] == 'eq':
                    if str(item.get(f[1])) != str(f[2]):
                        match = False
                        break
            if self._not_in:
                col, vals = self._not_in
                if item.get(col) in vals:
                    match = False
            if match:
                matched.append(item)

        if self._single:
            class Res:
                data = matched[0] if matched else None
            return Res()

        class Res:
            data = matched
        return Res()


class MockAuthAdmin:
    def __init__(self, db):
        self.db = db
    def create_user(self, data):
        uid = f"user-{len(self.db.tables['users'])+1}"
        class AuthUser:
            id = uid
        class Res:
            user = AuthUser()
        return Res()
    def delete_user(self, user_id):
        pass


class MockAuth:
    def __init__(self, db):
        self.admin = MockAuthAdmin(db)


class MockSupabase:
    def __init__(self):
        self.tables = {
            "users": [],
            "gatepass_requests": [],
            "gate_logs": [],
            "notifications": [],
        }
        self.auth = MockAuth(self)

    def table(self, name):
        return MockTable(name, self)


# ---------------------------------------------------------------------------
# Patch app.db BEFORE importing the rest of the app.
# We use a sentinel instance here; the real per-test instance is set in
# setup_test_db fixture below.
# ---------------------------------------------------------------------------

_sentinel_db = MockSupabase()

import app.db as _db_module
_db_module.supabase = _sentinel_db

from app.main import app
from app.config import settings
from fastapi.testclient import TestClient
import app.services.user_service as _u_s
import app.services.request_service as _r_s
import app.services.gate_service as _g_s
import app.services.notification_service as _n_s
import app.api.deps as _deps_m

TEST_DB_DSN = "host=127.0.0.1 port=5433 dbname=gatepass_test user=prashant"


def _patch_all(instance):
    """Point every service module's supabase reference at `instance`."""
    _db_module.supabase = instance
    _u_s.supabase = instance
    _r_s.supabase = instance
    _g_s.supabase = instance
    _n_s.supabase = instance
    _deps_m.supabase = instance


def _build_fresh_db():
    now_iso = datetime.now(timezone.utc).isoformat()
    db = MockSupabase()
    db.tables = {
        "users": [
            {"id": "u-admin", "name": "Admin User", "email": "admin@test.com", "role": "admin", "is_active": True, "created_at": now_iso, "updated_at": now_iso},
            {"id": "u-hr", "name": "HR User", "email": "hr@test.com", "role": "hr", "is_active": True, "created_at": now_iso, "updated_at": now_iso},
            {"id": "u-emp1", "name": "Employee 1", "email": "emp1@test.com", "role": "employee", "is_active": True, "created_at": now_iso, "updated_at": now_iso},
            {"id": "u-emp2", "name": "Employee 2", "email": "emp2@test.com", "role": "employee", "is_active": True, "created_at": now_iso, "updated_at": now_iso},
            {"id": "u-vendor", "name": "Vendor User", "email": "vendor@test.com", "role": "vendor", "is_active": True, "created_at": now_iso, "updated_at": now_iso},
            {"id": "u-sec", "name": "Security User", "email": "security@test.com", "role": "security", "is_active": True, "created_at": now_iso, "updated_at": now_iso},
            {"id": "u-deact", "name": "Deactivated User", "email": "deact@test.com", "role": "employee", "is_active": False, "created_at": now_iso, "updated_at": now_iso},
        ],
        "gatepass_requests": [
            {
                "id": "req-emp1-pending", "type": "leave", "status": "pending", "requester_id": "u-emp1",
                "leave_type": "full_leave", "leave_days": 2, "created_at": now_iso, "updated_at": now_iso,
                "valid_from": now_iso, "valid_until": (datetime.now(timezone.utc)+timedelta(days=2)).isoformat()
            },
            {
                "id": "req-emp2-pending", "type": "leave", "status": "pending", "requester_id": "u-emp2",
                "leave_type": "full_leave", "leave_days": 1, "created_at": now_iso, "updated_at": now_iso,
                "valid_from": now_iso, "valid_until": (datetime.now(timezone.utc)+timedelta(days=1)).isoformat()
            },
            {
                "id": "req-hr-pending", "type": "leave", "status": "pending", "requester_id": "u-hr",
                "leave_type": "outing", "created_at": now_iso, "updated_at": now_iso,
                "valid_from": now_iso, "valid_until": (datetime.now(timezone.utc)+timedelta(hours=4)).isoformat()
            },
            {
                "id": "req-vendor-pending", "type": "vendor", "status": "pending", "requester_id": "u-vendor",
                "vendor_item_direction": "in", "vendor_item_description": "Cables", "created_at": now_iso, "updated_at": now_iso,
                "valid_from": now_iso, "valid_until": (datetime.now(timezone.utc)+timedelta(hours=8)).isoformat()
            },
            {
                "id": "req-admin-pending", "type": "leave", "status": "pending", "requester_id": "u-admin",
                "leave_type": "outing", "created_at": now_iso, "updated_at": now_iso,
                "valid_from": now_iso, "valid_until": (datetime.now(timezone.utc)+timedelta(hours=4)).isoformat()
            },
            {
                "id": "req-approved-outing", "type": "leave", "status": "approved", "requester_id": "u-emp1",
                "leave_type": "outing", "approver_id": "u-hr", "created_at": now_iso, "updated_at": now_iso,
                "valid_from": now_iso, "valid_until": (datetime.now(timezone.utc)+timedelta(hours=4)).isoformat()
            },
            {
                "id": "req-approved-full", "type": "leave", "status": "approved", "requester_id": "u-emp1",
                "leave_type": "full_leave", "leave_days": 1, "approver_id": "u-hr", "created_at": now_iso, "updated_at": now_iso,
                "valid_from": now_iso, "valid_until": (datetime.now(timezone.utc)+timedelta(days=1)).isoformat()
            },
            {
                "id": "req-approved-visitor", "type": "visitor", "status": "approved", "requester_id": "u-emp1",
                "visitor_name": "Bob", "visitor_phone": "123", "approver_id": "u-hr", "created_at": now_iso, "updated_at": now_iso,
                "valid_from": now_iso, "valid_until": (datetime.now(timezone.utc)+timedelta(hours=4)).isoformat()
            },
            {
                "id": "req-rejected-1", "type": "leave", "status": "rejected", "requester_id": "u-emp1",
                "leave_type": "outing", "approver_id": "u-hr", "created_at": now_iso, "updated_at": now_iso,
            },
            {
                "id": "req-cancelled-1", "type": "leave", "status": "cancelled", "requester_id": "u-emp1",
                "leave_type": "outing", "created_at": now_iso, "updated_at": now_iso,
            },
            {
                "id": "req-expired-1", "type": "leave", "status": "pending", "requester_id": "u-emp1",
                "leave_type": "outing", "created_at": (datetime.now(timezone.utc)-timedelta(days=2)).isoformat(),
                "updated_at": (datetime.now(timezone.utc)-timedelta(days=2)).isoformat(),
                "valid_from": (datetime.now(timezone.utc)-timedelta(days=2)).isoformat(),
                "valid_until": (datetime.now(timezone.utc)-timedelta(days=1)).isoformat()
            },
        ],
        "gate_logs": [],
        "notifications": [
            {"id": "n-hr-1", "user_id": "u-hr", "title": "Test HR", "message": "Msg", "type": "test", "is_read": False, "created_at": now_iso, "updated_at": now_iso},
            {"id": "n-emp1-1", "user_id": "u-emp1", "title": "Test Emp1", "message": "Msg", "type": "test", "is_read": False, "created_at": now_iso, "updated_at": now_iso},
        ],
    }
    return db


JWT_SECRET = settings.jwt_secret or "your-supabase-jwt-secret"


def make_jwt(user_id, expired=False, secret=JWT_SECRET):
    exp = datetime.now(timezone.utc) + (timedelta(hours=-1) if expired else timedelta(hours=2))
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db():
    """Return the active MockSupabase instance for this test.

    A fresh instance is created per test (in setup_test_db) and patched into
    all service modules. Tests should receive this fixture rather than
    importing mock_db at module level, to avoid stale-reference bugs.
    """
    return _r_s.supabase  # after setup_test_db runs, all modules point here


@pytest.fixture(autouse=True)
def setup_test_db():
    """Create a fresh MockSupabase, patch all services, populate data."""
    fresh = _build_fresh_db()
    _patch_all(fresh)
    yield fresh
    # No teardown needed; next test will replace.


@pytest.fixture
def api_client(setup_test_db):
    with TestClient(app) as client:
        yield client


@pytest.fixture
def auth_headers(setup_test_db):
    def _headers(role="emp1"):
        user_map = {
            "admin": "u-admin",
            "hr": "u-hr",
            "emp1": "u-emp1",
            "emp2": "u-emp2",
            "vendor": "u-vendor",
            "security": "u-sec",
            "deact": "u-deact",
        }
        uid = user_map.get(role, role)
        token = make_jwt(uid)
        return {"Authorization": f"Bearer {token}"}
    return _headers


@pytest.fixture
def db_conn():
    conn = psycopg2.connect(TEST_DB_DSN)
    conn.autocommit = True
    yield conn
    conn.close()


# ---------------------------------------------------------------------------
# Backward-compat helpers (used by legacy imports in test_verify.py)
# ---------------------------------------------------------------------------

def reset_mock_db():
    """Rebuild & patch fresh data. Called by tests that import this directly."""
    fresh = _build_fresh_db()
    _patch_all(fresh)
    return fresh


def patch_mock_db():
    """No-op kept for backward compat. Patching now happens in setup_test_db."""
    pass
