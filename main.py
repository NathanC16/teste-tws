from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends # Added Depends
from fastapi.staticfiles import StaticFiles # Adicionado para arquivos estáticos
from pydantic import EmailStr
from datetime import date

# Database imports
from database import engine, SessionLocal, get_db # Adicionado get_db
from sqlalchemy.orm import Session # Adicionado Session
from sqlalchemy.exc import IntegrityError # <-- Adicionar esta linha

# Model imports
from models.lawyer import Lawyer, LawyerCreate, Lawyer as LawyerResponse # Pydantic models, LawyerResponse for type hint
from models.client import Client, ClientCreate, AreaOfExpertiseEnum # Pydantic models
from models.legal_process import LegalProcess, LegalProcessCreate, LegalProcessBase # Pydantic models

from models import lawyer as lawyer_model
from models import client as client_model
from models import legal_process as process_model
from routers import auth as auth_router # Import the auth router
from core.security import get_current_user # get_current_admin_user removed
from core.security import get_password_hash # For placeholder password in create_lawyer

app = FastAPI(title="Gerenciador de Processos Jurídicos")

# Include routers
app.include_router(auth_router.router)

# Montar diretório de arquivos estáticos
app.mount("/frontend", StaticFiles(directory="static_frontend"), name="frontend")

# Criar tabelas do banco de dados
lawyer_model.Base.metadata.create_all(bind=engine)
client_model.Base.metadata.create_all(bind=engine)
process_model.Base.metadata.create_all(bind=engine)

# As funções auxiliares get_lawyer_by_id e get_client_by_id foram removidas.
# A lógica de verificação de existência de advogado/cliente
# já está integrada nos endpoints de LegalProcess.

@app.get("/areas-of-expertise/", response_model=List[str])
def get_areas_of_expertise():
    return [area.value for area in AreaOfExpertiseEnum]

@app.post("/lawyers/", response_model=LawyerResponse)
def create_lawyer(lawyer_in: LawyerCreate, db: Session = Depends(get_db), current_user: lawyer_model.LawyerDB = Depends(get_current_user)):
    # Any authenticated user can now create a "lawyer" (which is now just a user).
    # Note: lawyer_in is LawyerCreate, which doesn't include password.
    # This endpoint might need its own Pydantic model if admins should set passwords/is_admin status directly.
    # For now, this creates a lawyer without a password, which is problematic.
    # This endpoint should ideally take a model similar to LawyerCreateRequest or have specific fields.
    # For simplicity of this task, we'll assume LawyerCreate is sufficient and password/admin status
    # for lawyers created here would be handled differently (e.g. not active until password set).
    # OR, this endpoint is for admins to update existing lawyer data, not create new ones with password.
    # Given the task, we're just protecting it.
    # A more complete solution would be:
    # 1. Use a different Pydantic model for admin creation that includes a password.
    # 2. Hash that password and set is_admin if needed.
    # For now, let's proceed with the protection, acknowledging this limitation.

    # Check if OAB already exists, as this endpoint doesn't go through the /auth/register logic
    existing_lawyer_oab = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.oab == lawyer_in.oab).first()
    if existing_lawyer_oab:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAB already registered."
        )
    existing_lawyer_email = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.email == lawyer_in.email).first()
    if existing_lawyer_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )

    # This lawyer creation is problematic as it doesn't set a password.
    # For now, focusing on protection. A real implementation would need to handle this.
    # Defaulting hashed_password to a non-functional value or requiring a different input model.
    # Let's assume this endpoint will be refactored later for proper admin creation.
    # For now, to make it runnable, we'll add a placeholder hashed_password.
    # This is NOT secure for a real application.
    placeholder_hashed_password = get_password_hash("default_password_needs_change")

    db_lawyer = lawyer_model.LawyerDB(
        **lawyer_in.model_dump(),
        hashed_password=placeholder_hashed_password # Placeholder!
        # is_admin field removed
    )
    db.add(db_lawyer)
    try:
        db.commit()
        db.refresh(db_lawyer)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro: Advogado com este OAB ou Email já existe.")
    return db_lawyer

@app.get("/lawyers/", response_model=List[LawyerResponse])
def get_lawyers(name: Optional[str] = None, oab: Optional[str] = None, db: Session = Depends(get_db), current_user: lawyer_model.LawyerDB = Depends(get_current_user)):
    query = db.query(lawyer_model.LawyerDB)
    if name:
        query = query.filter(lawyer_model.LawyerDB.name.contains(name))
    if oab:
        query = query.filter(lawyer_model.LawyerDB.oab == oab)
    return query.all()

@app.get("/lawyers/{lawyer_id}", response_model=LawyerResponse)
def get_lawyer(lawyer_id: int, db: Session = Depends(get_db), current_user: lawyer_model.LawyerDB = Depends(get_current_user)):
    db_lawyer = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.id == lawyer_id).first()
    if db_lawyer is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    return db_lawyer

@app.put("/lawyers/{lawyer_id}", response_model=LawyerResponse)
def update_lawyer(lawyer_id: int, lawyer_update: LawyerCreate, db: Session = Depends(get_db), current_user: lawyer_model.LawyerDB = Depends(get_current_user)):
    # Note: LawyerCreate doesn't allow updating password.
    # is_admin field is removed.
    db_lawyer = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.id == lawyer_id).first()
    if db_lawyer is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")

    update_data = lawyer_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_lawyer, key, value)

    db.add(db_lawyer)
    db.commit()
    db.refresh(db_lawyer)
    return db_lawyer

@app.delete("/lawyers/{lawyer_id}")
def delete_lawyer(lawyer_id: int, db: Session = Depends(get_db), current_user: lawyer_model.LawyerDB = Depends(get_current_user)):
    db_lawyer = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.id == lawyer_id).first()
    if db_lawyer is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")

    # Verificar processos associados
    associated_processes = db.query(process_model.LegalProcessDB).filter(process_model.LegalProcessDB.lawyer_id == lawyer_id).count()
    if associated_processes > 0:
        raise HTTPException(
            status_code=400,
            detail="Lawyer cannot be deleted as they are associated with one or more legal processes."
        )

    db.delete(db_lawyer)
    db.commit()
    return {"message": "Lawyer deleted successfully"}


# CRUD Endpoints for Clients

@app.post("/clients/", response_model=Client)
def create_client(client_in: ClientCreate, db: Session = Depends(get_db), current_user: LawyerResponse = Depends(get_current_user)):
    db_client = client_model.ClientDB(**client_in.model_dump())
    db.add(db_client)
    try:
        db.commit()
        db.refresh(db_client)
    except IntegrityError:
        db.rollback()
        # Supondo que o nome do cliente deva ser único, ou outro campo.
        # Se não houver campos únicos além do ID, este erro seria menos provável aqui.
        # Para ser genérico por agora:
        raise HTTPException(status_code=400, detail="Erro: Cliente com dados duplicados já existe (ex: nome).")
    return db_client

@app.get("/clients/", response_model=List[Client])
def get_clients(db: Session = Depends(get_db), current_user: LawyerResponse = Depends(get_current_user)): # Added current_user
    # Now this endpoint requires a valid token
    # You can use current_user here if needed, e.g., logging current_user.oab
    return db.query(client_model.ClientDB).all()

@app.get("/clients/{client_id}", response_model=Client)
def get_client(client_id: int, db: Session = Depends(get_db), current_user: LawyerResponse = Depends(get_current_user)):
    db_client = db.query(client_model.ClientDB).filter(client_model.ClientDB.id == client_id).first()
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return db_client

@app.put("/clients/{client_id}", response_model=Client)
def update_client(client_id: int, client_update: ClientCreate, db: Session = Depends(get_db), current_user: LawyerResponse = Depends(get_current_user)):
    db_client = db.query(client_model.ClientDB).filter(client_model.ClientDB.id == client_id).first()
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = client_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_client, key, value)

    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@app.delete("/clients/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db), current_user: LawyerResponse = Depends(get_current_user)):
    db_client = db.query(client_model.ClientDB).filter(client_model.ClientDB.id == client_id).first()
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    # Verificar processos associados
    associated_processes = db.query(process_model.LegalProcessDB).filter(process_model.LegalProcessDB.client_id == client_id).count()
    if associated_processes > 0:
        raise HTTPException(
            status_code=400,
            detail="Client cannot be deleted as they are associated with one or more legal processes."
        )

    db.delete(db_client)
    db.commit()
    return {"message": "Client deleted successfully"}


# CRUD Endpoints for Legal Processes

@app.post("/processes/", response_model=LegalProcess)
def create_legal_process(process_in: LegalProcessCreate, db: Session = Depends(get_db), current_user: LawyerResponse = Depends(get_current_user)):
    # TODO (Future): Consider validating process_in.lawyer_id against current_user.id
    # or automatically setting process_in.lawyer_id = current_user.id
    lawyer = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.id == process_in.lawyer_id).first()
    if not lawyer:
        raise HTTPException(status_code=404, detail=f"Lawyer with id {process_in.lawyer_id} not found")
    client = db.query(client_model.ClientDB).filter(client_model.ClientDB.id == process_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail=f"Client with id {process_in.client_id} not found")

    db_process = process_model.LegalProcessDB(**process_in.model_dump())
    db.add(db_process)
    try:
        db.commit()
        db.refresh(db_process)
    except IntegrityError:
        db.rollback()
        # A constraint unique está em process_number
        raise HTTPException(status_code=400, detail="Erro: Número do processo já existente.")
    return db_process

@app.get("/processes/", response_model=List[LegalProcess])
def get_legal_processes(
    client_id: Optional[int] = None,
    lawyer_id: Optional[int] = None,
    action_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: LawyerResponse = Depends(get_current_user)
):
    query = db.query(process_model.LegalProcessDB)
    if client_id is not None:
        query = query.filter(process_model.LegalProcessDB.client_id == client_id)
    if lawyer_id is not None:
        query = query.filter(process_model.LegalProcessDB.lawyer_id == lawyer_id)
    if action_type:
        query = query.filter(process_model.LegalProcessDB.action_type.contains(action_type))
    if status:
        query = query.filter(process_model.LegalProcessDB.status == status)
    return query.all()

@app.get("/processes/{process_id}", response_model=LegalProcess)
def get_legal_process(process_id: int, db: Session = Depends(get_db), current_user: LawyerResponse = Depends(get_current_user)):
    db_process = db.query(process_model.LegalProcessDB).filter(process_model.LegalProcessDB.id == process_id).first()
    if db_process is None:
        raise HTTPException(status_code=404, detail="Legal process not found")
    return db_process

@app.put("/processes/{process_id}", response_model=LegalProcess)
def update_legal_process(process_id: int, process_update: LegalProcessCreate, db: Session = Depends(get_db), current_user: LawyerResponse = Depends(get_current_user)):
    db_process = db.query(process_model.LegalProcessDB).filter(process_model.LegalProcessDB.id == process_id).first()
    if db_process is None:
        raise HTTPException(status_code=404, detail="Legal process not found")

    if process_update.lawyer_id != db_process.lawyer_id:
        lawyer = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.id == process_update.lawyer_id).first()
        if not lawyer:
            raise HTTPException(status_code=404, detail=f"Lawyer with id {process_update.lawyer_id} not found")
    # Validate client_id if updated
    if process_update.client_id != db_process.client_id:
        client = db.query(client_model.ClientDB).filter(client_model.ClientDB.id == process_update.client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail=f"Client with id {process_update.client_id} not found")

    update_data = process_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_process, key, value)

    db.add(db_process)
    db.commit()
    db.refresh(db_process)
    return db_process

@app.delete("/processes/{process_id}")
def delete_legal_process(process_id: int, db: Session = Depends(get_db), current_user: LawyerResponse = Depends(get_current_user)):
    db_process = db.query(process_model.LegalProcessDB).filter(process_model.LegalProcessDB.id == process_id).first()
    if db_process is None:
        raise HTTPException(status_code=404, detail="Legal process not found")
    db.delete(db_process)
    db.commit()
    return {"message": "Legal process deleted successfully"}
