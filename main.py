from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends # Added Depends
from fastapi.staticfiles import StaticFiles # Adicionado para arquivos estáticos
from pydantic import EmailStr
from datetime import date

# Database imports
from database import engine, SessionLocal, get_db # Adicionado get_db
from sqlalchemy.orm import Session # Adicionado Session

# Model imports
from models.lawyer import Lawyer, LawyerCreate # Pydantic models
from models.client import Client, ClientCreate # Pydantic models
from models.legal_process import LegalProcess, LegalProcessCreate, LegalProcessBase # Pydantic models

from models import lawyer as lawyer_model
from models import client as client_model
from models import legal_process as process_model

app = FastAPI()

# Montar diretório de arquivos estáticos
app.mount("/frontend", StaticFiles(directory="static_frontend"), name="frontend")

# Criar tabelas do banco de dados
lawyer_model.Base.metadata.create_all(bind=engine)
client_model.Base.metadata.create_all(bind=engine)
process_model.Base.metadata.create_all(bind=engine)

# As funções auxiliares get_lawyer_by_id e get_client_by_id foram removidas.
# A lógica de verificação de existência de advogado/cliente
# já está integrada nos endpoints de LegalProcess.

@app.post("/lawyers/", response_model=Lawyer)
def create_lawyer(lawyer_in: LawyerCreate, db: Session = Depends(get_db)):
    # global lawyer_id_counter # Removido
    # lawyer_id_counter += 1 # Removido
    # new_lawyer = Lawyer(id=lawyer_id_counter, **lawyer_in.model_dump()) # Removido
    # db_lawyers.append(new_lawyer) # Removido
    db_lawyer = lawyer_model.LawyerDB(**lawyer_in.model_dump())
    db.add(db_lawyer)
    db.commit()
    db.refresh(db_lawyer)
    return db_lawyer

@app.get("/lawyers/", response_model=List[Lawyer])
def get_lawyers(name: Optional[str] = None, oab: Optional[str] = None, db: Session = Depends(get_db)): # Adicionado db
    # filtered_lawyers = db_lawyers # Removido
    query = db.query(lawyer_model.LawyerDB)
    if name:
        # filtered_lawyers = [
        #     lawyer for lawyer in filtered_lawyers if name.lower() in lawyer.name.lower()
        # ]
        query = query.filter(lawyer_model.LawyerDB.name.contains(name))
    if oab:
        # filtered_lawyers = [
        #     lawyer for lawyer in filtered_lawyers if lawyer.oab == oab
        # ]
        query = query.filter(lawyer_model.LawyerDB.oab == oab)
    # return filtered_lawyers
    return query.all()

@app.get("/lawyers/{lawyer_id}", response_model=Lawyer)
def get_lawyer(lawyer_id: int, db: Session = Depends(get_db)): # Adicionado db
    # for lawyer in db_lawyers: # Removido
    #     if lawyer.id == lawyer_id: # Removido
    #         return lawyer # Removido
    db_lawyer = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.id == lawyer_id).first()
    if db_lawyer is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    return db_lawyer

@app.put("/lawyers/{lawyer_id}", response_model=Lawyer)
def update_lawyer(lawyer_id: int, lawyer_update: LawyerCreate, db: Session = Depends(get_db)): # Adicionado db
    # for index, lawyer in enumerate(db_lawyers): # Removido
    #     if lawyer.id == lawyer_id: # Removido
    #         updated_lawyer = lawyer.model_copy(update=lawyer_update.model_dump(exclude_unset=True)) # Removido
    #         db_lawyers[index] = updated_lawyer # Removido
    #         return updated_lawyer # Removido
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
def delete_lawyer(lawyer_id: int, db: Session = Depends(get_db)): # Adicionado db
    # Check if lawyer is associated with any legal processes
    # for process in db_legal_processes: # Removido - esta lógica será reimplementada
    #     if process.lawyer_id == lawyer_id:
    #         raise HTTPException(
    #             status_code=400,
    #             detail="Lawyer cannot be deleted as they are associated with one or more legal processes."
    #         )
    db_lawyer = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.id == lawyer_id).first()
    if db_lawyer is None:
        raise HTTPException(status_code=404, detail="Lawyer not found")

    # Verificar processos associados (simplificado por agora, pode precisar de lógica mais robusta)
    associated_processes = db.query(process_model.LegalProcessDB).filter(process_model.LegalProcessDB.lawyer_id == lawyer_id).count()
    if associated_processes > 0:
        raise HTTPException(
            status_code=400,
            detail="Lawyer cannot be deleted as they are associated with one or more legal processes."
        )

    # for index, lawyer in enumerate(db_lawyers): # Removido
    #     if lawyer.id == lawyer_id: # Removido
    #         db_lawyers.pop(index) # Removido
    #         return {"message": "Lawyer deleted successfully"} # Removido
    db.delete(db_lawyer)
    db.commit()
    return {"message": "Lawyer deleted successfully"}


# CRUD Endpoints for Clients

@app.post("/clients/", response_model=Client)
def create_client(client_in: ClientCreate, db: Session = Depends(get_db)): # Adicionado db
    # global client_id_counter # Removido
    # client_id_counter += 1 # Removido
    # new_client = Client(id=client_id_counter, **client_in.model_dump()) # Removido
    # db_clients.append(new_client) # Removido
    db_client = client_model.ClientDB(**client_in.model_dump())
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@app.get("/clients/", response_model=List[Client])
def get_clients(db: Session = Depends(get_db)): # Adicionado db
    # return db_clients # Removido
    return db.query(client_model.ClientDB).all()

@app.get("/clients/{client_id}", response_model=Client)
def get_client(client_id: int, db: Session = Depends(get_db)): # Adicionado db
    # for client in db_clients: # Removido
    #     if client.id == client_id: # Removido
    #         return client # Removido
    db_client = db.query(client_model.ClientDB).filter(client_model.ClientDB.id == client_id).first()
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return db_client

@app.put("/clients/{client_id}", response_model=Client)
def update_client(client_id: int, client_update: ClientCreate, db: Session = Depends(get_db)): # Adicionado db
    # for index, client in enumerate(db_clients): # Removido
    #     if client.id == client_id: # Removido
    #         updated_client = client.model_copy(update=client_update.model_dump(exclude_unset=True)) # Removido
    #         db_clients[index] = updated_client # Removido
    #         return updated_client # Removido
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
def delete_client(client_id: int, db: Session = Depends(get_db)): # Adicionado db
    # Check if client is associated with any legal processes
    # for process in db_legal_processes: # Removido - esta lógica será reimplementada
    #     if process.client_id == client_id:
    #         raise HTTPException(
    #             status_code=400,
    #             detail="Client cannot be deleted as they are associated with one or more legal processes."
    #         )
    db_client = db.query(client_model.ClientDB).filter(client_model.ClientDB.id == client_id).first()
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    # Verificar processos associados (simplificado por agora, pode precisar de lógica mais robusta)
    associated_processes = db.query(process_model.LegalProcessDB).filter(process_model.LegalProcessDB.client_id == client_id).count()
    if associated_processes > 0:
        raise HTTPException(
            status_code=400,
            detail="Client cannot be deleted as they are associated with one or more legal processes."
        )

    # for index, client in enumerate(db_clients): # Removido
    #     if client.id == client_id: # Removido
    #         db_clients.pop(index) # Removido
    #         return {"message": "Client deleted successfully"} # Removido
    db.delete(db_client)
    db.commit()
    return {"message": "Client deleted successfully"}


# CRUD Endpoints for Legal Processes

@app.post("/processes/", response_model=LegalProcess)
def create_legal_process(process_in: LegalProcessCreate, db: Session = Depends(get_db)): # Adicionado db
    # global process_id_counter # Removido
    # Validate lawyer_id
    lawyer = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.id == process_in.lawyer_id).first()
    if not lawyer:
        raise HTTPException(status_code=404, detail=f"Lawyer with id {process_in.lawyer_id} not found")
    # Validate client_id
    client = db.query(client_model.ClientDB).filter(client_model.ClientDB.id == process_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail=f"Client with id {process_in.client_id} not found")

    # process_id_counter += 1 # Removido
    # new_process = LegalProcess(id=process_id_counter, **process_in.model_dump()) # Removido
    # db_legal_processes.append(new_process) # Removido
    db_process = process_model.LegalProcessDB(**process_in.model_dump())
    db.add(db_process)
    db.commit()
    db.refresh(db_process)
    return db_process

@app.get("/processes/", response_model=List[LegalProcess])
def get_legal_processes(
    client_id: Optional[int] = None,
    lawyer_id: Optional[int] = None,
    action_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db) # Adicionado db
):
    # filtered_processes = db_legal_processes # Removido
    query = db.query(process_model.LegalProcessDB)
    if client_id is not None:
        # filtered_processes = [p for p in filtered_processes if p.client_id == client_id]
        query = query.filter(process_model.LegalProcessDB.client_id == client_id)
    if lawyer_id is not None:
        # filtered_processes = [p for p in filtered_processes if p.lawyer_id == lawyer_id]
        query = query.filter(process_model.LegalProcessDB.lawyer_id == lawyer_id)
    if action_type:
        # filtered_processes = [
        #     p for p in filtered_processes if p.action_type and action_type.lower() in p.action_type.lower()
        # ]
        query = query.filter(process_model.LegalProcessDB.action_type.contains(action_type))
    if status:
        # filtered_processes = [
        #     p for p in filtered_processes if p.status and status.lower() == p.status.lower()
        # ]
        query = query.filter(process_model.LegalProcessDB.status == status)
    # return filtered_processes
    return query.all()

@app.get("/processes/{process_id}", response_model=LegalProcess)
def get_legal_process(process_id: int, db: Session = Depends(get_db)): # Adicionado db
    # for process in db_legal_processes: # Removido
    #     if process.id == process_id: # Removido
    #         return process # Removido
    db_process = db.query(process_model.LegalProcessDB).filter(process_model.LegalProcessDB.id == process_id).first()
    if db_process is None:
        raise HTTPException(status_code=404, detail="Legal process not found")
    return db_process

@app.put("/processes/{process_id}", response_model=LegalProcess)
def update_legal_process(process_id: int, process_update: LegalProcessCreate, db: Session = Depends(get_db)): # Adicionado db
    # for index, process in enumerate(db_legal_processes): # Removido
    #     if process.id == process_id: # Removido
            # Validate lawyer_id if updated
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

            # updated_process = process.model_copy(update=process_update.model_dump(exclude_unset=True)) # Removido
            # db_legal_processes[index] = updated_process # Removido
            # return updated_process # Removido
    update_data = process_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_process, key, value)

    db.add(db_process)
    db.commit()
    db.refresh(db_process)
    return db_process

@app.delete("/processes/{process_id}")
def delete_legal_process(process_id: int, db: Session = Depends(get_db)): # Adicionado db
    # for index, process in enumerate(db_legal_processes): # Removido
    #     if process.id == process_id: # Removido
    #         db_legal_processes.pop(index) # Removido
    #         return {"message": "Legal process deleted successfully"} # Removido
    db_process = db.query(process_model.LegalProcessDB).filter(process_model.LegalProcessDB.id == process_id).first()
    if db_process is None:
        raise HTTPException(status_code=404, detail="Legal process not found")
    db.delete(db_process)
    db.commit()
    return {"message": "Legal process deleted successfully"}
