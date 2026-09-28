from enum import Enum
from typing import Set


class Role(str, Enum):
    EMPLOYEE = "employee"
    VENDOR = "vendor"
    HR = "hr"
    ADMIN = "admin"
    SECURITY = "security"


class Permission(str, Enum):
    CREATE_LEAVE_REQUEST = "create_leave_request"
    CREATE_VISITOR_REQUEST = "create_visitor_request"
    CREATE_VENDOR_ENTRY_REQUEST = "create_vendor_entry_request"
    APPROVE_REJECT_REQUEST = "approve_reject_request"
    CANCEL_REQUEST = "cancel_request"
    MANAGE_USER_ACCOUNTS = "manage_user_accounts"
    VIEW_ACCEPTED_LIST = "view_accepted_list"
    LOG_GATE_MOVEMENT = "log_gate_movement"
    VIEW_ALL_REQUESTS = "view_all_requests"


# Permission matrix
ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {
    Role.EMPLOYEE: {
        Permission.CREATE_LEAVE_REQUEST,
        Permission.CREATE_VISITOR_REQUEST,
        Permission.CANCEL_REQUEST,  # own pending
    },
    Role.VENDOR: {
        Permission.CREATE_VENDOR_ENTRY_REQUEST,
        Permission.CANCEL_REQUEST,
    },
    Role.HR: {
        Permission.CREATE_LEAVE_REQUEST,
        Permission.CREATE_VISITOR_REQUEST,
        Permission.APPROVE_REJECT_REQUEST,  # Employee / Vendor / Visitor
        Permission.CANCEL_REQUEST,
        Permission.MANAGE_USER_ACCOUNTS,
        Permission.VIEW_ACCEPTED_LIST,
        Permission.VIEW_ALL_REQUESTS,  # except Admin requests
    },
    Role.ADMIN: {
        Permission.APPROVE_REJECT_REQUEST,  # HR only
        Permission.CANCEL_REQUEST,
        Permission.MANAGE_USER_ACCOUNTS,
        Permission.VIEW_ACCEPTED_LIST,
        Permission.VIEW_ALL_REQUESTS,  # full
    },
    Role.SECURITY: {
        Permission.VIEW_ACCEPTED_LIST,
        Permission.LOG_GATE_MOVEMENT,
    },
}


def has_permission(role: str | Role, permission: Permission) -> bool:
    try:
        role_enum = Role(role) if isinstance(role, str) else role
        return permission in ROLE_PERMISSIONS.get(role_enum, set())
    except ValueError:
        return False
