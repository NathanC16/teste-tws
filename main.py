from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, status # Adicionado status
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

# Scheduler imports
import asyncio # Import asyncio for running async jobs if needed from sync context
from apscheduler.schedulers.background import BackgroundScheduler
# Importar as versões async das funções de notificação
from core.notifications import check_and_notify_daily_deadlines_async, check_and_notify_upcoming_fatal_deadlines_async
import logging # Import logging

app = FastAPI(title="Gerenciador de Processos Jurídicos")

# Configure logging for APScheduler
apscheduler_logger = logging.getLogger('apscheduler')
apscheduler_logger.setLevel(logging.WARNING) # Set to WARNING or ERROR for less verbose logs in production

# Scheduler instance
scheduler = BackgroundScheduler(timezone="America/Sao_Paulo") # Use a relevant timezone

@app.on_event("startup")
async def startup_event():
    app_logger = logging.getLogger(__name__)

    # --- Criação automática do Admin User ---
    db: Session = next(get_db()) # Obtém uma sessão de DB
    try:
        admin_oab = "00001SP"
        admin_username = "admin"
        admin_user = db.query(lawyer_model.LawyerDB).filter(
            (lawyer_model.LawyerDB.oab == admin_oab) | (lawyer_model.LawyerDB.username == admin_username)
        ).first()

        if not admin_user:
            app_logger.info(f"Usuário admin (OAB: {admin_oab} / Username: {admin_username}) não encontrado. Criando...")
            hashed_password = get_password_hash("admin")
            new_admin = lawyer_model.LawyerDB(
                name="Admin User",
                oab=admin_oab,
                email="admin@example.com", # Email padrão
                username=admin_username,
                hashed_password=hashed_password,
                telegram_id=None # Admin não precisa de ID de telegram por padrão
            )
            db.add(new_admin)
            db.commit()
            app_logger.info(f"Usuário admin (OAB: {admin_oab} / Username: {admin_username}) criado com sucesso.")
        else:
            app_logger.info(f"Usuário admin (OAB: {admin_user.oab} / Username: {admin_user.username}) já existe.")
    except Exception as e:
        app_logger.error(f"Erro durante a criação/verificação do usuário admin no startup: {e}", exc_info=True)
        db.rollback() # Garante rollback em caso de erro durante a criação do admin
    finally:
        db.close() # Fecha a sessão do DB usada para o admin
    # --- Fim da Criação automática do Admin User ---

    # --- Criação automática do Usuário "advogado" para Testes ---
    db_test_user: Session = next(get_db())
    try:
        test_user_username = "advogado"
        test_user_oab = "12345SP" # OAB válida e única para teste
        test_user_email = "advogado@example.com"

        # Verificar se já existe por username ou OAB ou email
        existing_test_user = db_test_user.query(lawyer_model.LawyerDB).filter(
            (lawyer_model.LawyerDB.username == test_user_username) |
            (lawyer_model.LawyerDB.oab == test_user_oab) |
            (lawyer_model.LawyerDB.email == test_user_email)
        ).first()

        if not existing_test_user:
            app_logger.info(f"Usuário de teste (Username: {test_user_username} / OAB: {test_user_oab}) não encontrado. Criando...")
            hashed_password_test_user = get_password_hash("advogado")
            new_test_user = lawyer_model.LawyerDB(
                name="Advogado de Teste",
                oab=test_user_oab,
                email=test_user_email,
                username=test_user_username,
                hashed_password=hashed_password_test_user,
                telegram_id=None
            )
            db_test_user.add(new_test_user)
            db_test_user.commit()
            app_logger.info(f"Usuário de teste (Username: {test_user_username} / OAB: {test_user_oab}) criado com sucesso.")
        else:
            app_logger.info(f"Usuário de teste (Username: {existing_test_user.username} / OAB: {existing_test_user.oab}) já existe.")
    except IntegrityError as ie:
        app_logger.warning(f"IntegrityError ao tentar criar usuário de teste (pode já existir parcialmente ou conflito de dados únicos): {ie}")
        db_test_user.rollback()
    except Exception as e:
        app_logger.error(f"Erro durante a criação/verificação do usuário de teste no startup: {e}", exc_info=True)
        db_test_user.rollback()
    finally:
        db_test_user.close() # Fecha a sessão do DB usada para o usuário de teste
    # --- Fim da Criação automática do Usuário "advogado" ---

    # Initialize Telegram bot
    # Import here to avoid circular imports if telegram_bot itself imports something from main at module level
    from telegram_bot import create_telegram_application, start_command_handler, help_command_handler # Updated import
    from telegram.ext import CommandHandler # Added import

    telegram_app = create_telegram_application()
    if telegram_app:
        app.state.telegram_app = telegram_app # Store the application instance
        app.state.telegram_bot = telegram_app.bot # Store the bot instance for convenience

        # Add command handlers
        telegram_app.add_handler(CommandHandler("start", start_command_handler))
        telegram_app.add_handler(CommandHandler("help", help_command_handler))
        # Add other handlers here if needed in the future

        # Initialize and start polling in the background
        # Wrap run_polling in a way that it can be managed by FastAPI's lifecycle
        async def run_telegram_polling():
            try:
                await telegram_app.initialize()
                await telegram_app.updater.start_polling() # type: ignore
                await telegram_app.start()
                app_logger.info("Telegram bot polling started successfully.")
                # Keep it running in the background.
                # The application itself (FastAPI) will keep the event loop alive.
                # We just need this task to continue running.
                # A common pattern is to await a future that never completes,
                # or simply let it run until shutdown.
                # For PTB, start_polling itself will run until stopped.
            except Exception as e:
                app_logger.error(f"Error starting Telegram bot polling: {e}", exc_info=True)

        # Schedule the polling task to run in the background
        app.state.telegram_polling_task = asyncio.create_task(run_telegram_polling())
        app_logger.info("Telegram bot application created and polling task scheduled.")
    else:
        app.state.telegram_app = None
        app.state.telegram_bot = None
        app_logger.error("Failed to create Telegram application. Bot will not run.")
        # Optionally, raise an error or prevent FastAPI startup if bot is critical
        # raise RuntimeError("Failed to initialize Telegram Bot, application cannot start.")


    # Schedule jobs
    # For daily deadlines, run once a day, e.g., at 8:00 AM
    if app.state.telegram_bot:
        scheduler.add_job(
            check_and_notify_daily_deadlines_async,
            'cron',
            hour=8,
            minute=0,
            misfire_grace_time=600,
            args=[app.state.telegram_bot] # Pass the bot instance
        )
        app_logger.info("Scheduled daily deadline notifications job with bot instance.")

        # For upcoming fatal deadlines, run once a day, e.g., at 8:30 AM
        scheduler.add_job(
            check_and_notify_upcoming_fatal_deadlines_async,
            'cron',
            hour=8,
            minute=30,
            misfire_grace_time=600,
            args=[app.state.telegram_bot] # Pass the bot instance
        )
        app_logger.info("Scheduled upcoming fatal deadline notifications job with bot instance.")
    else:
        app_logger.warning("Telegram bot instance not available. Notification jobs not scheduled.")

    # Example for testing (run more frequently):
    # if app.state.telegram_bot:
    #     scheduler.add_job(check_and_notify_daily_deadlines_async, 'interval', minutes=2, id="daily_deadline_test", args=[app.state.telegram_bot])
    # scheduler.add_job(check_and_notify_upcoming_fatal_deadlines_async, 'interval', minutes=3, id="upcoming_deadline_test")

    if not scheduler.running:
        scheduler.start()
        app_logger.info("Scheduler started and jobs added.")
        print("Scheduler started and jobs added for notifications.")
    else:
        app_logger.info("Scheduler already running.")
        print("Scheduler already running.")

@app.on_event("shutdown")
async def shutdown_event(): # Changed to async
    app_logger = logging.getLogger(__name__)
    if scheduler.running:
       scheduler.shutdown()
       app_logger.info("Scheduler shut down successfully.")
       print("Scheduler shut down successfully.")
    else:
       app_logger.info("Scheduler was not running or already shut down.")
       print("Scheduler was not running or already shut down.")

    # Shutdown Telegram bot application
    if hasattr(app.state, 'telegram_polling_task') and app.state.telegram_polling_task:
        app_logger.info("Attempting to stop Telegram bot polling task...")
        # How to properly stop depends on how run_telegram_polling is structured.
        # If telegram_app.updater.stop() is sufficient and start_polling() respects it:
        telegram_app_instance = getattr(app.state, 'telegram_app', None)
        if telegram_app_instance and telegram_app_instance.updater and telegram_app_instance.updater.running: # type: ignore
            await telegram_app_instance.updater.stop() # type: ignore
            app_logger.info("Telegram updater.stop() called.")

        # Cancel the task if it's still running and wait for it
        # This might be redundant if updater.stop() causes the task to exit cleanly
        if not app.state.telegram_polling_task.done():
            app.state.telegram_polling_task.cancel()
            try:
                await app.state.telegram_polling_task
                app_logger.info("Telegram polling task cancelled and awaited.")
            except asyncio.CancelledError:
                app_logger.info("Telegram polling task successfully cancelled (as expected).")
            except Exception as e:
                app_logger.error(f"Error during Telegram polling task cancellation: {e}", exc_info=True)
        else:
            app_logger.info("Telegram polling task was already done.")

    if hasattr(app.state, 'telegram_app') and app.state.telegram_app:
        app_logger.info("Attempting to shut down Telegram application...")
        telegram_app_instance = app.state.telegram_app
        try:
            if telegram_app_instance.running: # Check if it's running before stopping
                await telegram_app_instance.stop()
            await telegram_app_instance.shutdown()
            app_logger.info("Telegram application shut down successfully.")
        except Exception as e:
            app_logger.error(f"Error during Telegram application shutdown: {e}", exc_info=True)
    else:
        app_logger.info("No Telegram application instance found in app.state to shut down.")

# Include routers
app.include_router(auth_router.router)
from routers import admin as admin_router # Importar o novo router admin
app.include_router(admin_router.router) # Incluir o router admin

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
    is_admin = (current_user.oab == "00001SP" or current_user.username == "admin")
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem criar novos advogados."
        )

    # A lógica abaixo permanece, pois é para criação pelo admin
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
    # placeholder_hashed_password = get_password_hash("default_password_needs_change") # Removido
    # Nickname (username) é agora obrigatório e vem de lawyer_in.username
    # Senha padrão para novos advogados criados pelo admin
    default_password_for_new_lawyers = "advogado"
    hashed_password = get_password_hash(default_password_for_new_lawyers)

    # Adicionar verificação de unicidade do username (Nickname)
    existing_lawyer_username = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.username == lawyer_in.username).first()
    if existing_lawyer_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nickname (username) já registrado."
        )

    db_lawyer = lawyer_model.LawyerDB(
        **lawyer_in.model_dump(),
        hashed_password=hashed_password # Senha padrão "advogado"
    )
    db.add(db_lawyer)
    try:
        db.commit()
        db.refresh(db_lawyer)
    except IntegrityError: # Captura outras violações de unicidade (OAB, email) que podem não ter sido pegas acima
        db.rollback()
        # A mensagem de erro do Pydantic para username já é específica.
        # Esta é uma mensagem genérica para OAB/email se a verificação explícita falhar ou para outras constraints.
        raise HTTPException(status_code=400, detail="Erro ao criar advogado. Verifique se OAB, Email ou Nickname já existem.")
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
    is_admin = (current_user.oab == "00001SP" or current_user.username == "admin")
    if not is_admin:
        # Um não-admin não pode atualizar outros advogados.
        # A atualização do próprio perfil (nome, email, telegram, senha) é feita via /auth/users/me/settings
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem atualizar dados de advogados."
        )

    # Lógica de atualização (apenas para admin)
    db_lawyer_to_update = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.id == lawyer_id).first()
    if db_lawyer_to_update is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Advogado não encontrado.")

    update_data = lawyer_update.model_dump(exclude_unset=True)

    # Verificar duplicação de email ou OAB se estiverem sendo alterados
    if 'email' in update_data and update_data['email'] != db_lawyer_to_update.email:
        existing_email = db.query(lawyer_model.LawyerDB).filter(
            lawyer_model.LawyerDB.email == update_data['email'],
            lawyer_model.LawyerDB.id != lawyer_id # Excluir o próprio usuário da checagem
        ).first()
        if existing_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já registrado por outro usuário.")

    if 'oab' in update_data and update_data['oab'] != db_lawyer_to_update.oab:
        existing_oab = db.query(lawyer_model.LawyerDB).filter(
            lawyer_model.LawyerDB.oab == update_data['oab'],
            lawyer_model.LawyerDB.id != lawyer_id # Excluir o próprio usuário da checagem
        ).first()
        if existing_oab:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAB já registrada por outro usuário.")
        if db_lawyer_to_update.oab == "00001SP" and update_data['oab'] != "00001SP": # Protege OAB do admin
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A OAB do administrador principal não pode ser alterada para um valor diferente de '00001SP'.")

    # Verificar e lidar com a atualização do username (Nickname)
    if 'username' in update_data and update_data['username'] != db_lawyer_to_update.username:
        # Admin não pode mudar o username do "Admin User" por aqui.
        if db_lawyer_to_update.username == "admin" and update_data['username'] != "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O Nickname (username) do administrador principal ('admin') não pode ser alterado por este endpoint.")

        existing_username = db.query(lawyer_model.LawyerDB).filter(
            lawyer_model.LawyerDB.username == update_data['username'],
            lawyer_model.LawyerDB.id != lawyer_id # Excluir o próprio usuário da checagem
        ).first()
        if existing_username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nickname (username) já registrado por outro usuário.")

    for key, value in update_data.items():
        setattr(db_lawyer_to_update, key, value)

    db.add(db_lawyer_to_update)
    db.commit()
    db.refresh(db_lawyer_to_update)
    return db_lawyer_to_update

@app.delete("/lawyers/{lawyer_id}")
def delete_lawyer(lawyer_id: int, db: Session = Depends(get_db), current_user: lawyer_model.LawyerDB = Depends(get_current_user)):
    is_admin = (current_user.oab == "00001SP" or current_user.username == "admin")
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem excluir advogados."
        )

    db_lawyer_to_delete = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.id == lawyer_id).first()
    if db_lawyer_to_delete is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Advogado não encontrado.")

    # Proteção para não excluir o admin principal
    if db_lawyer_to_delete.oab == "00001SP" or db_lawyer_to_delete.username == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="O usuário admin principal não pode ser excluído."
        )

    # Verificar processos associados
    associated_processes = db.query(process_model.LegalProcessDB).filter(process_model.LegalProcessDB.lawyer_id == lawyer_id).count()
    if associated_processes > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, # Usar status
            detail="Lawyer cannot be deleted as they are associated with one or more legal processes."
        )

    db.delete(db_lawyer)
    db.commit()
    return {"message": "Lawyer deleted successfully"}


# CRUD Endpoints for Clients

@app.post("/clients/", response_model=Client)
def create_client(client_in: ClientCreate, db: Session = Depends(get_db), current_user: lawyer_model.LawyerDB = Depends(get_current_user)): # Alterado para lawyer_model.LawyerDB
    is_admin = (current_user.oab == "00001SP" or current_user.username == "admin")
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem criar novos clientes."
        )

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
def update_client(client_id: int, client_update: ClientCreate, db: Session = Depends(get_db), current_user: lawyer_model.LawyerDB = Depends(get_current_user)): # Alterado
    is_admin = (current_user.oab == "00001SP" or current_user.username == "admin")
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem atualizar dados de clientes."
        )

    db_client_to_update = db.query(client_model.ClientDB).filter(client_model.ClientDB.id == client_id).first()
    if db_client_to_update is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")

    update_data = client_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_client_to_update, key, value)

    db.add(db_client_to_update)
    # Adicionar tratamento de erro para unicidade de nome de cliente, se aplicável
    try:
        db.commit()
        db.refresh(db_client_to_update)
    except IntegrityError: # Exemplo: se o nome do cliente for unique
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Erro ao atualizar cliente. Dados duplicados (ex: nome).")
    return db_client_to_update

@app.delete("/clients/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db), current_user: lawyer_model.LawyerDB = Depends(get_current_user)): # Alterado
    is_admin = (current_user.oab == "00001SP" or current_user.username == "admin")
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem excluir clientes."
        )

    db_client_to_delete = db.query(client_model.ClientDB).filter(client_model.ClientDB.id == client_id).first()
    if db_client_to_delete is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")

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
def create_legal_process(process_in: LegalProcessCreate, db: Session = Depends(get_db), current_user: lawyer_model.LawyerDB = Depends(get_current_user)): # Alterado para lawyer_model.LawyerDB

    is_admin = (current_user.oab == "00001SP" or current_user.username == "admin")
    final_lawyer_id = current_user.id

    if is_admin:
        # Se for admin, pode definir o lawyer_id a partir do payload, mas precisa existir
        if process_in.lawyer_id:
            target_lawyer = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.id == process_in.lawyer_id).first()
            if not target_lawyer:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Advogado com id {process_in.lawyer_id} não encontrado.")
            final_lawyer_id = process_in.lawyer_id
        else:
            # Se admin não fornecer lawyer_id, pode-se atribuir a ele mesmo ou levantar erro.
            # Por ora, vamos atribuir ao admin que está criando, ou exigir que seja explícito.
            # Para simplificar, se admin e não especifica, usa o próprio ID do admin.
            final_lawyer_id = current_user.id
            # Ou: raise HTTPException(status_code=400, detail="Admin deve especificar um lawyer_id para o processo.")
    else:
        # Se não for admin, o lawyer_id é SEMPRE o do usuário logado
        final_lawyer_id = current_user.id
        if process_in.lawyer_id is not None and process_in.lawyer_id != current_user.id:
            # Logar um aviso ou simplesmente ignorar, como decidido (ignorar e sobrescrever)
            app_logger = logging.getLogger(__name__)
            app_logger.warning(f"Usuário não-admin {current_user.username} tentou criar processo para lawyer_id {process_in.lawyer_id}. Será sobrescrito para {current_user.id}.")

    # Validar client_id
    client = db.query(client_model.ClientDB).filter(client_model.ClientDB.id == process_in.client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Cliente com id {process_in.client_id} não encontrado.")

    # Criar o dicionário de dados para o novo processo, garantindo o lawyer_id correto
    process_data = process_in.model_dump()
    process_data['lawyer_id'] = final_lawyer_id

    db_process = process_model.LegalProcessDB(**process_data)
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
    status: Optional[str] = None, # Este 'status' é o parâmetro de filtro, não o módulo fastapi.status
    fatal_deadline_de: Optional[date] = None,
    fatal_deadline_ate: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: lawyer_model.LawyerDB = Depends(get_current_user) # Alterado para lawyer_model.LawyerDB
):
    from core.analytics import calculate_lawyer_delay_statistics, get_process_delay_risk

    query = db.query(process_model.LegalProcessDB)

    # Se o usuário não for admin, filtre sempre pelos seus próprios processos
    # e ignore qualquer filtro lawyer_id que venha da query string.
    is_admin = (current_user.oab == "00001SP" or current_user.username == "admin")

    if not is_admin:
        query = query.filter(process_model.LegalProcessDB.lawyer_id == current_user.id)
    elif lawyer_id is not None: # Se for admin, permitir filtrar por lawyer_id
        query = query.filter(process_model.LegalProcessDB.lawyer_id == lawyer_id)

    if client_id is not None:
        query = query.filter(process_model.LegalProcessDB.client_id == client_id)
    if action_type:
        query = query.filter(process_model.LegalProcessDB.action_type.contains(action_type))
    if status: # Este 'status' é o parâmetro de filtro
        query = query.filter(process_model.LegalProcessDB.status == status)
    if fatal_deadline_de:
        query = query.filter(process_model.LegalProcessDB.fatal_deadline >= fatal_deadline_de)
    if fatal_deadline_ate:
        query = query.filter(process_model.LegalProcessDB.fatal_deadline <= fatal_deadline_ate)

    processes_db = query.all()

    # Calcular estatísticas de atraso dos advogados
    # Idealmente, isso poderia ser cacheado ou calculado menos frequentemente se for custoso
    lawyer_delay_stats = calculate_lawyer_delay_statistics(db)

    # Enriquecer cada processo com o risco de atraso
    processes_with_risk = []
    for process_db_item in processes_db:
        # Converter o objeto SQLAlchemy para o modelo Pydantic LegalProcess
        # para que possamos adicionar o campo delay_risk.
        # O FastAPI faria isso automaticamente na serialização da resposta,
        # mas como precisamos modificar o objeto antes, fazemos manualmente.
        process_pydantic = LegalProcess.model_validate(process_db_item) # Usar model_validate em Pydantic v2

        lawyer_stats_for_process = lawyer_delay_stats.get(process_db_item.lawyer_id)

        if lawyer_stats_for_process:
            # A função get_process_delay_risk em analytics.py espera lawyer_id e o dict de stats completo
            process_pydantic.delay_risk = get_process_delay_risk(process_db_item.lawyer_id, lawyer_delay_stats)
        else:
            process_pydantic.delay_risk = "N/A" # Advogado não encontrado no dict de estatísticas (improvável se stats são de todos os advogados)

        processes_with_risk.append(process_pydantic)

    return processes_with_risk

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processo legal não encontrado")

    is_admin = (current_user.oab == "00001SP" or current_user.username == "admin")

    # Se não for admin, verificar se é o dono do processo
    if not is_admin and db_process.lawyer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Não autorizado a modificar este processo.")

    update_data = process_update.model_dump(exclude_unset=True)

    # Se não for admin, impedir a alteração do lawyer_id
    if not is_admin and 'lawyer_id' in update_data and update_data['lawyer_id'] != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Não autorizado a alterar o advogado responsável deste processo.")

    # Se for admin e tentar mudar lawyer_id, validar o novo advogado
    if is_admin and 'lawyer_id' in update_data and update_data['lawyer_id'] != db_process.lawyer_id:
        new_lawyer = db.query(lawyer_model.LawyerDB).filter(lawyer_model.LawyerDB.id == update_data['lawyer_id']).first()
        if not new_lawyer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Novo advogado com id {update_data['lawyer_id']} não encontrado.")

    # Validar client_id se estiver sendo alterado
    if 'client_id' in update_data and update_data['client_id'] != db_process.client_id:
        new_client = db.query(client_model.ClientDB).filter(client_model.ClientDB.id == update_data['client_id']).first()
        if not new_client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Novo cliente com id {update_data['client_id']} não encontrado.")

    for key, value in update_data.items():
        setattr(db_process, key, value)

    db.add(db_process)
    db.commit()
    db.refresh(db_process)
    return db_process

@app.delete("/processes/{process_id}")
def delete_legal_process(process_id: int, db: Session = Depends(get_db), current_user: lawyer_model.LawyerDB = Depends(get_current_user)): # Alterado para lawyer_model.LawyerDB
    db_process = db.query(process_model.LegalProcessDB).filter(process_model.LegalProcessDB.id == process_id).first()
    if db_process is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processo legal não encontrado")

    is_admin = (current_user.oab == "00001SP" or current_user.username == "admin")

    # Se não for admin, verificar se é o dono do processo
    if not is_admin and db_process.lawyer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Não autorizado a excluir este processo.")

    db.delete(db_process)
    db.commit()
    return {"message": "Processo legal excluído com sucesso"}
