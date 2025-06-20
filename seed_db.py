from faker import Faker
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
# Importe seus modelos DB SQLAlchemy aqui
from models.lawyer import LawyerDB
from models.client import ClientDB
from models.legal_process import LegalProcessDB
import random
from datetime import datetime, timedelta

# --- Configurações para Geração de Dados ---
NUM_LAWYERS = 10
NUM_CLIENTS = 20
NUM_PROCESSES = 50

# Inicializa o Faker para dados em português do Brasil
fake = Faker('pt_BR')

def create_synthetic_data(db: Session):
    print("Criando tabelas (se não existirem)...")
    Base.metadata.create_all(bind=engine) # Garante que as tabelas existam

    created_lawyers = []
    created_clients = []

    print(f"Gerando {NUM_LAWYERS} advogados...")
    for i in range(NUM_LAWYERS):
        ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
        oab_number_part = str(random.randint(1, 999999)).zfill(random.randint(3,6)) # Número de 3 a 6 dígitos, preenchido com zeros à esquerda se necessário
        oab_uf_part = random.choice(ufs)

        lawyer = LawyerDB(
            name=fake.name(),
            oab=f"{oab_number_part}{oab_uf_part}", # ALTERADO para NNNNNUF
            email=fake.unique.email(),
            telegram_id=f"@{fake.user_name().lower().replace('.', '').replace('-', '')}" if random.choice([True, False, False]) else None
        )
        db.add(lawyer)
        created_lawyers.append(lawyer)
    db.commit()
    for lawyer in created_lawyers: # Atualiza a lista com os IDs gerados pelo DB
        db.refresh(lawyer)
    print("Advogados gerados.")

    print(f"Gerando {NUM_CLIENTS} clientes...")
    client_areas = ['Energia Renovável', 'Petróleo e Gás', 'Direito Ambiental Energético',
                    'Regulatório de Energia', 'Contratos de Energia', 'Litígios de Energia',
                    'M&A Setor Energético', 'Infraestrutura de Energia']
    for _ in range(NUM_CLIENTS):
        client = ClientDB(
            name=fake.company() if random.choice([True, False]) else fake.name(), # Pode ser pessoa ou empresa
            area_of_expertise=random.choice(client_areas)
        )
        db.add(client)
        created_clients.append(client)
    db.commit()
    for client in created_clients: # Atualiza a lista com os IDs gerados pelo DB
        db.refresh(client)
    print("Clientes gerados.")

    print(f"Gerando {NUM_PROCESSES} processos jurídicos...")
    process_action_types = ['Consultivo', 'Contencioso Cível', 'Contencioso Administrativo',
                            'Regulatório', 'Arbitragem', 'Ambiental', 'Contratual']
    process_statuses = ['ativo', 'suspenso', 'concluído', 'arquivado']

    if not created_lawyers or not created_clients:
        print("Não foi possível criar processos pois não há advogados ou clientes gerados.")
        return

    for i in range(NUM_PROCESSES):
        entry_date = fake.date_between(start_date='-2y', end_date='today')
        # Prazo de entrega entre 15 e 90 dias após a entrada
        delivery_deadline = entry_date + timedelta(days=random.randint(15, 90))
        # Prazo fatal entre 30 e 180 dias após o prazo de entrega
        fatal_deadline = delivery_deadline + timedelta(days=random.randint(30, 180))

        process = LegalProcessDB(
            process_number=f"CNJ-{random.randint(1000000,9999999)}-{random.randint(10,99)}.{datetime.now().year}.{random.randint(1,9)}.{random.randint(10,99)}.{random.randint(1000,9999)}",
            lawyer_id=random.choice(created_lawyers).id,
            client_id=random.choice(created_clients).id,
            entry_date=entry_date,
            delivery_deadline=delivery_deadline,
            fatal_deadline=fatal_deadline,
            status=random.choice(process_statuses),
            action_type=random.choice(process_action_types)
        )
        db.add(process)
    db.commit()
    print("Processos gerados.")


if __name__ == "__main__":
    print("Iniciando script para popular o banco de dados com dados sintéticos...")
    db_session = SessionLocal()
    try:
        create_synthetic_data(db_session)
        print("Dados sintéticos gerados com sucesso!")
    except Exception as e:
        print(f"Ocorreu um erro ao gerar dados sintéticos: {e}")
        db_session.rollback()
    finally:
        db_session.close()
        print("Sessão do banco de dados fechada.")
