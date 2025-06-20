import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Secret key for signing JWTs.
# IMPORTANT: This is a default key for development ONLY.
# In a production environment, this MUST be replaced with a strong, unique secret key,
# preferably set via an environment variable and not hardcoded.
# Keep this key secret and secure!
SECRET_KEY: str = os.getenv("SECRET_KEY", "your-default-secret-key-for-dev-only-change-this")

# Algorithm used for JWT encoding
ALGORITHM: str = "HS256"

# Access token expiration time in minutes
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

if SECRET_KEY == "your-default-secret-key-for-dev-only-change-this":
    print("WARNING: Using default SECRET_KEY. This is insecure and should only be used for development.")
    print("Please set a strong SECRET_KEY in your .env file for production.")
