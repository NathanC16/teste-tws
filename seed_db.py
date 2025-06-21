from faker import Faker
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from sqlalchemy.exc import IntegrityError # Import para tratamento de erros
# Importe seus modelos DB SQLAlchemy aqui
from models.lawyer import LawyerDB
from models.client import ClientDB, AreaOfExpertiseEnum
from models.legal_process import LegalProcessDB
from core.security import get_password_hash # Import para hashear senhas
import random
from datetime import datetime, timedelta

# --- Configurações para Geração de Dados ---
NUM_LAWYERS = 50
NUM_CLIENTS = 100
NUM_PROCESSES = 250

# Inicializa o Faker para dados em português do Brasil
fake = Faker('pt_BR')

def create_synthetic_data(db: Session):
    # Apaga todas as tabelas existentes que são gerenciadas pelo Base.metadata
    print("Limpando tabelas existentes...")
    Base.metadata.drop_all(bind=engine)

    # Cria as tabelas novamente
    print("Criando tabelas...")
    Base.metadata.create_all(bind=engine)

    # --- Criação/Verificação do Usuário Admin ---
    ADMIN_OAB = "00001SP" # Alterado para formato válido
    ADMIN_EMAIL = "admin@example.com"
    ADMIN_PASSWORD = "admin"
    admin_user = db.query(LawyerDB).filter(LawyerDB.oab == ADMIN_OAB).first()
    if not admin_user:
        hashed_admin_password = get_password_hash(ADMIN_PASSWORD)
        new_admin = LawyerDB(
            name="Admin User",
            username="admin", # Adicionado username para o admin
            oab=ADMIN_OAB,
            email=ADMIN_EMAIL,
            hashed_password=hashed_admin_password,
            # is_admin=True, # Campo removido
            telegram_id="@admin_user_tg"
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print(f"Usuário Admin criado. Login com username 'admin' ou OAB '{new_admin.oab}'.")
    else:
        # Se o admin já existe, verificar se o campo username está preenchido
        # Esta é uma adição para garantir que admins antigos sejam atualizados se o script rodar novamente
        if not admin_user.username:
            admin_user.username = "admin"
            db.commit()
            db.refresh(admin_user)
            print(f"Usuário Admin '{admin_user.oab}' atualizado com username 'admin'.")
        else:
            print(f"Usuário Admin '{admin_user.oab}' (username: '{admin_user.username}') já existe.")

    # --- Criação de Advogado Padrão Removida ---
    # STD_LAWYER_OAB = "00002RJ"
    # STD_LAWYER_EMAIL = "advogado@example.com"
    # STD_LAWYER_PASSWORD = "advogado"
    # std_lawyer = db.query(LawyerDB).filter(LawyerDB.oab == STD_LAWYER_OAB).first()
    # if not std_lawyer:
    #     hashed_std_lawyer_password = get_password_hash(STD_LAWYER_PASSWORD)
    #     new_std_lawyer = LawyerDB(
    #         name="Advogado Padrão",
    #         oab=STD_LAWYER_OAB,
    #         email=STD_LAWYER_EMAIL,
    #         hashed_password=hashed_std_lawyer_password,
    #         # is_admin=False, # Field removed
    #         telegram_id="@advogado_padrao_tg"
    #     )
    #     db.add(new_std_lawyer)
    #     db.commit()
    #     db.refresh(new_std_lawyer)
    #     print(f"Usuário Advogado Padrão '{new_std_lawyer.oab}' criado.")
    # else:
    #     print(f"Usuário Advogado Padrão '{STD_LAWYER_OAB}' já existe.") # Usar constante aqui

    created_lawyers = []
    # Adicionar admin à lista se foi criado ou já existia e é necessário para processos
    if admin_user: created_lawyers.append(admin_user)
    # std_lawyer removido desta lista

    created_clients = []

    print(f"Gerando {NUM_LAWYERS} advogados aleatórios...")
    for i in range(NUM_LAWYERS):
        ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
        # Gerar uma OAB que não seja ADMIN
        while True:
            oab_number_part = str(random.randint(1, 999999)).zfill(random.randint(3,6))
            oab_uf_part = random.choice(ufs)
            generated_oab = f"{oab_number_part}{oab_uf_part}"
            if generated_oab.upper() != ADMIN_OAB: # Verificar apenas contra ADMIN_OAB
                break

        # Gerar um email único que não seja dos usuários padrão
        generated_email = fake.unique.email()
        while generated_email == ADMIN_EMAIL: # Verificar apenas contra ADMIN_EMAIL
            generated_email = fake.unique.email()

        # Gerar senha aleatória para advogados aleatórios
        random_password = fake.password(length=12)
        hashed_random_password = get_password_hash(random_password)

        lawyer_data = {
            "name": fake.name(),
            "oab": generated_oab,
            "email": generated_email,
            "telegram_id": f"@{fake.user_name().lower().replace('.', '').replace('-', '')}" if random.choice([True, False, False]) else None,
            "hashed_password": hashed_random_password
            # campo is_admin removido
        }

        temp_lawyer = LawyerDB(**lawyer_data)
        try:
            db.add(temp_lawyer)
            db.commit()
            db.refresh(temp_lawyer)
            created_lawyers.append(temp_lawyer)
            # print(f"Advogado aleatório {temp_lawyer.oab} criado com senha: {random_password}") # Log para teste
        except IntegrityError:
            db.rollback()
            print(f"Aviso: Não foi possível criar advogado com OAB {temp_lawyer.oab} ou Email {temp_lawyer.email} (provavelmente duplicado ou outro erro de integridade). Pulando.")
        except Exception as e:
            db.rollback()
            print(f"Erro inesperado ao criar advogado {temp_lawyer.oab}: {e}. Pulando.")

    # Não precisamos mais do commit em lote e refresh para advogados aleatórios aqui
    # Ajustar contagem com base se admin_user era pré-existente ou adicionado agora.
    # A lista created_lawyers conterá admin_user + novos aleatórios.
    num_random_lawyers_actually_created = 0
    for lawyer_obj in created_lawyers:
        if lawyer_obj.oab != ADMIN_OAB : # Assumindo que o objeto admin_user foi anexado
             num_random_lawyers_actually_created +=1
    print(f"{num_random_lawyers_actually_created} advogados aleatórios adicionados à lista created_lawyers.")
    print("Geração de advogados concluída.")


    print(f"Gerando {NUM_CLIENTS} clientes...")
    # client_areas = ['Energia Renovável', 'Petróleo e Gás', 'Direito Ambiental Energético',
    #                 'Regulatório de Energia', 'Contratos de Energia', 'Litígios de Energia',
    #                 'M&A Setor Energético', 'Infraestrutura de Energia'] # Removido
    valid_client_areas = [area.value for area in AreaOfExpertiseEnum] # Usando o Enum

    for _ in range(NUM_CLIENTS):
        client = ClientDB(
            name=fake.company() if random.choice([True, False]) else fake.name(), # Pode ser pessoa ou empresa
            area_of_expertise=random.choice(valid_client_areas) # Usando a lista do Enum
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

        current_status = random.choice(process_statuses)
        data_conclusao_real = None

        if current_status == "concluído":
            # 75% de chance de concluir no prazo (ou antes), 25% de chance de concluir atrasado
            if random.random() < 0.75:
                # Conclui entre a data de entrada e o prazo fatal.
                # Garantir que a data de conclusão seja pelo menos um dia após a data de entrada.
                min_conclusao_date = entry_date + timedelta(days=1)

                # Se o prazo fatal for antes ou no mesmo dia que a data mínima de conclusão,
                # concluir no dia do prazo fatal (se for após min_conclusao_date) ou em min_conclusao_date.
                if fatal_deadline <= min_conclusao_date:
                    data_conclusao_real = max(fatal_deadline, min_conclusao_date)
                else:
                    # Intervalo válido para conclusão antecipada/no prazo
                    dias_entre_min_conclusao_e_fatal = (fatal_deadline - min_conclusao_date).days
                    if dias_entre_min_conclusao_e_fatal <= 0: # Se fatal_deadline é igual a min_conclusao_date
                        data_conclusao_real = min_conclusao_date
                    else:
                        offset_conclusao = random.randint(0, dias_entre_min_conclusao_e_fatal)
                        data_conclusao_real = min_conclusao_date + timedelta(days=offset_conclusao)
            else:
                # Conclui atrasado: entre 1 e 30 dias após o prazo fatal
                data_conclusao_real = fatal_deadline + timedelta(days=random.randint(1, 30))

            # Segurança final para garantir que a data de conclusão não seja antes da data de entrada.
            # (A lógica acima deve cobrir isso, mas é uma boa verificação.)
            data_conclusao_real = max(data_conclusao_real, entry_date + timedelta(days=1))

        process = LegalProcessDB(
            process_number=f"CNJ-{random.randint(1000000,9999999)}-{random.randint(10,99)}.{datetime.now().year}.{random.randint(1,9)}.{random.randint(10,99)}.{random.randint(1000,9999)}",
            lawyer_id=random.choice(created_lawyers).id,
            client_id=random.choice(created_clients).id,
            entry_date=entry_date,
            delivery_deadline=delivery_deadline,
            fatal_deadline=fatal_deadline,
            status=current_status,
            action_type=random.choice(process_action_types),
            data_conclusao_real=data_conclusao_real
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
