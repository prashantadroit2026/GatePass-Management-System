from app.db import supabase
from app.schemas.user import UserCreate, UserUpdate
from app.core.rbac import Role
from fastapi import HTTPException, status


def create_user(data: UserCreate) -> dict:
    """Create user in Supabase Auth + public.users table"""
    # 1. Create in Auth
    auth_response = supabase.auth.admin.create_user({
        "email": data.email,
        "password": data.password,
        "email_confirm": True,  # auto-confirm for now
    })

    if auth_response.user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create auth user"
        )

    user_id = auth_response.user.id

    # 2. Insert into public.users
    db_response = supabase.table("users").insert({
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "role": data.role.value if isinstance(data.role, Role) else data.role,
    }).execute()

    if not db_response.data:
        # rollback auth user if public insert fails
        supabase.auth.admin.delete_user(user_id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create user profile"
        )

    return db_response.data[0]


def get_user_by_id(user_id: str) -> dict | None:
    response = supabase.table("users").select("*").eq("id", user_id).single().execute()
    return response.data


def list_users() -> list[dict]:
    response = supabase.table("users").select("*").order("created_at", desc=True).execute()
    return response.data or []


def update_user(user_id: str, data: UserUpdate, current_user: dict | None = None) -> dict:
    target_user = get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return target_user

    # Handle password update if included in UserUpdate
    new_password = update_data.pop("password", None)
    if new_password:
        if current_user:
            if target_user["role"] == "admin" and current_user["role"] != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="HR cannot change password for Admin accounts"
                )
        supabase.auth.admin.update_user_by_id(user_id, {"password": new_password})

    # If only password was updated and nothing else
    if not update_data:
        return target_user

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
                admins_res = supabase.table("users").select("*").eq("role", "admin").eq("is_active", True).execute()
                active_admins = admins_res.data or []
                if len(active_admins) <= 1 and any(a["id"] == user_id for a in active_admins):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Cannot deactivate or demote the last active admin"
                    )

    if "role" in update_data and isinstance(update_data["role"], Role):
        update_data["role"] = update_data["role"].value

    # If email is updated, also update in Supabase Auth
    if "email" in update_data:
        try:
            supabase.auth.admin.update_user_by_id(user_id, {
                "email": update_data["email"],
                "email_confirm": True
            })
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to update email in auth: {str(e)}"
            )

    response = supabase.table("users").update(update_data).eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
    return response.data[0]


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

    try:
        supabase.auth.admin.update_user_by_id(user_id, {"password": password})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update password: {str(e)}"
        )

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
            admins_res = supabase.table("users").select("*").eq("role", "admin").eq("is_active", True).execute()
            active_admins = admins_res.data or []
            if len(active_admins) <= 1 and any(a["id"] == user_id for a in active_admins):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot delete the last active admin"
                )

    # 1. Delete from public.users table
    supabase.table("users").delete().eq("id", user_id).execute()

    # 2. Delete from Supabase Auth
    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception:
        pass  # ignore if already gone in auth

    return {"message": "User deleted successfully"}
