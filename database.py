from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv() # Carrega variáveis do .env

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL is None:
    raise EnvironmentError(
        "Erro crítico: A variável de ambiente DATABASE_URL não está definida.\n"
        "Para configurar o MySQL, crie um arquivo '.env' na raiz do projeto "\
        "e adicione a linha no formato: DATABASE_URL=\"mysql+mysqlclient://user:password@host:port/dbname\"\n"
        "Substitua 'user', 'password', 'host', 'port', e 'dbname' com suas credenciais reais do MySQL.\n"
        "Consulte o README.md e o .env.example para mais detalhes."
    )

# Para MySQL com mysqlclient, não são necessários connect_args especiais como o check_same_thread do SQLite.
# A engine SQLAlchemy identificará o dialeto mysql+mysqlclient a partir da URL.
engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Função para obter uma sessão de banco de dados
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
