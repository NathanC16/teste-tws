from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from pydantic import BaseModel, validator # Alterado de field_validator para validator
from datetime import date, datetime # Adicionado datetime para strptime
from typing import Any, Union, Optional # Adicionado Optional

from database import Base # Importa Base de database.py

# Modelo SQLAlchemy
class LegalProcessDB(Base):
    __tablename__ = "legal_processes" # Nome da tabela no banco de dados

    id = Column(Integer, primary_key=True, index=True)
    process_number = Column(String(50), unique=True, index=True) # Número do processo, Comprimento 50
    entry_date = Column(Date) # Data de entrada
    delivery_deadline = Column(Date) # Prazo de entrega
    fatal_deadline = Column(Date) # Prazo fatal
    data_conclusao_real = Column(Date, nullable=True) # Novo campo: Data real de conclusão
    status = Column(String(30), default="ativo") # Status do processo, Comprimento 30
    action_type = Column(String(100), nullable=True) # Tipo de ação, Comprimento 100

    lawyer_id = Column(Integer, ForeignKey("lawyers.id")) # ID do advogado responsável
    client_id = Column(Integer, ForeignKey("clients.id")) # ID do cliente

    lawyer = relationship("LawyerDB", back_populates="processes") # Relacionamento com Advogado
    client = relationship("ClientDB", back_populates="processes") # Relacionamento com Cliente

# Modelos Pydantic para validação de requisição/resposta
# Modelos Pydantic para validação de requisição/resposta (Comentário original já em PT)
class LegalProcessBase(BaseModel):
    process_number: str
    lawyer_id: int
    client_id: int
    entry_date: date
    delivery_deadline: date
    fatal_deadline: date
    data_conclusao_real: Optional[date] = None # Novo campo Pydantic: Data real de conclusão
    status: Optional[str] = "ativo"
    action_type: Optional[str] = None

    # Validador para converter datas de string "dd/mm/aaaa" para objetos date (Sintaxe Pydantic V1).
    @validator('entry_date', 'delivery_deadline', 'fatal_deadline', 'data_conclusao_real', pre=True, always=True, check_fields=False)
    @classmethod
    def parse_date_format(cls, value: Any) -> Union[date, Any]:
        # Verifica se o valor é uma string no formato "dd/mm/aaaa".
        if isinstance(value, str):
            try:
                # Converte a string para um objeto date.
                return datetime.strptime(value, "%d/%m/%Y").date()
            except ValueError:
                # Se a conversão falhar, retorna o valor original para que
                # a validação padrão do Pydantic possa lidar com ele ou falhar.
                # Isso permite que formatos ISO padrão ainda sejam aceitos.
                pass
        # Se não for uma string ou a conversão falhou, retorna o valor como está.
        return value

class LegalProcessCreate(LegalProcessBase):
    pass

class LegalProcess(LegalProcessBase):
    id: int
    delay_risk: Optional[str] = None # Novo campo para risco de atraso (IA)

    class Config:
        from_attributes = True # Alterado de orm_mode = True para Pydantic v2.
