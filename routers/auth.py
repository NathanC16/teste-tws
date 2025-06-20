from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
import models.lawyer as lawyer_models # Alias to avoid Pydantic model name conflict
from core.security import get_password_hash, verify_password, create_access_token, get_current_user # Added get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Registration endpoint removed for Admin-only login system.
# Users (lawyers) will be created by an existing admin via the /lawyers/ endpoint or directly in the DB.

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

@router.get("/users/me", response_model=lawyer_models.Lawyer) # Using Lawyer Pydantic model for response
async def read_users_me(current_user: lawyer_models.LawyerDB = Depends(get_current_user)):
    # current_user is an instance of the SQLAlchemy model LawyerDB,
    # as returned by get_current_user.
    # FastAPI will automatically convert it to the Pydantic model LawyerResponse (aliased as lawyer_models.Lawyer).
    return current_user
