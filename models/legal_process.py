from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from datetime import date
from typing import Optional

from database import Base # Import Base from database.py

# SQLAlchemy model
class LegalProcessDB(Base):
    __tablename__ = "legal_processes"

    id = Column(Integer, primary_key=True, index=True)
    process_number = Column(String(50), unique=True, index=True) # Comprimento 50
    entry_date = Column(Date)
    delivery_deadline = Column(Date)
    fatal_deadline = Column(Date)
    status = Column(String(30), default="ativo") # Comprimento 30
    action_type = Column(String(100), nullable=True) # Comprimento 100

    lawyer_id = Column(Integer, ForeignKey("lawyers.id"))
    client_id = Column(Integer, ForeignKey("clients.id"))

    lawyer = relationship("LawyerDB", back_populates="processes")
    client = relationship("ClientDB", back_populates="processes")

# Pydantic models for request/response validation
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
        from_attributes = True # Changed from orm_mode = True for Pydantic v2
