from datetime import date
from typing import Optional

from pydantic import BaseModel


class LegalProcessBase(BaseModel):
    process_number: str
    lawyer_id: int
    client_id: int
    entry_date: date
    delivery_deadline: date
    fatal_deadline: date
    status: Optional[str] = "ativo"
    action_type: Optional[str] = None


class LegalProcessCreate(LegalProcessBase):
    pass


class LegalProcess(LegalProcessBase):
    id: int

    class Config:
        from_attributes = True
