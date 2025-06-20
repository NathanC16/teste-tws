from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel # For TokenData
from sqlalchemy.orm import Session

# Assuming core is in PYTHONPATH or execution is from root
# If running scripts from within core, this might need adjustment (e.g., from ..config import ...)
from core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from database import get_db # To fetch user from DB
import models.lawyer as lawyer_models # Alias for SQLAlchemy model LawyerDB

# OAuth2 scheme for token dependency
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# Pydantic model for token payload data
class TokenData(BaseModel):
    oab: Optional[str] = None

# Password Hashing Setup
# Using bcrypt as the scheme for password hashing.
# "auto" means it will use bcrypt for new hashes and can verify other deprecated schemes if present.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against a hashed password.

    Args:
        plain_password: The password in plain text.
        hashed_password: The hashed version of the password.

    Returns:
        True if the password matches, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Hashes a plain password using bcrypt.

    Args:
        password: The password in plain text.

    Returns:
        The hashed version of the password.
    """
    return pwd_context.hash(password)

# JWT Token Creation
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a new JWT access token.

    Args:
        data: The data to be encoded in the token (typically includes user identifier).
        expires_delta: Optional timedelta object to specify token expiry.
                       If None, default expiry from config is used.

    Returns:
        The encoded JWT access token as a string.
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
    Decodes the JWT token, validates its signature and expiration,
    extracts the user identifier (OAB), and fetches the user from the database.

    Args:
        token: The JWT token obtained from the oauth2_scheme dependency.
        db: Database session dependency.

    Returns:
        The authenticated user (LawyerDB SQLAlchemy model instance).

    Raises:
        HTTPException (401 Unauthorized): If the token is invalid, expired,
                                          or the user cannot be found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        oab: str = payload.get("sub")
        if oab is None:
            raise credentials_exception
        token_data = TokenData(oab=oab) # Validates if 'sub' (oab) is present in payload
    except JWTError:
        raise credentials_exception

    user = db.query(lawyer_models.LawyerDB).filter(lawyer_models.LawyerDB.oab == token_data.oab).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin_user(current_user: lawyer_models.LawyerDB = Depends(get_current_user)) -> lawyer_models.LawyerDB:
    """
    Dependency to ensure the current user is an administrator.
    Relies on get_current_user to first authenticate the user.

    Args:
        current_user: The authenticated user object, injected by Depends(get_current_user).

    Returns:
        The authenticated user object if they are an admin.

    Raises:
        HTTPException (403 Forbidden): If the authenticated user is not an admin.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have administrative privileges"
        )
    return current_user
