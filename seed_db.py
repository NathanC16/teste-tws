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
            telegram_id=None # Definido como None inicialmente ou um ID de teste específico se fornecido
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
    # Adicionar admin à lista se foi criado ou já existia
    if admin_user:
        created_lawyers.append(admin_user)

    # --- Criação/Verificação do Usuário "advogado" de Teste (Padrão) ---
    # Este usuário também será criado pelo main.py no startup se não existir.
    # O seed_db.py também o cria para garantir que ele exista se o seed for rodado isoladamente
    # e para que possamos associar processos a ele aqui.
    TEST_USER_USERNAME = "advogado"
    TEST_USER_OAB = "12345SP" # Deve ser único e válido
    TEST_USER_EMAIL = "advogado@example.com" # Deve ser único
    TEST_USER_PASSWORD = "advogado"

    test_user_lawyer = db.query(LawyerDB).filter(
        (LawyerDB.username == TEST_USER_USERNAME) | (LawyerDB.oab == TEST_USER_OAB)
    ).first()

    if not test_user_lawyer:
        hashed_password_test_user = get_password_hash(TEST_USER_PASSWORD)
        test_user_lawyer = LawyerDB(
            name="Advogado de Teste",
            oab=TEST_USER_OAB,
            email=TEST_USER_EMAIL,
            username=TEST_USER_USERNAME,
            hashed_password=hashed_password_test_user,
            telegram_id=None
        )
        db.add(test_user_lawyer)
        try:
            db.commit()
            db.refresh(test_user_lawyer)
            print(f"Usuário de teste '{TEST_USER_USERNAME}' (OAB: {TEST_USER_OAB}) criado/verificado.")
            created_lawyers.append(test_user_lawyer) # Adicionar à lista para distribuição de processos
        except IntegrityError:
            db.rollback()
            print(f"Aviso: Conflito ao tentar criar usuário de teste '{TEST_USER_USERNAME}' (OAB: {TEST_USER_OAB}). Pode já existir com email conflitante. Tentando buscar novamente.")
            test_user_lawyer = db.query(LawyerDB).filter(
                (LawyerDB.username == TEST_USER_USERNAME) | (LawyerDB.oab == TEST_USER_OAB) | (LawyerDB.email == TEST_USER_EMAIL)
            ).first()
            if test_user_lawyer:
                 print(f"Usuário de teste '{TEST_USER_USERNAME}' encontrado após conflito.")
                 if not any(lawyer.id == test_user_lawyer.id for lawyer in created_lawyers): # Evitar duplicatas na lista
                    created_lawyers.append(test_user_lawyer)
            else:
                print(f"ERRO: Não foi possível criar ou encontrar o usuário de teste '{TEST_USER_USERNAME}' após conflito.")
    else:
        print(f"Usuário de teste '{test_user_lawyer.username}' (OAB: {test_user_lawyer.oab}) já existe.")
        if not any(lawyer.id == test_user_lawyer.id for lawyer in created_lawyers): # Adicionar se não estiver já na lista
            created_lawyers.append(test_user_lawyer)


    created_clients = []

    # Ajustar NUM_LAWYERS para não contar o admin e o test_user se eles já foram adicionados
    # e queremos exatamente NUM_LAWYERS advogados *aleatórios* além desses.
    # Se NUM_LAWYERS é o total desejado incluindo admin e test_user, a lógica precisa de ajuste.
    # Por simplicidade, vamos assumir que NUM_LAWYERS é para os *adicionais* aleatórios,
    # além do admin e do 'advogado' de teste.

    # Lista para armazenar nicknames já usados neste batch do seed para evitar colisões locais.
    # Não previne colisão com usernames já existentes no DB se o seed for rodado múltiplas vezes
    # sem limpar o DB, mas a constraint unique no DB pegaria isso.
    used_nicknames_in_batch = set()
    if admin_user and admin_user.username:
        used_nicknames_in_batch.add(admin_user.username.lower())
    if test_user_lawyer and test_user_lawyer.username:
        used_nicknames_in_batch.add(test_user_lawyer.username.lower())

    print(f"Gerando {NUM_LAWYERS} advogados aleatórios adicionais...")
    default_lawyer_password = "advogado" # Senha padrão para advogados gerados
    hashed_default_password = get_password_hash(default_lawyer_password)

    for i in range(NUM_LAWYERS):
        lawyer_name = fake.name()

        # Gerar Nickname
        base_nickname = "".join(lawyer_name.lower().split()) # Nome minúsculo sem espaços
        if len(base_nickname) > 18: # Limitar tamanho base para dar espaço a sufixos
            base_nickname = base_nickname[:18]

        nickname_candidate = base_nickname
        suffix_counter = 1
        while nickname_candidate in used_nicknames_in_batch or len(nickname_candidate) < 3:
            if len(base_nickname) > 18 - len(str(suffix_counter)): # Evitar que fique muito longo
                 base_nickname = base_nickname[:18 - len(str(suffix_counter))]
            nickname_candidate = f"{base_nickname}{suffix_counter}"
            suffix_counter += 1
            if suffix_counter > 100: # Evitar loop infinito em caso extremo
                nickname_candidate = fake.unique.user_name()[:20] # Fallback para user_name do Faker
                if len(nickname_candidate) < 3: nickname_candidate = nickname_candidate + "123" # garantir tamanho minimo
                nickname_candidate = nickname_candidate[:20] # Truncar novamente
                break

        used_nicknames_in_batch.add(nickname_candidate)

        # Gerar OAB única (que não seja do admin ou do test_user)
        generated_oab = ""
        while True:
            oab_number_part = str(random.randint(1000, 999999)).zfill(6) # 6 dígitos para OAB
            oab_uf_part = random.choice(['SP', 'RJ', 'MG', 'BA', 'RS', 'PR', 'SC', 'GO', 'ES', 'PE']) # UFs comuns
            generated_oab = f"{oab_number_part}{oab_uf_part}"
            if generated_oab.upper() != ADMIN_OAB and generated_oab.upper() != TEST_USER_OAB:
                # Checar se já existe no DB (opcional, mas bom para robustez se o seed rodar várias vezes)
                # existing_oab_in_db = db.query(LawyerDB).filter(LawyerDB.oab == generated_oab).first()
                # if not existing_oab_in_db:
                # break
                break # Simplificado por agora, unique constraint no DB pegará

        # Gerar Email único
        generated_email = ""
        email_attempts = 0
        while email_attempts < 100: # Evitar loop infinito
            generated_email = fake.unique.email()
            if generated_email != ADMIN_EMAIL and generated_email != TEST_USER_EMAIL:
                break
            email_attempts +=1
        if generated_email == ADMIN_EMAIL or generated_email == TEST_USER_EMAIL : # Fallback se não conseguir único
             generated_email = f"lawyer{i}_{fake.lexify(text='????')}@example.com"


        lawyer_data = {
            "name": lawyer_name,
            "username": nickname_candidate,
            "oab": generated_oab,
            "email": generated_email,
            "telegram_id": None,
            "hashed_password": hashed_default_password
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
        print("Não foi possível criar processos pois não há advogados ou clientes suficientes gerados.")
        return

    # Garantir que test_user_lawyer (advogado@example.com) tenha alguns processos
    num_processes_for_test_user = 0
    if test_user_lawyer and test_user_lawyer.id:
        print(f"Atribuindo aproximadamente 10% dos processos (ou pelo menos 5, máx 10) ao usuário de teste '{test_user_lawyer.username}' (ID: {test_user_lawyer.id}).")
        target_processes_for_test_user = max(5, min(10, int(NUM_PROCESSES * 0.1)))
    else:
        target_processes_for_test_user = 0
        print(f"Usuário de teste 'advogado' não encontrado ou sem ID, não serão atribuídos processos específicos a ele.")


    for i in range(NUM_PROCESSES):
        assigned_lawyer_id = None
        # Atribuir os primeiros 'target_processes_for_test_user' processos ao test_user_lawyer
        if test_user_lawyer and test_user_lawyer.id and num_processes_for_test_user < target_processes_for_test_user:
            assigned_lawyer_id = test_user_lawyer.id
            num_processes_for_test_user += 1
        else:
            # Para os demais, escolher aleatoriamente da lista `created_lawyers`
            # que pode incluir o admin, o test_user (para mais alguns processos), e os aleatórios.
            if created_lawyers: # Certificar que a lista não está vazia
                assigned_lawyer_id = random.choice(created_lawyers).id
            else: # Fallback muito improvável, mas seguro
                print("ERRO: Lista created_lawyers está vazia na atribuição aleatória de processos.")
                continue

        if assigned_lawyer_id is None: # Segurança adicional
            print(f"AVISO: Não foi possível determinar um advogado para o processo {i}. Pulando.")
            continue

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
            process_number=f"CNJ-{random.randint(1000000,9999999)}-{random.randint(10,99)}.{datetime.now().year}.{random.randint(1,9)}.{random.randint(10,99)}.{random.randint(1000,9999)}", # Garantir unicidade se necessário
            lawyer_id=assigned_lawyer_id, # Usar o ID do advogado determinado acima
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
