# Simple TypedDict / dataclass style model (we use Supabase, not SQLAlchemy)
from typing import TypedDict
from datetime import datetime


class User(TypedDict):
    id: str
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
