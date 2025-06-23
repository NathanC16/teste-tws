import os
import logging
from datetime import date, timedelta, datetime
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Carregar variáveis de ambiente do .env ANTES de importar outros módulos do projeto
load_dotenv()

import asyncio # Import asyncio
# Importações do projeto
from database import SessionLocal, engine, Base
from models.lawyer import LawyerDB
from models.client import ClientDB, AreaOfExpertiseEnum
from models.legal_process import LegalProcessDB
from core.security import get_password_hash # Para hashear senhas de teste
# Importar as versões async das funções de notificação
from core.notifications import check_and_notify_daily_deadlines_async, check_and_notify_upcoming_fatal_deadlines_async
from telegram_bot import TELEGRAM_BOT_TOKEN # Importar SOMENTE TELEGRAM_BOT_TOKEN

# Configuração básica de logging para o script de teste
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler() # Envia logs para o console
    ]
)
logger = logging.getLogger(__name__)

# --- Leitura das Configurações de Teste do Ambiente ---
# TELEGRAM_BOT_TOKEN já foi importado de telegram_bot.py (que o lê do .env)
APP_TELEGRAM_TEST_CHAT_ID = os.getenv("TELEGRAM_TEST_CHAT_ID")
APP_TELEGRAM_ADVANCE_NOTIFICATION_DAYS_STR = os.getenv("TELEGRAM_ADVANCE_NOTIFICATION_DAYS", "5")

try:
    APP_TELEGRAM_ADVANCE_NOTIFICATION_DAYS = int(APP_TELEGRAM_ADVANCE_NOTIFICATION_DAYS_STR)
except ValueError:
    logger.warning(
        f"Valor inválido para TELEGRAM_ADVANCE_NOTIFICATION_DAYS ('{APP_TELEGRAM_ADVANCE_NOTIFICATION_DAYS_STR}') no .env. Usando padrão de 5 dias."
    )
    APP_TELEGRAM_ADVANCE_NOTIFICATION_DAYS = 5

# Constantes para dados de teste
TEST_LAWYER_OAB = "99901SP" # OAB de teste corrigida para formato numérico válido
TEST_LAWYER_EMAIL = "telegram_tester@example.com"
TEST_LAWYER_NAME = "Advogado Teste Telegram"
TEST_CLIENT_NAME = "Cliente Teste Notificações" # Nome mais genérico

def verify_env_vars():
    """Verifica se as variáveis de ambiente críticas estão configuradas."""
    if not TELEGRAM_BOT_TOKEN:
        logger.error("ERRO CRÍTICO: TELEGRAM_BOT_TOKEN não encontrado no .env. O script não pode prosseguir.")
        return False
    if not APP_TELEGRAM_TEST_CHAT_ID:
        logger.warning(
            "AVISO: TELEGRAM_TEST_CHAT_ID não encontrado no .env. "
            "O advogado de teste não terá um ID de Telegram para enviar mensagens, "
            "o que afetará o teste de envio real."
        )
        # Não retornamos False aqui, pois o script pode prosseguir para testar a lógica de busca.
    else:
        logger.info(f"ID de chat para teste de notificações (lido do .env): {APP_TELEGRAM_TEST_CHAT_ID}")
    return True

def setup_test_data(db: Session):
    logger.info("Iniciando configuração de dados de teste...")

    # 1. Advogado de Teste
    lawyer = db.query(LawyerDB).filter(LawyerDB.oab == TEST_LAWYER_OAB).first()
    if not lawyer:
        logger.info(f"Criando advogado de teste: {TEST_LAWYER_NAME} (OAB: {TEST_LAWYER_OAB})")
        lawyer = LawyerDB(
            name=TEST_LAWYER_NAME,
            username="testtelegramuser", # USERNAME ADICIONADO
            oab=TEST_LAWYER_OAB,
            email=TEST_LAWYER_EMAIL,
            telegram_id=APP_TELEGRAM_TEST_CHAT_ID, # Usa o valor lido do .env
            hashed_password=get_password_hash("testpassword")
        )
        db.add(lawyer)
    else:
        logger.info(f"Advogado de teste {TEST_LAWYER_NAME} já existe. Verificando/Atualizando telegram_id e username.")
        updated = False
        if lawyer.telegram_id != APP_TELEGRAM_TEST_CHAT_ID:
            lawyer.telegram_id = APP_TELEGRAM_TEST_CHAT_ID
            logger.info(f"Telegram ID do advogado de teste atualizado para: {APP_TELEGRAM_TEST_CHAT_ID}")
            updated = True
        if not lawyer.username: # Adiciona username se não existir
            lawyer.username = "testtelegramuser"
            logger.info(f"Username do advogado de teste definido para: testtelegramuser")
            updated = True
        elif lawyer.username != "testtelegramuser": # Corrige se o username existir mas for diferente
            logger.warning(f"Advogado de teste encontrado com username '{lawyer.username}', atualizando para 'testtelegramuser'.")
            lawyer.username = "testtelegramuser"
            updated = True

        # if updated: # Commitar apenas se houve alteração (opcional, db.commit() lidará bem de qualquer forma)
        #     pass

    try:
        db.commit()
        db.refresh(lawyer)
        logger.info(f"Advogado de teste ID: {lawyer.id}, Telegram ID: {lawyer.telegram_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao commitar advogado de teste: {e}", exc_info=True)
        raise

    # 2. Cliente de Teste
    client = db.query(ClientDB).filter(ClientDB.name == TEST_CLIENT_NAME).first()
    if not client:
        logger.info(f"Criando cliente de teste: {TEST_CLIENT_NAME}")
        client = ClientDB(name=TEST_CLIENT_NAME, area_of_expertise=AreaOfExpertiseEnum.REGULATORIO.value) # Corrigido aqui
        db.add(client)
        try:
            db.commit()
            db.refresh(client)
            logger.info(f"Cliente de teste ID: {client.id}")
        except Exception as e:
            db.rollback()
            logger.error(f"Erro ao commitar cliente de teste: {e}", exc_info=True)
            raise
    else:
        logger.info(f"Cliente de teste '{TEST_CLIENT_NAME}' já existe. ID: {client.id}")


    # 3. Processos de Teste
    today = date.today()

    # Processo com prazo de entrega para hoje
    db.add(LegalProcessDB(
        process_number=f"TEST-TDAY-DEL-{datetime.now().strftime('%f')}", # Usar microsegundos para unicidade
        lawyer_id=lawyer.id, client_id=client.id,
        entry_date=today - timedelta(days=10), delivery_deadline=today,
        fatal_deadline=today + timedelta(days=30), status='ativo',
        action_type="Notif. Entrega Hoje"
    ))
    # Processo com prazo fatal para hoje
    db.add(LegalProcessDB(
        process_number=f"TEST-TDAY-FAT-{datetime.now().strftime('%f')}",
        lawyer_id=lawyer.id, client_id=client.id,
        entry_date=today - timedelta(days=40), delivery_deadline=today - timedelta(days=5),
        fatal_deadline=today, status='ativo',
        action_type="Notif. Fatal Hoje"
    ))
    # Processo com prazo fatal futuro (dentro da janela)
    upcoming_fatal_date = today + timedelta(days=APP_TELEGRAM_ADVANCE_NOTIFICATION_DAYS)
    db.add(LegalProcessDB(
        process_number=f"TEST-UPCOM-FAT-{datetime.now().strftime('%f')}",
        lawyer_id=lawyer.id, client_id=client.id,
        entry_date=today - timedelta(days=20), delivery_deadline=today + timedelta(days=10),
        fatal_deadline=upcoming_fatal_date, status='ativo',
        action_type=f"Notif. Fatal Futuro ({APP_TELEGRAM_ADVANCE_NOTIFICATION_DAYS}d)"
    ))
    # Processo com prazo fatal distante (FORA da janela)
    far_future_fatal_date = today + timedelta(days=APP_TELEGRAM_ADVANCE_NOTIFICATION_DAYS + 15)
    db.add(LegalProcessDB(
        process_number=f"TEST-FAR-FATAL-{datetime.now().strftime('%f')}",
        lawyer_id=lawyer.id, client_id=client.id,
        entry_date=today - timedelta(days=10), delivery_deadline=today + timedelta(days=APP_TELEGRAM_ADVANCE_NOTIFICATION_DAYS + 5),
        fatal_deadline=far_future_fatal_date, status='ativo',
        action_type="NÃO Notif. (Fatal Distante)"
    ))

    # Processo para advogado sem ID de Telegram (se houver outro advogado no DB)
    other_lawyer_no_tg = db.query(LawyerDB).filter(LawyerDB.oab != TEST_LAWYER_OAB, LawyerDB.telegram_id == None).first()
    if other_lawyer_no_tg:
        db.add(LegalProcessDB(
            process_number=f"TEST-NO-TGID-{datetime.now().strftime('%f')}",
            lawyer_id=other_lawyer_no_tg.id, client_id=client.id,
            entry_date=today - timedelta(days=5), delivery_deadline=today,
            fatal_deadline=today + timedelta(days=10), status='ativo',
            action_type="Notif. Advogado Sem TG ID"
        ))
        logger.info(f"Adicionado processo para advogado sem ID de Telegram: {other_lawyer_no_tg.name}")
    else:
        logger.info("Não foi encontrado/criado 'outro advogado' sem ID de Telegram para teste específico.")

    try:
        db.commit()
        logger.info("Dados de teste (processos) commitados com sucesso.")
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao commitar processos de teste: {e}", exc_info=True)
        raise
    logger.info("Configuração de dados de teste concluída.")


async def run_notification_checks_async(): # Renomeada para async e chamadas atualizadas
    logger.info("\n" + "="*60 + "\n== EXECUTANDO VERIFICAÇÃO DE PRAZOS DO DIA (ASYNC) ==\n" + "="*60)
    await check_and_notify_daily_deadlines_async()
    logger.info("\n" + "="*60 + "\n== VERIFICAÇÃO DE PRAZOS DO DIA (ASYNC) CONCLUÍDA ==\n" + "="*60)

    logger.info("\n\n") # Espaçamento

    logger.info("\n" + "="*60 + "\n== EXECUTANDO VERIFICAÇÃO DE PRAZOS FATAIS FUTUROS (ASYNC) ==\n" + "="*60)
    await check_and_notify_upcoming_fatal_deadlines_async()
    logger.info("\n" + "="*60 + "\n== VERIFICAÇÃO DE PRAZOS FATAIS FUTUROS (ASYNC) CONCLUÍDA ==\n" + "="*60)

if __name__ == "__main__":
    logger.info("Iniciando script de teste de notificações do Telegram...")

    if not verify_env_vars():
        exit(1) # Sai se o token do bot não estiver configurado

    # Garante que as tabelas existam
    Base.metadata.create_all(bind=engine)

    db = None # Inicializa db
    try:
        db = SessionLocal()
        setup_test_data(db)
        asyncio.run(run_notification_checks_async()) # Executar a função async com asyncio.run()
        logger.info("\nScript de teste de notificações concluído.")
        logger.info("Verifique os logs acima e seu chat do Telegram (se configurado para envio real).")
        logger.info("Os dados de teste permanecem no banco de dados para inspeção.")
    except Exception as e:
        logger.error(f"Ocorreu um erro geral durante a execução do script de teste: {e}", exc_info=True)
    finally:
        if db:
            db.close()
            logger.info("Sessão do banco de dados fechada.")
        else:
            logger.info("Sessão do banco de dados não foi aberta ou falhou ao abrir.")
