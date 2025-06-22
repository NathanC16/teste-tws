import os
import logging
import asyncio # Import asyncio
import telegram # type: ignore
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

# Store bot instance globally to avoid reinitialization if not necessary,
# or manage its lifecycle if you prefer reinitialization per call.
_bot_instance: telegram.Bot | None = None
_bot_initialized_successfully = False # Flag to track successful initialization

async def initialize_bot_instance() -> None:
    """
    Initializes the global _bot_instance if not already done or if previous init failed.
    This function is async.
    """
    global _bot_instance, _bot_initialized_successfully
    # Attempt initialization only if token exists and not already successfully initialized
    if TELEGRAM_BOT_TOKEN and not _bot_initialized_successfully:
        try:
            logger.debug("Attempting to initialize Telegram bot instance...")
            temp_bot = telegram.Bot(token=TELEGRAM_BOT_TOKEN)
            bot_info = await temp_bot.get_me() # Must be awaited
            _bot_instance = temp_bot # Assign to global instance only after successful get_me
            _bot_initialized_successfully = True # Mark as successfully initialized
            logger.info(f"Telegram bot initialized successfully: {bot_info.username}")
        except telegram.error.InvalidToken:
            _bot_instance = None
            _bot_initialized_successfully = False # Mark as failed
            logger.critical("Invalid TELEGRAM_BOT_TOKEN. Please check your .env file.")
        except Exception as e:
            _bot_instance = None
            _bot_initialized_successfully = False # Mark as failed
            logger.critical(f"An unexpected error occurred while initializing the Telegram bot: {e}", exc_info=True)
    elif not TELEGRAM_BOT_TOKEN:
        logger.critical("TELEGRAM_BOT_TOKEN not found in environment variables. Bot not initialized.")
        _bot_instance = None # Ensure it's None if no token
        _bot_initialized_successfully = False
    elif _bot_initialized_successfully:
        logger.debug("Telegram bot already initialized successfully.")


async def get_telegram_bot() -> telegram.Bot | None:
    """
    Returns the initialized telegram.Bot instance.
    Ensures bot is initialized before returning. This function is async.
    """
    if not _bot_initialized_successfully: # If not successfully initialized yet
        await initialize_bot_instance() # Attempt to initialize it
    return _bot_instance


async def send_telegram_message(chat_id: str, text: str) -> bool:
    """
    Sends a message to a specified Telegram chat. This function is async.

    Args:
        chat_id (str): The chat_id to send the message to.
        text (str): The message text.

    Returns:
        bool: True if the message was sent successfully, False otherwise.
    """
    bot = await get_telegram_bot()
    if not bot:
        logger.error("Telegram bot not available (failed to initialize or no token). Cannot send message.")
        return False

    try:
        await bot.send_message(chat_id=chat_id, text=text) # Must be awaited
        logger.info(f"Message sent successfully to chat_id: {chat_id}")
        return True
    except telegram.error.TelegramError as e:
        logger.error(f"Failed to send message to chat_id {chat_id}: {e}")
        if isinstance(e, telegram.error.BadRequest) and "chat not found" in e.message.lower():
            logger.error(f"Chat ID {chat_id} not found or bot is not a member.")
        elif isinstance(e, telegram.error.Forbidden) and ("bot was blocked by the user" in e.message.lower() or "user is deactivated" in e.message.lower()):
            logger.error(f"Bot was blocked by user or user is deactivated for chat_id {chat_id}.")
        return False
    except Exception as e:
        logger.error(f"An unexpected error occurred while sending message to chat_id {chat_id}: {e}", exc_info=True)
        return False

async def main_test():
    """Async main function for testing."""
    logger.info("Testing Telegram bot functions (async)...")

    # Initialize first (or get_telegram_bot will do it)
    await initialize_bot_instance()

    test_bot_instance = await get_telegram_bot()

    if test_bot_instance:
        logger.info("get_telegram_bot() test: PASSED (bot instance retrieved, token likely valid if no critical errors above)")

        test_chat_id = os.getenv("TELEGRAM_TEST_CHAT_ID")
        if test_chat_id:
            logger.info(f"Attempting to send test message to TELEGRAM_TEST_CHAT_ID: {test_chat_id}")
            if await send_telegram_message(test_chat_id, "Hello from the bot! This is an async test message."):
                logger.info(f"send_telegram_message() test: PASSED (message sent to {test_chat_id})")
            else:
                logger.error(f"send_telegram_message() test: FAILED (message not sent to {test_chat_id})")
        else:
            logger.warning("TELEGRAM_TEST_CHAT_ID not set in .env. Skipping send_telegram_message() test.")
    else:
        logger.error("get_telegram_bot() test: FAILED (bot instance is None after initialization attempt)")

    logger.info(f"TELEGRAM_ADVANCE_NOTIFICATION_DAYS is set to: {TELEGRAM_ADVANCE_NOTIFICATION_DAYS}")
    logger.info("Telegram bot async script testing finished.")

if __name__ == '__main__':
    # To run the async test function
    if TELEGRAM_BOT_TOKEN: # Only run if token is present
        asyncio.run(main_test())
    else:
        logger.error("Cannot run main_test as TELEGRAM_BOT_TOKEN is not set.")
        logger.info("Telegram bot script finished testing (with errors).")
