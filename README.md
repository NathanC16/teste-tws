# Desafio Técnico - Cadastro e Monitoramento de Processos Jurídicos

Aplicação web para um escritório de advocacia especializado no setor de energia, permitindo o cadastro e o acompanhamento detalhado de processos jurídicos. O sistema foca na organização, controle de prazos e automação de notificações.

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
*   **Frontend (Interface de Teste):**
    *   HTML5
    *   CSS3
    *   JavaScript (Vanilla)
*   **Documentação:**
    *   Markdown (`DESCRICAO_PROJETO.md`, `README.md`)

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

## Populando o Banco de Dados com Dados de Teste (Opcional)

Para facilitar os testes e a demonstração da aplicação, foi incluído um script (`seed_db.py`) que utiliza a biblioteca Faker para popular o banco de dados com dados sintéticos (advogados, clientes e processos).

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

**Configuração do Volume de Dados:**
Você pode ajustar o número de advogados, clientes e processos a serem gerados editando as seguintes constantes no topo do arquivo `seed_db.py`:
```python
NUM_LAWYERS = 10
NUM_CLIENTS = 20
NUM_PROCESSES = 50
```

**Importante:** Executar o script múltiplas vezes pode gerar dados duplicados se os seus modelos não tiverem constraints `unique` em campos que deveriam ser únicos (como email do advogado ou número do processo, que já possuem). Se precisar recomeçar com um banco limpo, você pode precisar deletar as tabelas ou o banco de dados manualmente antes de executar o script novamente.

## Acessando a Aplicação

*   **Documentação Interativa da API (Swagger UI):**
    Após iniciar o servidor, acesse: `http://127.0.0.1:8000/docs`

*   **Interface Web de Teste:**
    Uma interface básica para testar as funcionalidades CRUD está disponível em:
    `http://127.0.0.1:8000/frontend/index.html`

## Compatibilidade de Navegador

A interface web da aplicação (tanto a de teste em `index.html` quanto o painel em `dashboard.html`) foi desenvolvida e testada primariamente utilizando o navegador **Mozilla Firefox**.

A escolha pelo Firefox deveu-se à sua reconhecida leveza e bom desempenho em comparação com outros navegadores populares, como o Google Chrome, o que pode ser vantajoso em ambientes com recursos limitados.

Embora a aplicação utilize tecnologias web padrão (HTML, CSS, JavaScript) e bibliotecas populares (Bootstrap, Chart.js) que geralmente garantem boa compatibilidade, o funcionamento em outros navegadores (como Chrome, Edge, Safari, etc.) não foi extensivamente verificado. Espera-se que funcione corretamente na maioria dos navegadores modernos, mas podem existir pequenas diferenças visuais ou de comportamento.

## Estrutura do Projeto

```
.
├── .env                    # (Não versionado. Usado para DATABASE_URL para MySQL. Copie de .env.example)
├── .gitignore              # Arquivos e pastas ignorados pelo Git
├── DESCRICAO_PROJETO.md    # Descrição detalhada do projeto, escopo e funcionalidades
├── README.md               # Este arquivo
├── database.py             # Configuração do banco de dados SQLAlchemy
├── main.py                 # Ponto de entrada da aplicação FastAPI, endpoints da API
├── models/                 # Modelos de dados
│   ├── __init__.py
│   ├── client.py           # Modelo Cliente (Pydantic e SQLAlchemy)
│   ├── lawyer.py           # Modelo Advogado (Pydantic e SQLAlchemy)
│   └── legal_process.py    # Modelo Processo Jurídico (Pydantic e SQLAlchemy)
├── requirements.txt        # Dependências Python do projeto
└── static_frontend/        # Arquivos da interface web de teste
    ├── index.html
    ├── script.js
    └── style.css
```

## Próximos Passos (Visão Geral da Versão Estável)

Consulte o `DESCRICAO_PROJETO.md` para o detalhamento completo. As próximas grandes funcionalidades incluem:
*   Desenvolvimento do Painel Home / Resumo Gerencial (Frontend).
*   Integração com o Telegram para notificações.
*   Implementação da funcionalidade de Inteligência Artificial obrigatória.

```