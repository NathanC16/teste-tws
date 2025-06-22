import os
import logging
from datetime import date, timedelta, datetime # Adicionado datetime
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Carregar variáveis de ambiente do .env ANTES de importar outros módulos do projeto
# que possam depender delas (como telegram_bot ou database)
load_dotenv()

from database import SessionLocal, engine, Base
from models.lawyer import LawyerDB
from models.client import ClientDB, AreaOfExpertiseEnum
from models.legal_process import LegalProcessDB
from core.security import get_password_hash
from core.notifications import check_and_notify_daily_deadlines, check_and_notify_upcoming_fatal_deadlines
from telegram_bot import TELEGRAM_BOT_TOKEN, TELEGRAM_TEST_CHAT_ID # Importar para verificação

# Configuração básica de logging para o script de teste
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler() # Envia logs para o console
    ]
)
logger = logging.getLogger(__name__)

# --- Configurações de Teste ---
# Estas serão usadas para criar dados de teste.
# O TELEGRAM_TEST_CHAT_ID é lido de telegram_bot.py, que por sua vez o lê do .env
# Use um ID de chat válido para onde o bot pode enviar mensagens.
TEST_LAWYER_OAB = "TEST001TG"
TEST_LAWYER_EMAIL = "telegram_tester@example.com"
TEST_LAWYER_NAME = "Advogado Teste Telegram"

# Verifique se as variáveis de ambiente necessárias estão configuradas
if not TELEGRAM_BOT_TOKEN:
    logger.error("ERRO CRÍTICO: TELEGRAM_BOT_TOKEN não encontrado no .env. O script não pode prosseguir com testes de envio.")
    exit()
if not TELEGRAM_TEST_CHAT_ID:
    logger.warning("AVISO: TELEGRAM_TEST_CHAT_ID não encontrado no .env. As mensagens serão enviadas para 'None', o que provavelmente falhará.")
    # Você pode decidir sair aqui se um chat_id de teste for obrigatório:
    # exit()
else:
    logger.info(f"ID de chat para teste de notificações: {TELEGRAM_TEST_CHAT_ID}")


def setup_test_data(db: Session):
    logger.info("Configurando dados de teste no banco de dados...")

    # 1. Criar/Obter Advogado de Teste
    lawyer = db.query(LawyerDB).filter(LawyerDB.oab == TEST_LAWYER_OAB).first()
    if not lawyer:
        logger.info(f"Criando advogado de teste: {TEST_LAWYER_NAME} com OAB {TEST_LAWYER_OAB}")
        lawyer = LawyerDB(
            name=TEST_LAWYER_NAME,
            oab=TEST_LAWYER_OAB,
            email=TEST_LAWYER_EMAIL,
            telegram_id=TELEGRAM_TEST_CHAT_ID, # Importante!
            hashed_password=get_password_hash("testpassword")
        )
        db.add(lawyer)
    else:
        logger.info(f"Advogado de teste {TEST_LAWYER_NAME} (OAB: {TEST_LAWYER_OAB}) já existe. Atualizando telegram_id se necessário.")
        if lawyer.telegram_id != TELEGRAM_TEST_CHAT_ID:
            lawyer.telegram_id = TELEGRAM_TEST_CHAT_ID # Garante que está com o ID de teste
            logger.info(f"Telegram ID do advogado de teste atualizado para: {TELEGRAM_TEST_CHAT_ID}")

    db.commit()
    db.refresh(lawyer)
    logger.info(f"Advogado de teste ID: {lawyer.id}, Telegram ID: {lawyer.telegram_id}")

    # 2. Criar Cliente de Teste (se não existir um genérico)
    client = db.query(ClientDB).filter(ClientDB.name == "Cliente Teste Notificações").first()
    if not client:
        client = ClientDB(name="Cliente Teste Notificações", area_of_expertise=AreaOfExpertiseEnum.REGULATORIO_ENERGIA.value)
        db.add(client)
        db.commit()
        db.refresh(client)
    logger.info(f"Cliente de teste ID: {client.id}")

    # 3. Criar Processos de Teste
    today = date.today()
    advance_days = int(os.getenv("TELEGRAM_ADVANCE_NOTIFICATION_DAYS", "5")) # Pega do .env ou usa default

    # Processo com prazo de entrega para hoje
    process_today_delivery = LegalProcessDB(
        process_number=f"NOTIF-TODAY-DELIV-{datetime.now().strftime('%H%M%S')}",
        lawyer_id=lawyer.id,
        client_id=client.id,
        entry_date=today - timedelta(days=10),
        delivery_deadline=today,
        fatal_deadline=today + timedelta(days=30),
        status='ativo',
        action_type="Teste Notificação Entrega Hoje"
    )
    db.add(process_today_delivery)
    logger.info(f"Criado processo para entrega hoje: {process_today_delivery.process_number}")

    # Processo com prazo fatal para hoje
    process_today_fatal = LegalProcessDB(
        process_number=f"NOTIF-TODAY-FATAL-{datetime.now().strftime('%H%M%S')}",
        lawyer_id=lawyer.id,
        client_id=client.id,
        entry_date=today - timedelta(days=40),
        delivery_deadline=today - timedelta(days=5),
        fatal_deadline=today,
        status='ativo',
        action_type="Teste Notificação Fatal Hoje"
    )
    db.add(process_today_fatal)
    logger.info(f"Criado processo fatal hoje: {process_today_fatal.process_number}")

    # Processo com prazo fatal futuro (dentro da janela de notificação)
    upcoming_fatal_date = today + timedelta(days=advance_days)
    process_upcoming_fatal = LegalProcessDB(
        process_number=f"NOTIF-UPCOM-FATAL-{datetime.now().strftime('%H%M%S')}",
        lawyer_id=lawyer.id,
        client_id=client.id,
        entry_date=today - timedelta(days=20),
        delivery_deadline=today + timedelta(days=10),
        fatal_deadline=upcoming_fatal_date,
        status='ativo',
        action_type=f"Teste Notificação Fatal Futuro ({advance_days} dias)"
    )
    db.add(process_upcoming_fatal)
    logger.info(f"Criado processo fatal futuro ({upcoming_fatal_date.strftime('%d/%m/%Y')}): {process_upcoming_fatal.process_number}")

    # Processo com prazo fatal FORA da janela de notificação (não deve notificar sobre este)
    far_future_fatal_date = today + timedelta(days=advance_days + 15)
    process_far_future_fatal = LegalProcessDB(
        process_number=f"NOTIF-FAR-FATAL-{datetime.now().strftime('%H%M%S')}",
        lawyer_id=lawyer.id,
        client_id=client.id,
        entry_date=today - timedelta(days=10),
        delivery_deadline=today + timedelta(days=advance_days + 5),
        fatal_deadline=far_future_fatal_date,
        status='ativo',
        action_type="Teste Não Notificar (Fatal Distante)"
    )
    db.add(process_far_future_fatal)
    logger.info(f"Criado processo fatal distante ({far_future_fatal_date.strftime('%d/%m/%Y')}): {process_far_future_fatal.process_number}")

    # Processo para advogado sem ID de telegram (se houver outro advogado no DB)
    other_lawyer = db.query(LawyerDB).filter(LawyerDB.oab != TEST_LAWYER_OAB, LawyerDB.telegram_id == None).first()
    if other_lawyer:
        process_no_telegram_id = LegalProcessDB(
            process_number=f"NOTIF-NO-TGID-{datetime.now().strftime('%H%M%S')}",
            lawyer_id=other_lawyer.id,
            client_id=client.id,
            entry_date=today - timedelta(days=5),
            delivery_deadline=today, # Prazo para hoje
            fatal_deadline=today + timedelta(days=10),
            status='ativo',
            action_type="Teste Advogado Sem Telegram ID"
        )
        db.add(process_no_telegram_id)
        logger.info(f"Criado processo para advogado sem ID de Telegram ({other_lawyer.name}): {process_no_telegram_id.process_number}")
    else:
        logger.info("Não foi encontrado um 'outro advogado' sem ID de Telegram para teste específico, ou todos têm ID.")


    db.commit()
    logger.info("Dados de teste configurados.")


def run_notification_checks():
    logger.info("==================================================================")
    logger.info("== EXECUTANDO VERIFICAÇÃO DE PRAZOS DO DIA ==")
    logger.info("==================================================================")
    check_and_notify_daily_deadlines()
    logger.info("==================================================================")
    logger.info("== VERIFICAÇÃO DE PRAZOS DO DIA CONCLUÍDA ==")
    logger.info("==================================================================")

    logger.info("\n\n") # Espaçamento para clareza

    logger.info("==================================================================")
    logger.info("== EXECUTANDO VERIFICAÇÃO DE PRAZOS FATAIS FUTUROS ==")
    logger.info("==================================================================")
    check_and_notify_upcoming_fatal_deadlines()
    logger.info("==================================================================")
    logger.info("== VERIFICAÇÃO DE PRAZOS FATAIS FUTUROS CONCLUÍDA ==")
    logger.info("==================================================================")


if __name__ == "__main__":
    logger.info("Iniciando script de teste de notificações do Telegram...")

    # Garante que as tabelas existam (especialmente útil se rodar contra um DB vazio pela primeira vez)
    # Isso não deve apagar dados existentes como o seed_db.py faz.
    Base.metadata.create_all(bind=engine)

    db_session = SessionLocal()
    try:
        if not TELEGRAM_BOT_TOKEN or not TELEGRAM_TEST_CHAT_ID:
            logger.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            logger.error("!!! TOKEN DO BOT OU CHAT ID DE TESTE NÃO CONFIGURADOS NO .ENV !!!")
            logger.error("!!! O teste de ENVIO REAL de mensagens será afetado.              !!!")
            logger.error("!!! Verifique seu arquivo .env e as variáveis:                   !!!")
            logger.error("!!!   TELEGRAM_BOT_TOKEN                                         !!!")
            logger.error("!!!   TELEGRAM_TEST_CHAT_ID                                      !!!")
            logger.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            # Decide se quer continuar apenas com a lógica de busca e log, ou parar.
            # Por agora, vamos continuar para ver os logs de busca.
            # if input("Deseja continuar mesmo assim (S/N)? ").lower() != 's':
            #     exit()

        setup_test_data(db_session)
        run_notification_checks()
        logger.info("Script de teste de notificações concluído.")
        logger.info("Verifique os logs acima e seu chat do Telegram (se configurado para envio real).")
        logger.info("Os dados de teste permanecem no banco de dados.")
    except Exception as e:
        logger.error(f"Ocorreu um erro geral no script de teste: {e}", exc_info=True)
    finally:
        db_session.close()
        logger.info("Sessão do banco de dados fechada.")
