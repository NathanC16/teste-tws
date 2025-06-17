from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from pydantic import BaseModel

from database import Base # Import Base from database.py

# SQLAlchemy model
class ClientDB(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    area_of_expertise = Column(String)

    processes = relationship("LegalProcessDB", back_populates="client")

# Pydantic models for request/response validation
class ClientBase(BaseModel):
    name: str
    area_of_expertise: str

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int

    class Config:
        from_attributes = True # Changed from orm_mode = True for Pydantic v2
