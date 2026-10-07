from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class RequestType(str, Enum):
    LEAVE = "leave"
    VISITOR = "visitor"
    VENDOR = "vendor"


class RequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ItemDirection(str, Enum):
    IN = "in"
    OUT = "out"


# ---------- Create schemas ----------
class LeaveCreate(BaseModel):
    leave_type: Literal["outing", "full_leave", "half_time", "full_time"]
    leave_days: Optional[int] = Field(None, ge=1)
    leave_reason: Optional[str] = None
    notes: Optional[str] = None


class VisitorCreate(BaseModel):
    visitor_name: str
    visitor_phone: str
    visitor_purpose: Optional[str] = None
    notes: Optional[str] = None


class VendorCreate(BaseModel):
    vendor_item_direction: Optional[ItemDirection] = ItemDirection.IN
    vendor_item_description: Optional[str] = None
    vendor_company: Optional[str] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    arrival_date: Optional[str] = None
    time_slot: Optional[str] = None
    host_name: Optional[str] = None
    vehicle_number: Optional[str] = None
    purpose: Optional[str] = None


# ---------- Decision schemas ----------
class ApproveRequest(BaseModel):
    notes: Optional[str] = None


class RejectRequest(BaseModel):
    rejection_reason: str


class CancelRequest(BaseModel):
    notes: Optional[str] = None


# ---------- Output ----------
class RequestOut(BaseModel):
    id: str
    type: RequestType
    status: RequestStatus
    requester_id: Optional[str] = None
    approver_id: Optional[str] = None
    decided_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None

    # Leave
    leave_type: Optional[str] = None
    leave_days: Optional[int] = None
    leave_reason: Optional[str] = None

    # Visitor
    visitor_name: Optional[str] = None
    visitor_phone: Optional[str] = None
    visitor_purpose: Optional[str] = None

    # Vendor
    vendor_item_direction: Optional[ItemDirection] = None
    vendor_item_description: Optional[str] = None
    vendor_company: Optional[str] = None

    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
