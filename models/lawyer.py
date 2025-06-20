from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from pydantic import BaseModel, EmailStr, field_validator # Adicionar field_validator
from typing import Optional
import re # Importar re para regex
import logging # Adicionar import de logging

from database import Base # Import Base from database.py

# SQLAlchemy model
class LawyerDB(Base):
    __tablename__ = "lawyers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)  # Comprimento 100
    oab = Column(String(20), unique=True, index=True) # Comprimento 20
    email = Column(String(100), unique=True, index=True) # Comprimento 100
    telegram_id = Column(String(50), nullable=True) # Comprimento 50
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)

    processes = relationship("LegalProcessDB", back_populates="lawyer")

# Pydantic models for request/response validation
class LawyerBase(BaseModel):
    name: str
    oab: str
    email: EmailStr
    telegram_id: Optional[str] = None

    @field_validator('telegram_id')
    @classmethod
    def validate_telegram_id(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if not re.match(r"^@[a-zA-Z0-9_]{3,31}$", value): # Usernames 3-31 chars after @
            raise ValueError(
                "ID do Telegram inválido. Deve começar com '@' seguido por 3 a 31 "
                "caracteres alfanuméricos ou underscores (ex: @usuario123)."
            )
        return value

    @field_validator('oab')
    @classmethod
    def validate_oab(cls, value: str) -> str:
        # Regex para NNNNNUF (1 a 6 números seguidos por 2 letras maiúsculas)
        # Ex: 123SP, 123456RJ
        # Ou NNNNN/UF (1 a 6 números, barra, 2 letras maiúsculas)
        # Ex: 123/SP, 123456/RJ
        # Opcionalmente, permite pontos na parte numérica para o primeiro formato: 123.456SP
        # Mas não para o formato com barra, para simplificar.

        # Padrão: NNNNNUF ou NNN.NNNUF (sem barra)
        pattern_num_uf = r"^\d{1,3}(\.?\d{3})?[A-Z]{2}$"
        # Padrão: NNNNN/UF (com barra)
        pattern_num_barra_uf = r"^\d{1,6}\/[A-Z]{2}$"

        # Converte para maiúsculas para facilitar a validação da UF
        value_upper = value.upper()

        if not (re.match(pattern_num_uf, value_upper) or re.match(pattern_num_barra_uf, value_upper)):
            raise ValueError(
                "Formato da OAB inválido. Use formatos como '12345SP', '123.456SP', ou '12345/SP'."
            )

        # Normaliza removendo o ponto para armazenamento, se presente no primeiro padrão
        if '.' in value_upper and '/' not in value_upper:
            value_upper = value_upper.replace('.', '')

        return value_upper


class LawyerCreate(LawyerBase): # This is used for PUT updates, typically without password change here
    pass

class LawyerCreateRequest(LawyerBase): # New model for registration
    password: str

class Lawyer(LawyerBase):
    id: int
    is_admin: bool # Added is_admin

    class Config:
        from_attributes = True # Changed from orm_mode = True for Pydantic v2
