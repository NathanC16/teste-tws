from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
import models.lawyer as lawyer_models # Alias para evitar conflito de nome com modelo Pydantic.
from core.security import get_password_hash, verify_password, create_access_token, get_current_user # Adicionado get_current_user.

router = APIRouter(prefix="/auth", tags=["Autenticação"]) # Tag já traduzida.

# Endpoint de registro removido para sistema de login exclusivo de Admin.
# Usuários (advogados) serão criados por um admin existente através do endpoint /lawyers/ ou diretamente no BD.

@router.post("/token", response_model=dict)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    from sqlalchemy import func # Importa func para func.lower().

    # Tenta encontrar o advogado pelo username (Nickname) de forma case-insensitive.
    db_lawyer = db.query(lawyer_models.LawyerDB).filter(
        func.lower(lawyer_models.LawyerDB.username) == func.lower(form_data.username)
    ).first()

    # Se não encontrar pelo username, tenta pela OAB (convertendo a entrada para maiúsculas, pois OABs são armazenadas em maiúsculas).
    if not db_lawyer:
        db_lawyer = db.query(lawyer_models.LawyerDB).filter(
            lawyer_models.LawyerDB.oab == form_data.username.upper()
        ).first()

    # Se ainda não encontrou, pode ser que o usuário digitou a OAB em minúsculas e a primeira query (username) pegou por acaso
    # se o username fosse igual à OAB em minúsculas. Uma checagem final mais explícita:
    if not db_lawyer:
        db_lawyer = db.query(lawyer_models.LawyerDB).filter(
             lawyer_models.LawyerDB.oab == form_data.username # Sem .upper() para o caso de já estar correta.
        ).first()


    # Verifica se o advogado foi encontrado e se a senha está correta.
    if not db_lawyer or not verify_password(form_data.password, db_lawyer.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário/OAB ou senha incorretos", # Mensagem de erro já atualizada.
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Cria o token de acesso usando a OAB do advogado como "sub" (subject).
    access_token = create_access_token(data={"sub": db_lawyer.oab})

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=lawyer_models.Lawyer) # Usando modelo Pydantic Lawyer para a resposta.
async def read_users_me(current_user: lawyer_models.LawyerDB = Depends(get_current_user)):
    # current_user é uma instância do modelo SQLAlchemy LawyerDB,
    # conforme retornado por get_current_user.
    # FastAPI o converterá automaticamente para o modelo Pydantic Lawyer (com alias lawyer_models.Lawyer).
    return current_user

# --- Configurações do Usuário ---
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import re

class UserSettingsUpdate(BaseModel): # Renomeado de AdminSettingsUpdate.
    name: Optional[str] = None # Adicionado nome.
    email: Optional[EmailStr] = None
    telegram_id: Optional[str] = None # Permitir string vazia para limpar.
    current_password: Optional[str] = None
    new_password: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_user_name(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            value = value.strip()
            if not value: # Se após strip for vazio.
                raise ValueError("Nome não pode ser vazio se fornecido.")
        return value

    @field_validator('telegram_id', mode='before') # mode='before' para processar antes da validação de tipo.
    @classmethod
    def validate_telegram_id(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if value == "": # Se string vazia, tratar como None para limpar o campo.
            return None

        # Verifica se é um ID numérico (Chat ID).
        if re.match(r"^-?\d+$", value):
            return value
        # Verifica se é um username no formato @username.
        if re.match(r"^@[a-zA-Z0-9_]{3,31}$", value):
            return value
        raise ValueError(
            "ID do Telegram inválido. Deve ser um ID numérico ou um username no formato '@usuario' (3-31 caracteres alfanuméricos ou underscores)."
        )

    @field_validator('new_password')
    @classmethod
    def validate_new_password_strength(cls, value: Optional[str], info) -> Optional[str]:
        # Anteriormente 'values', agora 'info' em Pydantic v2 para acessar outros campos.
        current_password = info.data.get('current_password')
        if value is not None: # Se new_password foi fornecido.
            if not current_password:
                raise ValueError("Senha atual é obrigatória para definir uma nova senha.")
            if len(value) < 6:
                raise ValueError("Nova senha deve ter pelo menos 6 caracteres.")
            if value == current_password: # Não deve ser igual à senha atual.
                 raise ValueError("Nova senha não pode ser igual à senha atual.")
        # Não há 'else' aqui, pois se new_password for None, não há o que validar sobre ele.
        # A lógica de current_password ser fornecida sem new_password é tratada no endpoint.
        return value

@router.put("/users/me/settings", response_model=lawyer_models.Lawyer)
async def update_user_settings( # Renomeado de update_admin_settings.
    settings_update: UserSettingsUpdate, # Renomeado para UserSettingsUpdate.
    db: Session = Depends(get_db),
    current_user: lawyer_models.LawyerDB = Depends(get_current_user)
):
    # Esta rota é para o usuário logado (/me/), então current_user é o usuário a ser atualizado.
    # A restrição para admin foi removida, qualquer usuário pode atualizar seus próprios dados.
    user_to_update = current_user

    # Atualizar Nome.
    if settings_update.name is not None:
        user_to_update.name = settings_update.name.strip() # .strip() já feito no validador.

    # Atualizar Email.
    if settings_update.email is not None:
        if settings_update.email != user_to_update.email:
            # Verificar se o novo email já está em uso por OUTRO usuário.
            existing_lawyer_email = db.query(lawyer_models.LawyerDB).filter(
                lawyer_models.LawyerDB.email == settings_update.email,
                lawyer_models.LawyerDB.id != user_to_update.id
            ).first()
            if existing_lawyer_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Este email já está em uso por outro usuário."
                )
            user_to_update.email = settings_update.email

    # Atualizar Telegram ID.
    # O validador Pydantic já tratou o formato e a limpeza (string vazia para None).
    # Apenas atualiza se o campo estiver presente no payload (mesmo que seja None para limpar).
    if 'telegram_id' in settings_update.model_fields_set:
        user_to_update.telegram_id = settings_update.telegram_id


    # Atualizar Senha.
    if settings_update.new_password: # Implica que current_password também foi validado pelo Pydantic se new_password foi fornecido.
        if not settings_update.current_password: # Dupla checagem, embora o validador Pydantic já deva ter pego.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Senha atual é obrigatória para definir uma nova senha."
            )
        if not verify_password(settings_update.current_password, user_to_update.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Senha atual incorreta."
            )
        user_to_update.hashed_password = get_password_hash(settings_update.new_password)
    elif settings_update.current_password and not settings_update.new_password:
        # Caso onde current_password é fornecida mas new_password não.
        # Isso pode ser um erro de UI, mas não deve causar falha aqui.
        # Apenas ignoramos, pois não há nova senha para definir.
        pass


    try:
        db.add(user_to_update)
        db.commit()
        db.refresh(user_to_update)
    except IntegrityError: # Pode acontecer se houver uma condição de corrida rara na verificação de email.
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
