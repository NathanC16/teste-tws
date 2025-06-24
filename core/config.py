import os
from dotenv import load_dotenv

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()

# Chave secreta para assinar JWTs.
# IMPORTANTE: Esta é uma chave padrão APENAS para desenvolvimento.
# Em um ambiente de produção, ISTO DEVE ser substituído por uma chave secreta forte e única,
# preferencialmente definida através de uma variável de ambiente e não hardcoded.
# Mantenha esta chave secreta e segura!
SECRET_KEY: str = os.getenv("SECRET_KEY", "your-default-secret-key-for-dev-only-change-this")

# Algoritmo usado para codificação JWT
ALGORITHM: str = "HS256"

# Tempo de expiração do token de acesso em minutos
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

if SECRET_KEY == "your-default-secret-key-for-dev-only-change-this":
    print("AVISO: Usando SECRET_KEY padrão. Isso não é seguro e deve ser usado apenas para desenvolvimento.")
    print("Por favor, defina uma SECRET_KEY forte em seu arquivo .env para produção.")
