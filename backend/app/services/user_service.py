import uuid

from app.db import db
from app.schemas.user import UserCreate, UserUpdate
from app.core.rbac import Role
from app.core.security import hash_password
from fastapi import HTTPException, status


def create_user(data: UserCreate) -> dict:
    """Create a user in the users table with a hashed password."""
    email = data.email.strip().lower()
    role = data.role.value if isinstance(data.role, Role) else str(data.role)

    existing = db.table("users").select("id").eq("email", email).single().execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    user_id = str(uuid.uuid4())
    res = db.table("users").insert({
        "id": user_id,
        "name": data.name,
        "email": email,
        "password_hash": hash_password(data.password),
        "role": role,
    }).execute()

    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create user profile",
        )

    return res.data[0]


def get_user_by_id(user_id: str) -> dict | None:
    res = db.table("users").select("*").eq("id", user_id).single().execute()
    return res.data


def list_users() -> list[dict]:
    res = db.table("users").select("*").order("created_at", desc=True).execute()
    return res.data or []


def _count_active_admins(exclude_id: str | None = None) -> int:
    admins = (
        db.table("users").select("id").eq("role", "admin").eq("is_active", True).execute().data
        or []
    )
    if exclude_id:
        admins = [a for a in admins if a["id"] != exclude_id]
    return len(admins)


def update_user(user_id: str, data: UserUpdate, current_user: dict | None = None) -> dict:
    target_user = get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return target_user

    # Handle password update if included in UserUpdate
    new_password = update_data.pop("password", None)

    if current_user:
        curr_id = current_user["id"]
        curr_role = current_user["role"]

        # No one can deactivate themselves
        if "is_active" in update_data and update_data["is_active"] is False and curr_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot deactivate own account"
            )

        # HR cannot modify, deactivate, or change role of any admin
        if target_user["role"] == "admin" and curr_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HR cannot modify or deactivate Admin accounts"
            )

        # Only admin can create or promote to admin
        if "role" in update_data:
            role_val = update_data["role"].value if isinstance(update_data["role"], Role) else update_data["role"]
            if role_val == "admin" and curr_role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only Admin can assign Admin role"
                )

        # No one can deactivate or demote the last active admin
        if target_user["role"] == "admin":
            will_deactivate = "is_active" in update_data and update_data["is_active"] is False
            new_role = update_data.get("role")
            if isinstance(new_role, Role):
                new_role = new_role.value
            will_demote = new_role is not None and new_role != "admin"

            if will_deactivate or will_demote:
                if target_user.get("is_active", True) and _count_active_admins() <= 1:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Cannot deactivate or demote the last active admin"
                    )

        # HR cannot change password for Admin accounts
        if new_password and target_user["role"] == "admin" and curr_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HR cannot change password for Admin accounts"
            )

    if "role" in update_data and isinstance(update_data["role"], Role):
        update_data["role"] = update_data["role"].value

    if "email" in update_data:
        update_data["email"] = update_data["email"].strip().lower()

    if new_password:
        update_data["password_hash"] = hash_password(new_password)

    if not update_data:
        return target_user

    res = db.table("users").update(update_data).eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return res.data[0]


def update_user_password(user_id: str, password: str, current_user: dict | None = None) -> dict:
    target_user = get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user:
        if target_user["role"] == "admin" and current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HR cannot change password for Admin accounts"
            )

    res = db.table("users").update(
        {"password_hash": hash_password(password)}
    ).eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Password updated successfully"}


def delete_user(user_id: str, current_user: dict | None = None) -> dict:
    target_user = get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user:
        curr_id = current_user["id"]
        curr_role = current_user["role"]

        # Cannot delete own account
        if curr_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete your own account"
            )

        # HR cannot delete Admin accounts
        if target_user["role"] == "admin" and curr_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HR cannot delete Admin accounts"
            )

        # Cannot delete the last active admin
        if target_user["role"] == "admin":
            if _count_active_admins() <= 1:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot delete the last active admin"
                )

    db.table("users").delete().eq("id", user_id).execute()

    return {"message": "User deleted successfully"}
