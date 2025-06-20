from sqlalchemy import Column, Integer, String, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from pydantic import BaseModel
import enum

from database import Base # Import Base from database.py

# Define Enum for Area of Expertise
class AreaOfExpertiseEnum(str, enum.Enum):
    REGULATORIO = "Regulatório"
    CONTRATOS = "Contratos"
    AMBIENTAL = "Ambiental"
    TRIBUTARIO = "Tributário"
    LITIGIOS = "Litígios"

# SQLAlchemy model
class ClientDB(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), index=True)  # Comprimento 150
    area_of_expertise = Column(SQLAlchemyEnum(AreaOfExpertiseEnum)) # Comprimento 100

    processes = relationship("LegalProcessDB", back_populates="client")

# Pydantic models for request/response validation
class ClientBase(BaseModel):
    name: str
    area_of_expertise: AreaOfExpertiseEnum

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int

    class Config:
        from_attributes = True # Changed from orm_mode = True for Pydantic v2
