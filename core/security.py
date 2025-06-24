from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel # Para TokenData
from sqlalchemy.orm import Session

# Assumindo que 'core' está no PYTHONPATH ou a execução é da raiz
# Se executando scripts de dentro de 'core', isso pode precisar de ajuste (ex: from ..config import ...)
from core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from database import get_db # Para buscar usuário no BD
import models.lawyer as lawyer_models # Alias para o modelo SQLAlchemy LawyerDB

# Esquema OAuth2 para dependência de token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# Modelo Pydantic para os dados do payload do token
class TokenData(BaseModel):
    oab: Optional[str] = None

# Configuração de Hashing de Senha
# Usando bcrypt como o esquema para hashing de senha.
# "auto" significa que usará bcrypt para novos hashes e pode verificar outros esquemas obsoletos, se presentes.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica uma senha simples contra uma senha "hasheada" (codificada de forma segura).

    Args:
        plain_password: A senha em texto plano.
        hashed_password: A versão "hasheada" da senha.

    Returns:
        True se a senha corresponder, False caso contrário.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Gera o hash de uma senha simples usando bcrypt.

    Args:
        password: A senha em texto plano.

    Returns:
        A versão "hasheada" da senha.
    """
    return pwd_context.hash(password)

# Criação de Token JWT
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Cria um novo token de acesso JWT.

    Args:
        data: Os dados a serem codificados no token (geralmente inclui o identificador do usuário).
        expires_delta: Objeto timedelta opcional para especificar a expiração do token.
                       Se None, a expiração padrão da configuração é usada.

    Returns:
        O token de acesso JWT codificado como uma string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> lawyer_models.LawyerDB:
    """
    Decodifica o token JWT, valida sua assinatura e expiração,
    extrai o identificador do usuário (OAB) e busca o usuário no banco de dados.

    Args:
        token: O token JWT obtido da dependência oauth2_scheme.
        db: Dependência da sessão do banco de dados.

    Returns:
        O usuário autenticado (instância do modelo SQLAlchemy LawyerDB).

    Raises:
        HTTPException (401 Não Autorizado): Se o token for inválido, expirado,
                                           ou o usuário não puder ser encontrado.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais", # Mensagem já estava traduzida.
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        oab: str = payload.get("sub")
        if oab is None:
            raise credentials_exception
        token_data = TokenData(oab=oab) # Valida se 'sub' (oab) está presente no payload.
    except JWTError:
        raise credentials_exception

    user = db.query(lawyer_models.LawyerDB).filter(lawyer_models.LawyerDB.oab == token_data.oab).first()
    if user is None:
        raise credentials_exception
    return user

# A função get_current_admin_user foi removida para simplificação.
# Todos os usuários autenticados terão o mesmo nível de acesso a rotas protegidas.
# (Comentário original já estava parcialmente em português ou referenciando código em português)
