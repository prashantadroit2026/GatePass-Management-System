from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class GateDirection(str, Enum):
    IN = "in"
    OUT = "out"


class GateLogCreate(BaseModel):
    request_id: str
    direction: GateDirection
    notes: Optional[str] = None


class GateLogOut(BaseModel):
    id: str
    request_id: str
    logged_by: str
    direction: GateDirection
    logged_at: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class AcceptedItem(BaseModel):
    """Approved gatepass summary for the accepted-list view."""
    id: str
    type: str
    requester_id: str
    requester_name: Optional[str] = None
    leave_type: Optional[str] = None
    visitor_name: Optional[str] = None
    vendor_company: Optional[str] = None
    vendor_item_description: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    next_movement: Optional[Literal["in", "out"]] = None  # expected next direction

    class Config:
        from_attributes = True
