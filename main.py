from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import EmailStr

from datetime import date # Added
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import EmailStr

# Assuming models are in a directory named 'models'
from models.lawyer import Lawyer, LawyerCreate
from models.client import Client, ClientCreate
from models.legal_process import LegalProcess, LegalProcessCreate, LegalProcessBase # Added

app = FastAPI()

db_lawyers: List[Lawyer] = []
lawyer_id_counter = 0

db_clients: List[Client] = []
client_id_counter = 0

db_legal_processes: List[LegalProcess] = [] # Added
process_id_counter = 0 # Added

# Helper functions to check existence
def get_lawyer_by_id(lawyer_id: int) -> Optional[Lawyer]:
    for lawyer in db_lawyers:
        if lawyer.id == lawyer_id:
            return lawyer
    return None

def get_client_by_id(client_id: int) -> Optional[Client]:
    for client in db_clients:
        if client.id == client_id:
            return client
    return None


@app.post("/lawyers/", response_model=Lawyer)
def create_lawyer(lawyer_in: LawyerCreate):
    global lawyer_id_counter
    lawyer_id_counter += 1
    new_lawyer = Lawyer(id=lawyer_id_counter, **lawyer_in.model_dump())
    db_lawyers.append(new_lawyer)
    return new_lawyer

@app.get("/lawyers/", response_model=List[Lawyer])
def get_lawyers(name: Optional[str] = None, oab: Optional[str] = None):
    filtered_lawyers = db_lawyers
    if name:
        filtered_lawyers = [
            lawyer for lawyer in filtered_lawyers if name.lower() in lawyer.name.lower()
        ]
    if oab:
        filtered_lawyers = [
            lawyer for lawyer in filtered_lawyers if lawyer.oab == oab
        ]
    return filtered_lawyers

@app.get("/lawyers/{lawyer_id}", response_model=Lawyer)
def get_lawyer(lawyer_id: int):
    for lawyer in db_lawyers:
        if lawyer.id == lawyer_id:
            return lawyer
    raise HTTPException(status_code=404, detail="Lawyer not found")

@app.put("/lawyers/{lawyer_id}", response_model=Lawyer)
def update_lawyer(lawyer_id: int, lawyer_update: LawyerCreate):
    for index, lawyer in enumerate(db_lawyers):
        if lawyer.id == lawyer_id:
            updated_lawyer = lawyer.model_copy(update=lawyer_update.model_dump(exclude_unset=True))
            db_lawyers[index] = updated_lawyer
            return updated_lawyer
    raise HTTPException(status_code=404, detail="Lawyer not found")

@app.delete("/lawyers/{lawyer_id}")
def delete_lawyer(lawyer_id: int):
    # Check if lawyer is associated with any legal processes
    for process in db_legal_processes:
        if process.lawyer_id == lawyer_id:
            raise HTTPException(
                status_code=400,
                detail="Lawyer cannot be deleted as they are associated with one or more legal processes."
            )

    for index, lawyer in enumerate(db_lawyers):
        if lawyer.id == lawyer_id:
            db_lawyers.pop(index)
            return {"message": "Lawyer deleted successfully"}
    raise HTTPException(status_code=404, detail="Lawyer not found")


# CRUD Endpoints for Clients

@app.post("/clients/", response_model=Client)
def create_client(client_in: ClientCreate):
    global client_id_counter
    client_id_counter += 1
    new_client = Client(id=client_id_counter, **client_in.model_dump())
    db_clients.append(new_client)
    return new_client

@app.get("/clients/", response_model=List[Client])
def get_clients():
    return db_clients

@app.get("/clients/{client_id}", response_model=Client)
def get_client(client_id: int):
    for client in db_clients:
        if client.id == client_id:
            return client
    raise HTTPException(status_code=404, detail="Client not found")

@app.put("/clients/{client_id}", response_model=Client)
def update_client(client_id: int, client_update: ClientCreate):
    for index, client in enumerate(db_clients):
        if client.id == client_id:
            updated_client = client.model_copy(update=client_update.model_dump(exclude_unset=True))
            db_clients[index] = updated_client
            return updated_client
    raise HTTPException(status_code=404, detail="Client not found")

@app.delete("/clients/{client_id}")
def delete_client(client_id: int):
    # Check if client is associated with any legal processes
    for process in db_legal_processes:
        if process.client_id == client_id:
            raise HTTPException(
                status_code=400,
                detail="Client cannot be deleted as they are associated with one or more legal processes."
            )

    for index, client in enumerate(db_clients):
        if client.id == client_id:
            db_clients.pop(index)
            return {"message": "Client deleted successfully"}
    raise HTTPException(status_code=404, detail="Client not found")


# CRUD Endpoints for Legal Processes

@app.post("/processes/", response_model=LegalProcess)
def create_legal_process(process_in: LegalProcessCreate):
    global process_id_counter
    # Validate lawyer_id
    if not get_lawyer_by_id(process_in.lawyer_id):
        raise HTTPException(status_code=404, detail=f"Lawyer with id {process_in.lawyer_id} not found")
    # Validate client_id
    if not get_client_by_id(process_in.client_id):
        raise HTTPException(status_code=404, detail=f"Client with id {process_in.client_id} not found")

    process_id_counter += 1
    new_process = LegalProcess(id=process_id_counter, **process_in.model_dump())
    db_legal_processes.append(new_process)
    return new_process

@app.get("/processes/", response_model=List[LegalProcess])
def get_legal_processes(
    client_id: Optional[int] = None,
    lawyer_id: Optional[int] = None,
    action_type: Optional[str] = None,
    status: Optional[str] = None,
):
    filtered_processes = db_legal_processes
    if client_id is not None:
        filtered_processes = [p for p in filtered_processes if p.client_id == client_id]
    if lawyer_id is not None:
        filtered_processes = [p for p in filtered_processes if p.lawyer_id == lawyer_id]
    if action_type:
        filtered_processes = [
            p for p in filtered_processes if p.action_type and action_type.lower() in p.action_type.lower()
        ]
    if status:
        filtered_processes = [
            p for p in filtered_processes if p.status and status.lower() == p.status.lower()
        ]
    return filtered_processes

@app.get("/processes/{process_id}", response_model=LegalProcess)
def get_legal_process(process_id: int):
    for process in db_legal_processes:
        if process.id == process_id:
            return process
    raise HTTPException(status_code=404, detail="Legal process not found")

@app.put("/processes/{process_id}", response_model=LegalProcess)
def update_legal_process(process_id: int, process_update: LegalProcessCreate):
    for index, process in enumerate(db_legal_processes):
        if process.id == process_id:
            # Validate lawyer_id if updated
            if process_update.lawyer_id != process.lawyer_id and not get_lawyer_by_id(process_update.lawyer_id):
                raise HTTPException(status_code=404, detail=f"Lawyer with id {process_update.lawyer_id} not found")
            # Validate client_id if updated
            if process_update.client_id != process.client_id and not get_client_by_id(process_update.client_id):
                raise HTTPException(status_code=404, detail=f"Client with id {process_update.client_id} not found")

            updated_process = process.model_copy(update=process_update.model_dump(exclude_unset=True))
            db_legal_processes[index] = updated_process
            return updated_process
    raise HTTPException(status_code=404, detail="Legal process not found")

@app.delete("/processes/{process_id}")
def delete_legal_process(process_id: int):
    for index, process in enumerate(db_legal_processes):
        if process.id == process_id:
            db_legal_processes.pop(index)
            return {"message": "Legal process deleted successfully"}
    raise HTTPException(status_code=404, detail="Legal process not found")
