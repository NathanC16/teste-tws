# Desafio Técnico - Cadastro e Monitoramento de Processos Jurídicos

Aplicação web para um escritório de advocacia especializado no setor de energia, permitindo o cadastro e o acompanhamento detalhado de processos jurídicos. O sistema foca na organização, controle de prazos e uma visão gerencial clara do andamento de todos os casos.

## Funcionalidades Principais

O sistema oferece um conjunto robusto de funcionalidades para a gestão jurídica eficiente:

*   **Gerenciamento Completo de Entidades:** Capacidade total de Criar, Ler, Atualizar e Deletar (CRUD) Advogados (que também são os usuários do sistema), Clientes e Processos Jurídicos.
*   **Autenticação Segura:** Sistema de autenticação baseado em tokens JWT, com login disponível via OAB ou nome de usuário (`username`) e senha. As rotas da API são protegidas, exigindo autenticação para operações sensíveis.
*   **Interface de Gerenciamento de Dados (`index.html`):** Uma página dedicada para todas as operações de CRUD, equipada com:
    *   Pesquisa em tempo real para todas as listas.
    *   Validação de formulários no lado do cliente.
    *   Formatação de data "dd/mm/aaaa" para fácil utilização.
    *   Botão de logout na barra de navegação.
    *   Proteção contra a exclusão do usuário administrador principal na interface.
*   **Dashboard Interativo (`dashboard.html`):** Um painel de controle visual para acompanhamento gerencial, incluindo:
    *   Cards de resumo com indicadores chave.
    *   Alertas de prazos importantes.
    *   Lista de processos filtrável (via API por status, advogado, cliente) e com pesquisa local. A tabela de processos agora possui **barra de scroll vertical** para melhor navegação.
    *   Gráficos detalhados (Processos por Status, Advogado, Tipo de Ação) organizados em abas e com exibição de valores/porcentagens diretamente nos elementos gráficos (datalabels). Gráficos de barras no dashboard agora são **horizontais** para melhor visualização.
    *   Requer login para acesso.
*   **Proteção de Dados:** Regras de negócio para impedir a exclusão de entidades vinculadas (e.g., advogado com processos, cliente com processos) e proteção especial para o usuário administrador.
*   **Preparação para Análise de IA:** Adição do campo `data_conclusao_real` nos processos, que é populado com dados sintéticos, visando futuras análises e previsões.

Para uma lista detalhada de todas as funcionalidades e seu status de implementação, consulte o arquivo `FUNCIONALIDADES_PROJETO.md`.

## Tecnologias Utilizadas

*   **Backend:**
    *   Python 3.10+
    *   FastAPI: Framework web para construção da API.
    *   SQLAlchemy: ORM para interação com o banco de dados.
    *   PyMySQL: Driver Python puro para MySQL.
    *   Uvicorn: Servidor ASGI para FastAPI.
    *   Pydantic: Para validação de dados.
*   **Banco de Dados:**
    *   MySQL: Banco de dados padrão da aplicação (requer configuração via arquivo `.env` e driver `PyMySQL`).
    *   SQLite: Pode ser usado como alternativa para desenvolvimento local rápido (requer modificação manual em `database.py` e instalação do driver apropriado se não for o `sqlite3` embutido).
*   **Frontend (Gerenciamento de Dados - `index.html` e Painel - `dashboard.html`):**
    *   HTML5
    *   CSS3 (customizado e Bootstrap 5.3)
    *   JavaScript (Vanilla JS)
    *   Font Awesome 6.5 (para iconografia)
    *   Chart.js 3.7 (para gráficos no painel)
    *   `chartjs-plugin-datalabels` (para exibir valores nos gráficos)
*   **Documentação:**
    *   Markdown (`DESCRICAO_PROJETO.md`, `FUNCIONALIDADES_PROJETO.md`, `README.md`)

## Pré-requisitos

*   Python 3.10 ou superior.
*   Git.

## Configuração do Ambiente

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO_AQUI>
    cd <NOME_DO_DIRETORIO_DO_PROJETO>
    ```
    (Substitua `<URL_DO_REPOSITORIO_AQUI>` e `<NOME_DO_DIRETORIO_DO_PROJETO>` pelos valores corretos)

2.  **Crie e ative um ambiente virtual:**
    É altamente recomendável usar um ambiente virtual para isolar as dependências do projeto.
    ```bash
    python -m venv venv
    ```
    Para ativar o ambiente virtual:
    *   No Windows:
        ```bash
        .venv\Scripts\activate
        ```
    *   No macOS/Linux:
        ```bash
        source venv/bin/activate
        ```

3.  **Instale as dependências:**
    Com o ambiente virtual ativado, instale as bibliotecas Python necessárias:
    ```bash
    pip install -r requirements.txt
    ```

## Configuração do Banco de Dados

A aplicação utiliza MySQL como o banco de dados padrão.

### Guia Rápido: Instalando e Configurando o MySQL Server

Esta seção oferece um guia geral. Para instruções detalhadas e específicas do seu sistema operacional, consulte sempre a [documentação oficial do MySQL](https://dev.mysql.com/doc/refman/en/installing.html).

**A. Instalação do MySQL Server:**

*   **Windows:**
    *   Baixe o MySQL Installer em [mysql.com/downloads/](https://dev.mysql.com/downloads/).
    *   Execute o instalador e siga as instruções. Recomenda-se escolher a opção "Server only" (Apenas Servidor) ou "Developer Default" (Padrão do Desenvolvedor) que inclui o servidor.
    *   Durante a instalação, você será solicitado a definir uma senha para o usuário `root` do MySQL. **Guarde esta senha com segurança.**
*   **macOS:**
    *   Usando [Homebrew](https://brew.sh/):
        ```bash
        brew update
        brew install mysql
        ```
    *   Ou baixe o pacote `.dmg` de [mysql.com/downloads/](https://dev.mysql.com/downloads/).
    *   Após a instalação, inicie o servidor MySQL e configure a senha do `root` se solicitado (`mysql_secure_installation` pode ser útil).
*   **Linux (Exemplo com APT - Debian/Ubuntu):**
    ```bash
    sudo apt update
    sudo apt install mysql-server
    ```
    *   Após a instalação, execute `sudo mysql_secure_installation` para configurar a senha do `root` e outras configurações de segurança.
*   **Linux (Exemplo com YUM - CentOS/RHEL/Fedora):**
    *   Consulte a documentação do MySQL para obter os repositórios corretos para sua versão.
    *   Geralmente, os passos envolvem adicionar o repositório YUM do MySQL e depois instalar com `sudo yum install mysql-community-server`.
    *   Após a instalação, inicie o serviço (`sudo systemctl start mysqld`) e configure a segurança (`sudo mysql_secure_installation`).

**B. Criando Banco de Dados e Usuário para a Aplicação:**

Após instalar e iniciar o MySQL Server, você precisará criar um banco de dados e um usuário para esta aplicação.

1.  **Conecte-se ao servidor MySQL como `root`:**
    Abra o terminal ou prompt de comando e use o cliente MySQL:
    ```bash
    mysql -u root -p
    ```
    Você será solicitado a inserir a senha do `root` que definiu durante a instalação.

2.  **Crie um novo banco de dados para a aplicação:**
    No prompt `mysql>`, execute (substitua `mydatabase` pelo nome que desejar):
    ```sql
    CREATE DATABASE mydatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ```
    Usar `utf8mb4` é recomendado para suportar uma ampla gama de caracteres.

3.  **Crie um novo usuário para a aplicação:**
    Substitua `myuser` e `mypassword` pelo nome de usuário e senha que você deseja usar para a aplicação. **Use uma senha forte!**
    ```sql
    CREATE USER 'myuser'@'localhost' IDENTIFIED BY 'mypassword';
    ```
    Isso cria um usuário que só pode se conectar a partir de `localhost`. Se sua aplicação e banco de dados estiverem em máquinas diferentes, substitua `localhost` pelo IP ou hostname da máquina da aplicação, ou use `'%'` (geralmente não recomendado para produção sem firewall adequado) para permitir conexões de qualquer host.

4.  **Conceda privilégios ao novo usuário no banco de dados criado:**
    ```sql
    GRANT ALL PRIVILEGES ON mydatabase.* TO 'myuser'@'localhost';
    ```
    Isso dá todas as permissões ao `myuser` apenas no banco de dados `mydatabase`.

5.  **Aplique as alterações de privilégio:**
    ```sql
    FLUSH PRIVILEGES;
    ```

6.  **Saia do cliente MySQL:**
    ```sql
    EXIT;
    ```

**C. Verifique a Conexão (Opcional, mas Recomendado):**

Você pode tentar se conectar ao MySQL com o novo usuário para verificar se tudo funcionou:
```bash
mysql -u myuser -p mydatabase
```
Insira a senha `mypassword` quando solicitado. Se você conseguir se conectar e ver o prompt `mysql>` dentro do `mydatabase`, a configuração básica está correta.

Com esses passos concluídos, você terá um usuário (ex: `myuser`), uma senha (ex: `mypassword`) e um banco de dados (ex: `mydatabase`) prontos para serem usados na configuração `DATABASE_URL` do arquivo `.env` da sua aplicação.

---

Com o MySQL Server instalado e configurado conforme o guia acima, siga os próximos passos para conectar sua aplicação:

1.  **Crie um arquivo `.env`:**
    Na raiz do projeto, se ainda não o fez, crie uma cópia do arquivo `.env.example` e renomeie-a para `.env`.
    ```bash
    cp .env.example .env
    ```
    O arquivo `.env` é ignorado pelo Git e não deve ser versionado.

2.  **Configure a `DATABASE_URL` no arquivo `.env`:**
    Abra o arquivo `.env` e edite a variável `DATABASE_URL` com as credenciais do usuário e banco de dados que você criou no MySQL (conforme o "Guia Rápido" acima, por exemplo, `myuser`, `mypassword`, `mydatabase`).
    O formato é: `mysql+pymysql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO`
    Exemplo (usando os dados do guia):
    ```env
    DATABASE_URL="mysql+pymysql://myuser:mypassword@localhost:3306/mydatabase"
    ```
    A aplicação irá falhar ao iniciar se esta variável não estiver corretamente configurada.
    O arquivo `.env.example` (e consequentemente o seu `.env`) também contém placeholders para `TELEGRAM_BOT_TOKEN` e `TELEGRAM_ADVANCE_NOTIFICATION_DAYS`. Estes devem ser configurados para habilitar a funcionalidade de notificações via Telegram, uma vez que ela seja completamente implementada.

3.  **Criação das Tabelas:**
    As tabelas do banco de dados são criadas automaticamente pela aplicação na primeira vez que ela é iniciada, com base nos modelos definidos em `models/`.

### Alternativa para Desenvolvimento Local Rápido (SQLite)

Se, para desenvolvimento local rápido, você preferir usar SQLite:
1.  Certifique-se de que não há uma `DATABASE_URL` definida no seu arquivo `.env` (ou comente-a).
2.  **Modifique o arquivo `database.py` temporariamente:**
    Altere a lógica em `database.py` para definir uma `DATABASE_URL` para SQLite, por exemplo:
    ```python
    # DATABASE_URL = os.getenv("DATABASE_URL") # Comente esta linha
    DATABASE_URL = "sqlite:///./sql_app.db" # Adicione esta para SQLite
    # ...
    # if DATABASE_URL is None: # Comente ou ajuste este bloco de erro
    # ...
    # Adicione de volta a lógica de engine_args para SQLite se necessário:
    # engine_args = {}
    # if DATABASE_URL.startswith("sqlite"):
    #     engine_args["connect_args"] = {"check_same_thread": False}
    # engine = create_engine(DATABASE_URL, **engine_args)
    ```
    Lembre-se que esta não é a configuração padrão.

## Executando a Aplicação

Para iniciar o servidor FastAPI (com Uvicorn), execute o seguinte comando na raiz do projeto (com o ambiente virtual ativado):
```bash
uvicorn main:app --reload
```
*   `main`: Refere-se ao arquivo `main.py`.
*   `app`: Refere-se ao objeto `FastAPI` instanciado como `app` em `main.py`.
*   `--reload`: Faz com que o servidor reinicie automaticamente após alterações no código (útil para desenvolvimento).

A API estará disponível em `http://127.0.0.1:8000`.

## Autenticação e Acesso

O sistema utiliza um mecanismo de login para acesso às funcionalidades de gerenciamento de dados. Não há funcionalidade de registro público de usuários; as contas de usuário (advogados) são gerenciadas internamente.

**Credenciais de Acesso Padrão (Administrador):**

Para acessar o sistema, utilize as seguintes credenciais, que são criadas automaticamente pelo script `seed_db.py`:

*   **Login (OAB ou Username):** `00001SP` OU `admin`
*   **Senha:** `admin`

Recomenda-se fortemente alterar a senha padrão do usuário "ADMIN" (OAB `00001SP`, username `admin`) se esta aplicação for utilizada em um ambiente mais sério ou de produção. Atualmente, a funcionalidade de alteração de senha não está implementada na interface, mas a senha pode ser alterada diretamente no banco de dados ou por meio de um script de gerenciamento.

O script `seed_db.py` também cria outros advogados com senhas aleatórias para fins de preenchimento de dados de exemplo. Estes usuários não são destinados a login no sistema na configuração atual, mas podem ser usados para testar listagens e associações de processos.

## Populando o Banco de Dados com Dados de Teste (Opcional)

Para facilitar os testes e a demonstração da aplicação, foi incluído um script (`seed_db.py`) que utiliza a biblioteca Faker para popular o banco de dados com dados sintéticos (advogados, clientes e processos). Este script também cria o usuário administrador padrão mencionado acima.

**Pré-requisitos:**
*   Certifique-se de que as dependências do projeto estão instaladas, incluindo `Faker` (conforme `requirements.txt`).
*   O arquivo `.env` deve estar configurado corretamente com a `DATABASE_URL` apontando para o seu banco de dados MySQL, pois o script usará esta configuração.

**Executando o Script:**

1.  Certifique-se de que seu ambiente virtual está ativado.
2.  Na raiz do projeto, execute o seguinte comando no terminal:
    ```bash
    python seed_db.py
    ```
3.  O script irá criar as tabelas (se ainda não existirem) e depois inserir os dados. Você verá mensagens de progresso no console.

    **Nota Importante Pós-Correções:** É crucial garantir que o banco de dados esteja limpo (sem dados antigos, especialmente na tabela de advogados) ou que os dados existentes sejam compatíveis antes de executar `python seed_db.py`. O script `seed_db.py` foi atualizado para:
    *   Criar um usuário administrador padrão (OAB: `00001SP`, Senha: `admin`).
    *   Não criar mais um usuário "ADVOGADO" padrão separado.
    *   Gerar advogados aleatórios sem o campo `is_admin` (que foi removido do modelo).
    *   Utilizar valores válidos do `AreaOfExpertiseEnum` para clientes.
    Se encontrar erros durante o povoamento, experimente limpar as tabelas relevantes (especialmente `lawyers`, `clients`, `legal_processes`) ou o banco de dados inteiro e executar o script novamente.
    **Nota Importante:** O script `seed_db.py` agora utiliza `Base.metadata.drop_all(bind=engine)` antes de `Base.metadata.create_all(bind=engine)`. Isso significa que **ele limpará todas as tabelas conhecidas pelo SQLAlchemy Base (advogados, clientes, processos) antes de recriá-las e populá-las.** Este comportamento é útil para garantir um estado limpo ao executar o seed, mas tenha cuidado se você tiver dados importantes nessas tabelas.
    O script também popula o novo campo `data_conclusao_real` para processos com status "concluído", gerando uma base de dados mais rica para futuras análises de IA.

**Configuração do Volume de Dados:**
O script agora gera um volume maior de dados para permitir testes mais robustos. Os valores foram aumentados para:
```python
NUM_LAWYERS = 50
NUM_CLIENTS = 100
NUM_PROCESSES = 250
```
Estes valores podem ser ajustados editando as constantes no topo do arquivo `seed_db.py`.

**Importante:** Executar o script múltiplas vezes pode gerar dados duplicados se os seus modelos não tiverem constraints `unique` em campos que deveriam ser únicos (como email do advogado ou número do processo, que já possuem). Se precisar recomeçar com um banco limpo, você pode precisar deletar as tabelas ou o banco de dados manualmente antes de executar o script novamente.

## Acessando a Aplicação

*   **Documentação Interativa da API (Swagger UI):**
    Após iniciar o servidor, acesse: `http://127.0.0.1:8000/docs`

*   **Página de Login:**
    `http://127.0.0.1:8000/frontend/login.html`

*   **Gerenciamento de Dados (CRUD):**
    (Requer login) `http://127.0.0.1:8000/frontend/index.html`

*   **Painel Home / Resumo Gerencial:**
    (Requer login) `http://127.0.0.1:8000/frontend/dashboard.html`

## Compatibilidade de Navegador

A interface web da aplicação (tanto a de teste em `index.html` quanto o painel em `dashboard.html`) foi desenvolvida e testada primariamente utilizando o navegador **Mozilla Firefox**.

A escolha pelo Firefox deveu-se à sua reconhecida leveza e bom desempenho em comparação com outros navegadores populares, como o Google Chrome, o que pode ser vantajoso em ambientes com recursos limitados.

Embora a aplicação utilize tecnologias web padrão (HTML, CSS, JavaScript) e bibliotecas populares (Bootstrap, Chart.js) que geralmente garantem boa compatibilidade, o funcionamento em outros navegadores (como Chrome, Edge, Safari, etc.) não foi extensivamente verificado. Espera-se que funcione corretamente na maioria dos navegadores modernos, mas podem existir pequenas diferenças visuais ou de comportamento.

## Planejamento e Acompanhamento do Projeto

Para uma visão detalhada do escopo completo do projeto, suas diferentes versões (Estável e Teste), e o status atual das funcionalidades (implementadas, pendentes e planejadas), consulte os seguintes documentos que são mantidos atualizados:

*   `DESCRICAO_PROJETO.md`: Fornece uma descrição narrativa completa do projeto, arquitetura e seus objetivos.
*   `FUNCIONALIDADES_PROJETO.md`: Apresenta uma lista estruturada das funcionalidades, divididas por status e versão, permitindo um acompanhamento claro do progresso.

## Estrutura do Projeto

```
.
├── .env                    # (Não versionado. Usado para DATABASE_URL para MySQL. Copie de .env.example)
├── .gitignore              # Arquivos e pastas ignorados pelo Git
├── DESCRICAO_PROJETO.md    # Descrição detalhada do projeto, escopo e funcionalidades
├── FUNCIONALIDADES_PROJETO.md # Lista de funcionalidades implementadas, pendentes e planejadas
├── README.md               # Este arquivo
├── database.py             # Configuração do banco de dados SQLAlchemy
├── main.py                 # Ponto de entrada da aplicação FastAPI, endpoints da API (incluindo CRUD de Advogados, Clientes, Processos)
├── models/                 # Modelos de dados
│   ├── __init__.py
│   ├── client.py           # Modelo Cliente (Pydantic e SQLAlchemy, `AreaOfExpertiseEnum`)
│   ├── lawyer.py           # Modelo Advogado (Pydantic e SQLAlchemy, campo `is_admin` removido)
│   └── legal_process.py    # Modelo Processo Jurídico (Pydantic e SQLAlchemy)
├── requirements.txt        # Dependências Python do projeto
├── routers/                # Módulos de roteamento da API
│   ├── __init__.py
│   └── auth.py             # Endpoints de autenticação (`/token`, `/users/me`)
├── seed_db.py              # Script para popular o banco de dados com dados sintéticos (inclui usuário admin)
├── telegram_bot.py         # Módulo para interações com o Telegram Bot (configuração inicial)
└── static_frontend/        # Arquivos da interface web
    ├── dashboard.css       # Estilos para o painel
    ├── dashboard.html      # Painel Home / Resumo Gerencial
    ├── dashboard.js        # Lógica JavaScript para o painel
    ├── index.html          # Interface de Gerenciamento de Dados
    ├── login.html          # Página de Login
    ├── script.js           # Lógica JavaScript para index.html e login.html (compartilhada)
    └── style.css           # Estilos para index.html e login.html (compartilhados)
```

Para referência sobre o histórico de commits e a tradução de prefixos de mensagens ou nomes de branch que foram feitos em inglês no início do projeto, consulte o arquivo `COMMITS_A_TRADUZIR.md`.

## Próximos Passos (Visão Geral da Versão Estável)

Consulte o `DESCRICAO_PROJETO.md` para o detalhamento completo. As próximas grandes funcionalidades incluem:
*   Integração com o Telegram para notificações (configuração base realizada, funcionalidade de envio pendente).
*   Implementação da funcionalidade de Inteligência Artificial obrigatória.
*   (Revisar `DESCRICAO_PROJETO.md` e `FUNCIONALIDADES_PROJETO.md` para outras funcionalidades pendentes da versão estável)

```