from sqlalchemy import Column, Integer, String, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from pydantic import BaseModel
import enum
# logging e field_validator removidos pois não são mais usados

from database import Base # Importa Base de database.py

# Define Enum para Área de Especialização
class AreaOfExpertiseEnum(str, enum.Enum):
    REGULATORIO = "Regulatório"
    CONTRATOS = "Contratos"
    AMBIENTAL = "Ambiental"
    TRIBUTARIO = "Tributário"
    LITIGIOS = "Litígios"

# Modelo SQLAlchemy
class ClientDB(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), index=True)  # Comprimento 150
    area_of_expertise = Column(SQLAlchemyEnum(AreaOfExpertiseEnum)) # Comprimento 100 (Nota: Enum não tem comprimento, o comentário pode ser resquício)

    processes = relationship("LegalProcessDB", back_populates="client")

# Modelos Pydantic para validação de requisição/resposta
class ClientBase(BaseModel):
    name: str
    area_of_expertise: AreaOfExpertiseEnum

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int

    class Config:
        from_attributes = True # Alterado de orm_mode = True para Pydantic v2
