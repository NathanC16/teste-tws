from sqlalchemy import Column, Integer, String # Booleano removido
from sqlalchemy.orm import relationship
from pydantic import BaseModel, EmailStr, field_validator # Adiciona field_validator
from typing import Optional
import re # Importa re para regex
import logging # Adiciona import de logging

from database import Base # Importa Base de database.py

# Modelo SQLAlchemy
class LawyerDB(Base):
    __tablename__ = "lawyers" # Nome da tabela no banco de dados

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)  # Comprimento 100
    oab = Column(String(20), unique=True, index=True) # Comprimento 20
    email = Column(String(100), unique=True, index=True) # Comprimento 100
    username = Column(String(50), unique=True, index=True, nullable=False) # Nickname, agora obrigatório
    telegram_id = Column(String(50), nullable=True) # Comprimento 50
    hashed_password = Column(String(255), nullable=False) # Senha "hasheada"
    # Coluna is_admin removida

    processes = relationship("LegalProcessDB", back_populates="lawyer")

# Modelos Pydantic para validação de requisição/resposta
class LawyerBase(BaseModel):
    name: str
    oab: str
    email: EmailStr
    username: str # Nickname, agora obrigatório
    telegram_id: Optional[str] = None

    @field_validator('username')
    @classmethod
    def validate_username(cls, value: str) -> str: # value agora é str, não Optional[str]
        if not value: # Checagem adicional para string vazia, embora nullable=False no BD deva pegar
            raise ValueError("Nickname (username) não pode ser vazio.")
        # Verifica se o username é alfanumérico e tem entre 3 e 20 caracteres.
        # Mantendo o regex atual que permite maiúsculas/minúsculas e números.
        # Para forçar minúsculas, o frontend ou a lógica de geração de nickname se encarregaria disso.
        if not re.match(r"^[a-zA-Z0-9]{3,20}$", value):
            raise ValueError(
                "Nickname inválido. Deve ser alfanumérico (letras e números), sem espaços, e ter entre 3 e 20 caracteres."
            )
        return value

    @field_validator('telegram_id')
    @classmethod
    def validate_telegram_id(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None # Retorna None explicitamente se o valor for None.

        # Verifica se é um ID numérico (Chat ID).
        if re.match(r"^-?\d+$", value): # Permite IDs negativos para grupos/canais e positivos para usuários.
            return value

        # Verifica se é um username no formato @username.
        if re.match(r"^@[a-zA-Z0-9_]{3,31}$", value):
            return value

        raise ValueError(
            "ID do Telegram inválido. Deve ser um ID numérico ou um username no formato '@usuario' "
            "(3 a 31 caracteres alfanuméricos ou underscores)."
        )

    @field_validator('oab')
    @classmethod
    def validate_oab(cls, value: str) -> str:
        # Regex para NNNNNUF (1 a 6 números seguidos por 2 letras maiúsculas)
        # Ex: 123SP, 123456RJ
        # Ou NNNNN/UF (1 a 6 números, barra, 2 letras maiúsculas)
        # Ex: 123/SP, 123456/RJ
        # Opcionalmente, permite pontos na parte numérica para o primeiro formato: 123.456SP
        # Mas não para o formato com barra, para simplificar.

        # Padrão ajustado:
        # 1. NNNNNNSP (1 a 6 dígitos seguidos por 2 letras) - SEM pontos.
        # 2. NNNNNN/SP (1 a 6 dígitos, seguido por / e 2 letras)

        value_upper = value.upper() # Converte para maiúsculas para facilitar a validação da UF.

        # Remove pontos para normalizar formatos como 123.456SP para 123456SP antes da validação principal.
        # Isso também significa que o valor armazenado não terá pontos se este formato for usado.
        if '.' in value_upper and '/' not in value_upper:
            value_upper = value_upper.replace('.', '')

        # Padrão: 1 a 6 dígitos seguidos por 2 letras maiúsculas (Ex: 1SP, 123SP, 123456SP).
        pattern_num_uf_simple = r"^\d{1,6}[A-Z]{2}$"
        # Padrão: 1 a 6 dígitos, seguido por / e 2 letras maiúsculas (Ex: 1/SP, 123/SP, 123456/SP).
        pattern_num_barra_uf = r"^\d{1,6}\/[A-Z]{2}$"

        if not (re.match(pattern_num_uf_simple, value_upper) or re.match(pattern_num_barra_uf, value_upper)):
            raise ValueError(
                "Formato da OAB inválido. Use formatos como '12345SP' ou '12345/SP'. "
                "Pontos na parte numérica (ex: 123.456SP) são aceitos na entrada e removidos."
            )

        # Retorna o valor normalizado (sem pontos, se o formato original os tinha e não tinha barra).
        return value_upper


class LawyerCreate(LawyerBase): # Usado para atualizações PUT, geralmente sem alteração de senha aqui.
    pass

class LawyerCreateRequest(LawyerBase): # Novo modelo para registro.
    password: str

class Lawyer(LawyerBase):
    id: int
    # Campo is_admin removido.

    class Config:
        from_attributes = True # Alterado de orm_mode = True para Pydantic v2.
