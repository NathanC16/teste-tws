# Desafio Técnico - Cadastro e Monitoramento de Processos Jurídicos

Aplicação web para um escritório de advocacia especializado no setor de energia, permitindo o cadastro e o acompanhamento detalhado de processos jurídicos. O sistema foca na organização, controle de prazos e automação de notificações.

## Tecnologias Utilizadas

*   **Backend:**
    *   Python 3.10+
    *   FastAPI: Framework web para construção da API.
    *   SQLAlchemy: ORM para interação com o banco de dados.
    *   mysqlclient: Driver Python para MySQL.
    *   Uvicorn: Servidor ASGI para FastAPI.
    *   Pydantic: Para validação de dados.
*   **Banco de Dados:**
    *   MySQL: Banco de dados padrão da aplicação (requer configuração via arquivo `.env` e driver `mysqlclient`).
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
        .env\Scriptsctivate
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

1.  **Instale e configure o MySQL Server:**
    Certifique-se de ter uma instância do MySQL Server em execução e acessível. Crie um banco de dados para a aplicação (ex: `mydatabase`).

2.  **Crie um arquivo `.env`:**
    Na raiz do projeto, se ainda não o fez, crie uma cópia do arquivo `.env.example` e renomeie-a para `.env`.
    ```bash
    cp .env.example .env
    ```
    O arquivo `.env` é ignorado pelo Git e não deve ser versionado.

3.  **Configure a `DATABASE_URL` no arquivo `.env`:**
    Abra o arquivo `.env` e edite a variável `DATABASE_URL` com as suas credenciais de conexão do MySQL.
    O formato é: `mysql+mysqlclient://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO`
    Exemplo:
    ```env
    DATABASE_URL="mysql+mysqlclient://user:password@localhost:3306/mydatabase"
    ```
    Substitua `user`, `password`, `localhost`, `3306` (porta padrão do MySQL), e `mydatabase` pelos valores corretos da sua configuração do MySQL. A aplicação irá falhar ao iniciar se esta variável não estiver corretamente configurada.

4.  **Criação das Tabelas:**
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

## Acessando a Aplicação

*   **Documentação Interativa da API (Swagger UI):**
    Após iniciar o servidor, acesse: `http://127.0.0.1:8000/docs`

*   **Interface Web de Teste:**
    Uma interface básica para testar as funcionalidades CRUD está disponível em:
    `http://127.0.0.1:8000/frontend/index.html`

## Estrutura do Projeto

```
.
├── .env                    # (Opcional, para variáveis de ambiente como DATABASE_URL para PostgreSQL)
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