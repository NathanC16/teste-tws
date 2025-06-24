import logging
import asyncio # Importa asyncio
from datetime import date, timedelta
from sqlalchemy.orm import Session, joinedload
import telegram # Adicionado import para type hint
from models.legal_process import LegalProcessDB
from models.lawyer import LawyerDB
from telegram_bot import send_telegram_message, TELEGRAM_ADVANCE_NOTIFICATION_DAYS
from database import SessionLocal

logger = logging.getLogger(__name__)

def get_db_session():
    """Dependência para obter uma sessão de BD."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_and_notify_daily_deadlines(): # NOTE: This function seems unused after async versions were introduced. Consider removal or refactor if still needed.
    """
    Verifica processos com prazos para hoje e notifica o advogado responsável.
    """
    db_gen = get_db_session()
    db: Session = next(db_gen)
    today = date.today()

    logger.info(f"Verificando prazos do dia: {today.strftime('%d/%m/%Y')}")

    try:
        processes_due_today = db.query(LegalProcessDB).options(
            joinedload(LegalProcessDB.lawyer),
            joinedload(LegalProcessDB.client)
        ).filter(
            LegalProcessDB.status == 'ativo',
            (LegalProcessDB.delivery_deadline == today) | (LegalProcessDB.fatal_deadline == today)
        ).all()

        if not processes_due_today:
            logger.info("Nenhum processo com prazo para hoje.")
            return

        for process in processes_due_today:
            lawyer = process.lawyer
            client_name = process.client.name if process.client else "Cliente não especificado"

            if lawyer and lawyer.telegram_id:
                deadline_type = []
                if process.delivery_deadline == today:
                    deadline_type.append("Entrega")
                if process.fatal_deadline == today:
                    deadline_type.append("Fatal")

                deadline_type_str = " e ".join(deadline_type)

                message = (
                    f"📢 ALERTA DE PRAZO PARA HOJE ({today.strftime('%d/%m/%Y')})!\n\n"
                    f"📄 Nº Processo: {process.process_number}\n"
                    f"👤 Cliente: {client_name}\n"
                    f"⚖️ Tipo de Prazo: {deadline_type_str}\n"
                    f"📝 Ação: {process.action_type or 'Não especificada'}"
                )

                logger.info(f"Preparando para enviar notificação para Adv. {lawyer.name} (TG ID: {lawyer.telegram_id}) sobre processo {process.process_number}")
                send_telegram_message(lawyer.telegram_id, message) # Esta função send_telegram_message precisaria ser a versão síncrona ou adaptada.
                # logger.info(f"SIMULAÇÃO DE NOTIFICAÇÃO: Para {lawyer.name} ({lawyer.telegram_id}) - Processo {process.process_number} - Prazo {deadline_type_str} para HOJE.")

            elif not lawyer:
                logger.warning(f"Processo {process.process_number} (ID: {process.id}) não possui advogado responsável cadastrado.")
            elif not lawyer.telegram_id:
                logger.info(f"Advogado {lawyer.name} (ID: {lawyer.id}) do processo {process.process_number} não possui Telegram ID cadastrado.")

    except Exception as e:
        logger.error(f"Erro ao verificar prazos do dia: {e}", exc_info=True)
    finally:
        next(db_gen, None) # Garante que o finally do gerador de sessão seja chamado.


async def check_and_notify_daily_deadlines_async(bot: telegram.Bot):
    """
    Verifica processos com prazos para hoje e notifica o advogado responsável. (Versão Async)

    Args:
        bot (telegram.Bot): A instância do bot do Telegram.
    """
    if not bot:
        logger.error("[ASYNC] Instância do bot do Telegram não fornecida para check_and_notify_daily_deadlines_async. Ignorando.")
        return

    db_gen = get_db_session()
    db: Session = next(db_gen)
    today = date.today()

    logger.info(f"[ASYNC] Verificando prazos do dia: {today.strftime('%d/%m/%Y')}")

    try:
        processes_due_today = db.query(LegalProcessDB).options(
            joinedload(LegalProcessDB.lawyer),
            joinedload(LegalProcessDB.client)
        ).filter(
            LegalProcessDB.status == 'ativo',
            (LegalProcessDB.delivery_deadline == today) | (LegalProcessDB.fatal_deadline == today)
        ).all()

        if not processes_due_today:
            logger.info("[ASYNC] Nenhum processo com prazo para hoje.")
            return

        for process in processes_due_today:
            lawyer = process.lawyer
            client_name = process.client.name if process.client else "Cliente não especificado"

            if lawyer and lawyer.telegram_id:
                deadline_type = []
                if process.delivery_deadline == today:
                    deadline_type.append("Entrega")
                if process.fatal_deadline == today:
                    deadline_type.append("Fatal")

                deadline_type_str = " e ".join(deadline_type)

                message = (
                    f"📢 ALERTA DE PRAZO PARA HOJE ({today.strftime('%d/%m/%Y')})!\n\n"
                    f"📄 Nº Processo: {process.process_number}\n"
                    f"👤 Cliente: {client_name}\n"
                    f"⚖️ Tipo de Prazo: {deadline_type_str}\n"
                    f"📝 Ação: {process.action_type or 'Não especificada'}"
                )

                logger.info(f"[ASYNC] Preparando para enviar notificação para Adv. {lawyer.name} (TG ID: {lawyer.telegram_id}) sobre processo {process.process_number}")
                await send_telegram_message(bot, lawyer.telegram_id, message) # Passa a instância do bot

            elif not lawyer:
                logger.warning(f"[ASYNC] Processo {process.process_number} (ID: {process.id}) não possui advogado responsável cadastrado.")
            elif not lawyer.telegram_id:
                logger.info(f"[ASYNC] Advogado {lawyer.name} (ID: {lawyer.id}) do processo {process.process_number} não possui Telegram ID cadastrado.")

    except Exception as e:
        logger.error(f"[ASYNC] Erro ao verificar prazos do dia: {e}", exc_info=True)
    finally:
        next(db_gen, None) # Garante que o finally do gerador de sessão seja chamado.


async def check_and_notify_upcoming_fatal_deadlines_async(bot: telegram.Bot):
    """
    Verifica processos com prazos fatais se aproximando e notifica o advogado responsável. (Versão Async)

    Args:
        bot (telegram.Bot): A instância do bot do Telegram.
    """
    if not bot:
        logger.error("[ASYNC] Instância do bot do Telegram não fornecida para check_and_notify_upcoming_fatal_deadlines_async. Ignorando.")
        return

    db_gen = get_db_session()
    db: Session = next(db_gen)
    today = date.today()
    limit_date = today + timedelta(days=TELEGRAM_ADVANCE_NOTIFICATION_DAYS)

    logger.info(f"[ASYNC] Verificando prazos fatais futuros entre {today.strftime('%d/%m/%Y')} e {limit_date.strftime('%d/%m/%Y')} ({TELEGRAM_ADVANCE_NOTIFICATION_DAYS} dias de antecedência).")

    try:
        upcoming_processes = db.query(LegalProcessDB).options(
            joinedload(LegalProcessDB.lawyer),
            joinedload(LegalProcessDB.client)
        ).filter(
            LegalProcessDB.status == 'ativo',
            LegalProcessDB.fatal_deadline >= today,
            LegalProcessDB.fatal_deadline <= limit_date
        ).order_by(LegalProcessDB.fatal_deadline).all()

        if not upcoming_processes:
            logger.info(f"Nenhum processo com prazo fatal nos próximos {TELEGRAM_ADVANCE_NOTIFICATION_DAYS} dias.")
            return

        for process in upcoming_processes:
            lawyer = process.lawyer
            client_name = process.client.name if process.client else "Cliente não especificado"

            if lawyer and lawyer.telegram_id:
                message = (
                    f"🔔 ALERTA DE PRAZO FATAL PRÓXIMO!\n\n"
                    f"📄 Nº Processo: {process.process_number}\n"
                    f"👤 Cliente: {client_name}\n"
                    f"🗓️ Prazo Fatal: {process.fatal_deadline.strftime('%d/%m/%Y')}\n"
                    f"📝 Ação: {process.action_type or 'Não especificada'}"
                )

                logger.info(f"[ASYNC] Preparando para enviar notificação de prazo fatal futuro para Adv. {lawyer.name} (TG ID: {lawyer.telegram_id}) sobre processo {process.process_number}")
                await send_telegram_message(bot, lawyer.telegram_id, message) # Passa a instância do bot

            elif not lawyer:
                logger.warning(f"[ASYNC] Processo {process.process_number} (ID: {process.id}) com prazo fatal futuro não possui advogado responsável.")
            elif not lawyer.telegram_id:
                logger.info(f"Advogado {lawyer.name} (ID: {lawyer.id}) do processo {process.process_number} (prazo fatal futuro) não possui Telegram ID.")

    except Exception as e:
        logger.error(f"Erro ao verificar prazos fatais futuros: {e}", exc_info=True)
    finally:
        next(db_gen, None) # Garante que o finally do gerador de sessão seja chamado.

# Exemplo de como poderia ser chamado para teste (requer configuração de BD):
if __name__ == '__main__':
    # Este bloco é apenas para ilustração e pode não funcionar diretamente
    # sem um contexto de aplicação ou configuração de banco de dados apropriada.
    print("Testando manualmente as funções de notificação (requer BD configurado e populado):")

    # Para um teste real, você precisaria garantir que o TELEGRAM_BOT_TOKEN e
    # um TELEGRAM_TEST_CHAT_ID (para o advogado) estejam no .env,
    # e que o advogado no BD tenha esse TELEGRAM_TEST_CHAT_ID.
    # Além disso, as chamadas send_telegram_message() nas funções acima precisariam ser descomentadas (se a versão síncrona fosse usada).

    # logger.info("--- Testando Prazos do Dia ---")
    # check_and_notify_daily_deadlines() # Lembre-se que esta é a versão síncrona e pode precisar de um bot síncrono.
    # logger.info("--- Teste de Prazos do Dia Concluído ---")

    # logger.info("--- Testando Prazos Futuros ---")
    # # check_and_notify_upcoming_fatal_deadlines() # Versão síncrona não existe mais com este nome exato.
    # logger.info("--- Teste de Prazos Futuros Concluído ---")
    print("Simulação de teste manual concluída. Verifique os logs.")
