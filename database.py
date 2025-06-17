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
        "Para configurar o PostgreSQL, crie um arquivo '.env' na raiz do projeto "\
        "e adicione a linha: DATABASE_URL=\"postgresql://user:password@host:port/dbname\"\n"
        "Substitua 'user', 'password', 'host', 'port', e 'dbname' com suas credenciais reais.\n"
        "Consulte o README.md e o .env.example para mais detalhes."
    )

# A flag connect_args é específica para SQLite.
# Será removida ou condicionada, já que PostgreSQL é o padrão.
engine_args = {}
if DATABASE_URL.startswith("sqlite"):
    engine_args["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Função para obter uma sessão de banco de dados
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
