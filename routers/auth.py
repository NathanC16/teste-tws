from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
import models.lawyer as lawyer_models # Alias para evitar conflito de nome com modelo Pydantic
from core.security import get_password_hash, verify_password, create_access_token, get_current_user # Adicionado get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticação"]) # Tag traduzida

# Endpoint de registro removido para sistema de login exclusivo de Admin.
# Usuários (advogados) serão criados por um admin existente através do endpoint /lawyers/ ou diretamente no BD.

@router.post("/token", response_model=dict)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Tenta encontrar o advogado pelo username primeiro
    db_lawyer = db.query(lawyer_models.LawyerDB).filter(lawyer_models.LawyerDB.username == form_data.username).first()

    # Se não encontrar pelo username, tenta pela OAB
    if not db_lawyer:
        db_lawyer = db.query(lawyer_models.LawyerDB).filter(lawyer_models.LawyerDB.oab == form_data.username).first()

    # Verifica se o advogado foi encontrado e se a senha está correta
    if not db_lawyer or not verify_password(form_data.password, db_lawyer.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário/OAB ou senha incorretos", # Mensagem de erro atualizada
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Cria o token de acesso usando a OAB do advogado como "sub" (subject)
    access_token = create_access_token(data={"sub": db_lawyer.oab})

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=lawyer_models.Lawyer) # Usando modelo Pydantic Lawyer para a resposta
async def read_users_me(current_user: lawyer_models.LawyerDB = Depends(get_current_user)):
    # current_user é uma instância do modelo SQLAlchemy LawyerDB,
    # conforme retornado por get_current_user.
    # FastAPI o converterá automaticamente para o modelo Pydantic Lawyer (com alias lawyer_models.Lawyer).
    return current_user

# --- Admin Settings ---
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re

class AdminSettingsUpdate(BaseModel):
    email: Optional[EmailStr] = None
    telegram_id: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

    @field_validator('telegram_id')
    @classmethod
    def validate_telegram_id(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.strip() == "":
            return None # Permitir limpar o campo
        # Verifica se é um ID numérico (Chat ID)
        if re.match(r"^-?\d+$", value):
            return value
        # Verifica se é um username no formato @username
        if re.match(r"^@[a-zA-Z0-9_]{3,31}$", value):
            return value
        raise ValueError(
            "ID do Telegram inválido. Deve ser um ID numérico ou um username no formato '@usuario' (3-31 caracteres)."
        )

    @field_validator('new_password')
    @classmethod
    def validate_new_password_strength(cls, value: Optional[str], values) -> Optional[str]:
        # Este validador é chamado mesmo se new_password for None.
        # values.data contém os campos já validados ou os valores brutos.
        current_password = values.data.get('current_password')
        if value is not None: # Se new_password foi fornecido
            if not current_password:
                raise ValueError("Senha atual é obrigatória para definir uma nova senha.")
            if len(value) < 6:
                raise ValueError("Nova senha deve ter pelo menos 6 caracteres.")
            if value == current_password:
                raise ValueError("Nova senha não pode ser igual à senha atual.")
        elif current_password and value is None:
            # Se current_password foi fornecida mas new_password não, isso é um erro de lógica do cliente,
            # mas o modelo não deve falhar aqui, apenas não fazer nada com a senha.
            # A lógica do endpoint tratará disso.
            pass
        return value

@router.put("/users/me/settings", response_model=lawyer_models.Lawyer)
async def update_admin_settings(
    settings_update: AdminSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: lawyer_models.LawyerDB = Depends(get_current_user)
):
    # Garantir que apenas o admin principal possa usar este endpoint
    if not (current_user.oab == "00001SP" or current_user.username == "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas o administrador principal pode alterar estas configurações."
        )

    user_to_update = current_user # É o próprio admin

    # Atualizar Email
    if settings_update.email is not None:
        if settings_update.email != user_to_update.email:
            existing_lawyer_email = db.query(lawyer_models.LawyerDB).filter(
                lawyer_models.LawyerDB.email == settings_update.email,
                lawyer_models.LawyerDB.id != user_to_update.id # Não comparar com o próprio usuário
            ).first()
            if existing_lawyer_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Este email já está em uso por outro usuário."
                )
            user_to_update.email = settings_update.email

    # Atualizar Telegram ID
    # O validador Pydantic já tratou o formato e a limpeza (string vazia para None)
    if settings_update.telegram_id is not None or settings_update.telegram_id == None and user_to_update.telegram_id is not None:
         # Permite definir como None para limpar, ou atualizar se fornecido
        user_to_update.telegram_id = settings_update.telegram_id


    # Atualizar Senha
    if settings_update.new_password:
        if not settings_update.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Senha atual é obrigatória para definir uma nova senha."
            )
        if not verify_password(settings_update.current_password, user_to_update.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Senha atual incorreta."
            )
        # Validação de força e igualdade já foi feita pelo Pydantic validator
        user_to_update.hashed_password = get_password_hash(settings_update.new_password)

    try:
        db.add(user_to_update)
        db.commit()
        db.refresh(user_to_update)
    except IntegrityError: # Pode acontecer se houver uma condição de corrida rara na verificação de email
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro ao salvar alterações. Verifique se o email já não está em uso."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ocorreu um erro interno ao atualizar as configurações: {str(e)}"
        )

    return user_to_update
