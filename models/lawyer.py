from typing import Optional

from pydantic import BaseModel, EmailStr


class LawyerBase(BaseModel):
    name: str
    oab: str
    email: EmailStr
    telegram_id: Optional[str] = None


class LawyerCreate(LawyerBase):
    pass


class Lawyer(LawyerBase):
    id: int

    class Config:
        from_attributes = True
