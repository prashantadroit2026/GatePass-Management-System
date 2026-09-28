from pydantic import BaseModel
from typing import Optional
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
