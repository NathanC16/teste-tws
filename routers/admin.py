from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, constr
from sqlalchemy.orm import Session

from database import get_db
import models.lawyer as lawyer_models
from core.security import get_current_user, get_password_hash

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    # Adicionar dependência de autenticação e verificação de admin para todas as rotas neste router.
    # dependencies=[Depends(get_current_admin_user)] # Criaremos essa dependência.
)

# --- Dependência para verificar se o usuário é o admin principal ---
async def get_current_admin_user(current_user: lawyer_models.LawyerDB = Depends(get_current_user)):
    """
    Verifica se o usuário logado é o administrador principal.
    Levanta HTTPException 403 se não for.
    """
    if not (current_user.oab == "00001SP" or current_user.username == "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Esta funcionalidade é restrita ao administrador principal."
        )
    return current_user

# --- Modelo Pydantic para o payload de reset de senha ---
class PasswordResetPayload(BaseModel):
    new_password: constr(min_length=6) # Senha com no mínimo 6 caracteres.


@router.post("/lawyers/{lawyer_id}/reset-password",
             dependencies=[Depends(get_current_admin_user)], # Garante que apenas o admin principal acesse.
             summary="Admin redefine a senha de um advogado")
async def admin_reset_lawyer_password(
    lawyer_id: int,
    payload: PasswordResetPayload,
    db: Session = Depends(get_db),
    # current_admin: lawyer_models.LawyerDB = Depends(get_current_admin_user) # current_admin já é garantido pela dependência do router/endpoint.
):
    """
    Permite que o administrador principal redefina a senha de qualquer advogado.
    """
    target_lawyer = db.query(lawyer_models.LawyerDB).filter(lawyer_models.LawyerDB.id == lawyer_id).first()

    if not target_lawyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Advogado com ID {lawyer_id} não encontrado."
        )

    # O admin não pode redefinir a própria senha por este endpoint; deve usar a página de configurações dele.
    # Embora a dependência já restrinja ao admin, um log ou aviso pode ser adicionado se necessário.
    # A lógica na página de configurações do usuário/admin já lida com a mudança da própria senha.
    # Se quisermos proibir explicitamente aqui (embora redundante com a lógica de auto-alteração):
    # if target_lawyer.oab == "00001SP" or target_lawyer.username == "admin":
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="O administrador principal deve alterar sua própria senha através da página de configurações."
    #     )

    target_lawyer.hashed_password = get_password_hash(payload.new_password)
    db.add(target_lawyer)
    db.commit()

    return {"message": f"Senha para o advogado {target_lawyer.name} (OAB: {target_lawyer.oab}) redefinida com sucesso."}
