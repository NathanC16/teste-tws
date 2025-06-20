import os
import logging
import telegram
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


def get_telegram_bot() -> telegram.Bot | None:
    """
    Initializes and returns a telegram.Bot instance.

    Returns:
        telegram.Bot: The bot instance if the token is found.
        None: If the token is not found or is invalid.
    """
    if not TELEGRAM_BOT_TOKEN:
        logger.critical("TELEGRAM_BOT_TOKEN not found in environment variables.")
        return None
    try:
        bot = telegram.Bot(token=TELEGRAM_BOT_TOKEN)
        # Test the token by getting bot info
        bot_info = bot.get_me()
        logger.info(f"Telegram bot initialized successfully: {bot_info.username}")
        return bot
    except telegram.error.InvalidToken:
        logger.critical("Invalid TELEGRAM_BOT_TOKEN. Please check your .env file.")
        return None
    except Exception as e:
        logger.critical(f"An unexpected error occurred while initializing the Telegram bot: {e}")
        return None

def send_telegram_message(chat_id: str, text: str) -> bool:
    """
    Sends a message to a specified Telegram chat.

    Args:
        chat_id (str): The chat_id to send the message to.
        text (str): The message text.

    Returns:
        bool: True if the message was sent successfully, False otherwise.
    """
    bot = get_telegram_bot()
    if not bot:
        logger.error("Telegram bot not available. Cannot send message.")
        return False

    try:
        bot.send_message(chat_id=chat_id, text=text)
        logger.info(f"Message sent successfully to chat_id: {chat_id}")
        return True
    except telegram.error.TelegramError as e:
        logger.error(f"Failed to send message to chat_id {chat_id}: {e}")
        # Specific error handling based on e.message or type(e) can be added here
        # For example, handling for chat_not_found, user_blocked_bot etc.
        if isinstance(e, telegram.error.BadRequest) and "chat not found" in e.message.lower():
            logger.error(f"Chat ID {chat_id} not found or bot is not a member.")
        elif isinstance(e, telegram.error.Forbidden) and "bot was blocked by the user" in e.message.lower():
            logger.error(f"Bot was blocked by user with chat_id {chat_id}.")
        return False
    except Exception as e:
        logger.error(f"An unexpected error occurred while sending message to chat_id {chat_id}: {e}")
        return False

if __name__ == '__main__':
    # Example usage (for testing purposes, requires a .env file with valid token and a chat_id)
    logger.info("Testing Telegram bot functions...")
    test_bot = get_telegram_bot()
    if test_bot:
        logger.info("get_telegram_bot() test: PASSED (bot instance created, token likely valid)")
        # Replace 'YOUR_TEST_CHAT_ID' with an actual chat_id for testing send_message
        # Be cautious with this, as it will send a real message.
        # test_chat_id = os.getenv("TELEGRAM_TEST_CHAT_ID")
        # if test_chat_id:
        #     if send_telegram_message(test_chat_id, "Hello from the bot! This is a test message."):
        #         logger.info(f"send_telegram_message() test: PASSED (message sent to {test_chat_id})")
        #     else:
        #         logger.error(f"send_telegram_message() test: FAILED (message not sent to {test_chat_id})")
        # else:
        #     logger.warning("TELEGRAM_TEST_CHAT_ID not set. Skipping send_telegram_message() test.")
    else:
        logger.error("get_telegram_bot() test: FAILED (bot instance is None)")

    logger.info(f"TELEGRAM_ADVANCE_NOTIFICATION_DAYS is set to: {TELEGRAM_ADVANCE_NOTIFICATION_DAYS}")
    logger.info("Telegram bot script finished testing.")
