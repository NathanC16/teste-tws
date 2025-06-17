from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv() # Carrega variáveis do .env

# Para desenvolvimento inicial, usaremos SQLite.
# DATABASE_URL = "sqlite:///./test.db"

# Para PostgreSQL, descomente a linha abaixo e configure o .env
# DATABASE_URL = os.getenv("DATABASE_URL")

# Remova esta linha quando for usar PostgreSQL de fato e configure o .env
DATABASE_URL = "sqlite:///./sql_app.db"


if DATABASE_URL is None:
    raise EnvironmentError("DATABASE_URL não foi definida nas variáveis de ambiente.")

engine = create_engine(
    DATABASE_URL,
    # A flag connect_args é específica para SQLite. Não será necessária para PostgreSQL.
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Função para obter uma sessão de banco de dados
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
