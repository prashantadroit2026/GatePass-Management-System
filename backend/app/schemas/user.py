from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.core.rbac import Role


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Role = Role.EMPLOYEE


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[Role] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserPasswordUpdate(BaseModel):
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: Role
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
