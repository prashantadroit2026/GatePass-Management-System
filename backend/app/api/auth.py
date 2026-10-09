from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.db import db
from app.api.deps import CurrentUser
from app.core.security import create_access_token, verify_password
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    expires_in: int  # seconds
    user: UserOut


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest):
    """Sign in with email + password. Returns a JWT for the API and the user profile."""
    email = data.email.strip().lower()
    res = db.table("users").select("*").eq("email", email).single().execute()
    user = res.data

    if not user or not verify_password(data.password, user.get("password_hash")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    token = create_access_token(user["id"])
    from app.config import settings

    return {"token": token, "expires_in": settings.jwt_expire_minutes * 60, "user": user}


@router.get("/me", response_model=UserOut)
async def whoami(current_user: CurrentUser):
    """Return the currently authenticated user."""
    return current_user
