from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
import models.lawyer as lawyer_models # Alias to avoid Pydantic model name conflict
from core.security import get_password_hash, verify_password, create_access_token, get_current_user # Added get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=lawyer_models.Lawyer)
def register_lawyer(
    lawyer_in: lawyer_models.LawyerCreateRequest,
    db: Session = Depends(get_db)
):
    # Check if OAB already exists
    existing_lawyer_oab = db.query(lawyer_models.LawyerDB).filter(lawyer_models.LawyerDB.oab == lawyer_in.oab).first()
    if existing_lawyer_oab:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAB already registered."
        )

    # Check if email already exists
    existing_lawyer_email = db.query(lawyer_models.LawyerDB).filter(lawyer_models.LawyerDB.email == lawyer_in.email).first()
    if existing_lawyer_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )

    hashed_password = get_password_hash(lawyer_in.password)

    # Create the LawyerDB instance
    # Note: Pydantic model validation (like OAB format) happens before this point
    # when FastAPI processes the request body against LawyerCreateRequest.
    db_lawyer = lawyer_models.LawyerDB(
        name=lawyer_in.name,
        oab=lawyer_in.oab, # Already validated by LawyerBase
        email=lawyer_in.email, # Already validated by LawyerBase
        telegram_id=lawyer_in.telegram_id, # Already validated by LawyerBase
        hashed_password=hashed_password,
        is_admin=False  # Default to False for self-registration
    )

    db.add(db_lawyer)
    try:
        db.commit()
        db.refresh(db_lawyer)
    except IntegrityError: # Should be caught by earlier checks, but good as a fallback
        db.rollback()
        # This might happen if there's a race condition or if a unique constraint
        # other than oab/email is violated (though none are defined currently besides those)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the lawyer account. OAB or Email might already exist."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {e}"
        )

    return db_lawyer


@router.post("/token", response_model=dict)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    db_lawyer = db.query(lawyer_models.LawyerDB).filter(lawyer_models.LawyerDB.oab == form_data.username).first()

    if not db_lawyer or not verify_password(form_data.password, db_lawyer.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect OAB or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": db_lawyer.oab}) # "sub" is standard claim for subject (user identifier)

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=lawyer_models.Lawyer) # Using Lawyer Pydantic model for response
async def read_users_me(current_user: lawyer_models.LawyerDB = Depends(get_current_user)):
    # current_user is an instance of the SQLAlchemy model LawyerDB,
    # as returned by get_current_user.
    # FastAPI will automatically convert it to the Pydantic model LawyerResponse (aliased as lawyer_models.Lawyer).
    return current_user
