from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.db import supabase
from app.config import settings
from app.core.rbac import has_permission, Permission, Role
from typing import Annotated

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Validate Supabase JWT and return the user row from public.users
    """
    token = credentials.credentials

    try:
        # Supabase JWTs are signed with the JWT secret (found in Project Settings → API)
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch full user profile
    response = supabase.table("users").select("*").eq("id", user_id).single().execute()
    user = response.data

    if not user:
        raise HTTPException(status_code=401, detail="User not found in public.users")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="User account is inactive")

    return user


def require_permission(permission: Permission):
    """Dependency factory for permission checks"""
    async def checker(current_user: dict = Depends(get_current_user)):
        if not has_permission(current_user["role"], permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user['role']}' cannot perform '{permission.value}'"
            )
        return current_user
    return checker


# Convenient typed dependency
CurrentUser = Annotated[dict, Depends(get_current_user)]
