from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from pydantic import BaseModel, EmailStr
from typing import Optional

from database import Base # Import Base from database.py

# SQLAlchemy model
class LawyerDB(Base):
    __tablename__ = "lawyers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)  # Comprimento 100
    oab = Column(String(20), unique=True, index=True) # Comprimento 20
    email = Column(String(100), unique=True, index=True) # Comprimento 100
    telegram_id = Column(String(50), nullable=True) # Comprimento 50

    processes = relationship("LegalProcessDB", back_populates="lawyer")

# Pydantic models for request/response validation
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
        from_attributes = True # Changed from orm_mode = True for Pydantic v2
