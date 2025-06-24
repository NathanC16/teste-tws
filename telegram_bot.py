import os
import logging
import asyncio
from typing import Optional

import telegram # type: ignore
from telegram import Update
from telegram.ext import Application, ApplicationBuilder, ContextTypes, CommandHandler
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set up basic logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_ADVANCE_NOTIFICATION_DAYS_STR = os.getenv("TELEGRAM_ADVANCE_NOTIFICATION_DAYS", "5") # Default to 5 days

try:
    TELEGRAM_ADVANCE_NOTIFICATION_DAYS = int(TELEGRAM_ADVANCE_NOTIFICATION_DAYS_STR)
except ValueError:
    logger.error(f"Invalid TELEGRAM_ADVANCE_NOTIFICATION_DAYS: '{TELEGRAM_ADVANCE_NOTIFICATION_DAYS_STR}'. Must be an integer. Using default 5.")
    TELEGRAM_ADVANCE_NOTIFICATION_DAYS = 5

def create_telegram_application() -> Optional[Application]:
    """
    Creates and initializes the Telegram Application using ApplicationBuilder.
    Returns the Application instance or None if the token is missing or invalid.
    """
    if not TELEGRAM_BOT_TOKEN:
        logger.critical("TELEGRAM_BOT_TOKEN not found in environment variables. Cannot create Telegram application.")
        return None

    try:
        logger.info("Attempting to create Telegram application...")
        application = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
        # We don't call get_me() here as ApplicationBuilder does basic validation.
        # The bot's username will be available via application.bot.username after build()
        # and application.initialize() (which is called by run_polling/run_webhook)
        logger.info("Telegram application created successfully (token seems valid).")
        return application
    except telegram.error.InvalidToken:
        logger.critical("Invalid TELEGRAM_BOT_TOKEN. Please check your .env file. Application not created.")
        return None
    except Exception as e:
        logger.critical(f"An unexpected error occurred while creating the Telegram application: {e}", exc_info=True)
        return None


async def send_telegram_message(bot: telegram.Bot, chat_id: str, text: str) -> bool:
    """
    Sends a message to a specified Telegram chat using the provided bot instance.

    Args:
        bot (telegram.Bot): The bot instance to use for sending the message.
        chat_id (str): The chat_id to send the message to.
        text (str): The message text.

    Returns:
        bool: True if the message was sent successfully, False otherwise.
    """
    if not bot:
        logger.error("Bot instance not provided to send_telegram_message. Cannot send message.")
        return False

    try:
        await bot.send_message(chat_id=chat_id, text=text)
        logger.info(f"Message sent successfully to chat_id: {chat_id}")
        return True
    except telegram.error.TelegramError as e:
        logger.error(f"Failed to send message to chat_id {chat_id}: {e}")
        if isinstance(e, telegram.error.BadRequest) and "chat not found" in e.message.lower():
            logger.error(f"Chat ID {chat_id} not found or bot is not a member.")
        elif isinstance(e, telegram.error.Forbidden) and ("bot was blocked by the user" in e.message.lower() or "user is deactivated" in e.message.lower() or "bot can't initiate conversation" in e.message.lower()): # Added new check
            logger.error(f"Bot was blocked, user deactivated, or bot can't initiate conversation for chat_id {chat_id}.")
        return False
    except Exception as e:
        logger.error(f"An unexpected error occurred while sending message to chat_id {chat_id}: {e}", exc_info=True)
        return False

# Placeholder for the start command handler - will be implemented in a later step
async def start_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the /start command."""
    if update.effective_chat:
        await update.effective_chat.send_message(
            "Olá! Eu sou seu bot de assistência jurídica. Aqui estão os comandos que você pode usar:\n"
            "/help - Mostra esta mensagem de ajuda.\n"
            "/my_deadlines - (Em breve) Mostra seus próximos prazos."
        )
        logger.info(f"/start command received from chat_id {update.effective_chat.id}")
    else:
        logger.warning("/start command received but no effective_chat found in update.")

async def help_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles the /help command."""
    if update.effective_chat:
        await update.effective_chat.send_message(
            "Olá! Eu sou seu bot de assistência jurídica. Aqui estão os comandos que você pode usar:\n"
            "/start - Inicia a conversa com o bot e mostra esta mensagem.\n"
            "/help - Mostra esta mensagem de ajuda.\n"
            "/my_deadlines - (Em breve) Mostra seus próximos prazos."
        )
        logger.info(f"/help command received from chat_id {update.effective_chat.id}")
    else:
        logger.warning("/help command received but no effective_chat found in update.")


# The main_test function is removed as its previous logic for initializing and
# testing the bot instance directly is no longer applicable with ApplicationBuilder.
# Testing will now involve running the full application with handlers.

# Example of how the application might be run (typically from main.py or a dedicated run script)
async def main_bot_runner(): # Renamed from main_test and repurposed
    """
    Example function to set up and run the bot with handlers.
    This would typically be integrated into your main application (e.g., main.py).
    """
    application = create_telegram_application()

    if application:
        # Add command handlers
        application.add_handler(CommandHandler("start", start_command_handler))
        # Add other handlers (MessageHandler, etc.) here as needed

        logger.info("Starting bot polling...")
        # In a real application, especially with FastAPI, you'd run this in a way
        # that doesn't block the main thread, e.g., using asyncio.create_task
        # or by structuring it within the FastAPI startup/shutdown events.
        try:
            await application.initialize() # Initialize handlers, bot, etc.
            await application.updater.start_polling() # Start polling for updates
            await application.start() # Start the application (dispatcher, job queue if any)
            logger.info("Bot is running. Press Ctrl-C to stop.")
            # Keep the application running (e.g., while True: await asyncio.sleep(1))
            # or manage its lifecycle as part of a larger application.
            # For this example, we'll just let it run until manually stopped.
            while True:
                await asyncio.sleep(3600) # Keep alive, or use application.run_polling() if it's the main entry point
        except KeyboardInterrupt:
            logger.info("Bot polling stopped by user (Ctrl-C).")
        except Exception as e:
            logger.error(f"An error occurred while running the bot: {e}", exc_info=True)
        finally:
            if application.updater and application.updater.running: # type: ignore
                await application.updater.stop() # type: ignore
            await application.stop()
            await application.shutdown()
            logger.info("Bot has been shut down.")
    else:
        logger.error("Failed to create Telegram application. Bot will not run.")

if __name__ == '__main__':
    # This is primarily for testing telegram_bot.py directly.
    # In the actual application, main.py will manage the lifecycle.
    if TELEGRAM_BOT_TOKEN:
        asyncio.run(main_bot_runner())
    else:
        logger.error("Cannot run Telegram bot example as TELEGRAM_BOT_TOKEN is not set.")
