import base64
import json
import jwt
from jwt.exceptions import PyJWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db import supabase
from app.config import settings
from app.core.rbac import has_permission, Permission, Role
from typing import Annotated

security = HTTPBearer(auto_error=False)

_jwk_client: jwt.PyJWKClient | None = None


def get_jwk_client() -> jwt.PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwk_client = jwt.PyJWKClient(jwks_url)
    return _jwk_client


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security)
) -> dict:
    """
    Validate Supabase JWT and return the user row from public.users
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        header_b64 = token.split(".")[0]
        padded_b64 = header_b64 + "=" * (-len(header_b64) % 4)
        header = json.loads(base64.urlsafe_b64decode(padded_b64).decode("utf-8"))
        alg = header.get("alg", "HS256")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if alg not in ("RS256", "ES256", "HS256"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        if alg == "HS256":
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            jwk_client = get_jwk_client()
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256", "HS256"],
                audience="authenticated",
            )

        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch full user profile
    try:
        response = supabase.table("users").select("*").eq("id", user_id).single().execute()
        user = response.data
    except Exception:
        user = None

    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not found",
        )
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    return user


async def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    """Validate Supabase JWT if present; return None if unauthenticated or invalid"""
    if credentials is None or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


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

