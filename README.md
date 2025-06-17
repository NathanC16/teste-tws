# Desafio Técnico - Cadastro e Monitoramento de Processos Jurídicos

Aplicação web para um escritório de advocacia especializado no setor de energia, permitindo o cadastro e o acompanhamento detalhado de processos jurídicos. O sistema foca na organização, controle de prazos e automação de notificações.

## Tecnologias Utilizadas

*   **Backend:**
    *   Python 3.10+
    *   FastAPI: Framework web para construção da API.
    *   SQLAlchemy: ORM para interação com o banco de dados.
    *   Uvicorn: Servidor ASGI para FastAPI.
    *   Pydantic: Para validação de dados.
*   **Banco de Dados:**
    *   SQLite: Utilizado por padrão para desenvolvimento e testes locais (configurado em `database.py`).
    *   PostgreSQL: Suportado e recomendado para produção (requer configuração no arquivo `.env`).
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

*   **SQLite (Padrão para Desenvolvimento):**
    A aplicação está configurada por padrão para usar um banco de dados SQLite chamado `sql_app.db`, que será criado automaticamente na raiz do projeto na primeira execução. Esta configuração está em `database.py`.

*   **PostgreSQL (Recomendado para Produção):**
    1.  Certifique-se de ter uma instância do PostgreSQL em execução.
    2.  Crie um arquivo `.env` na raiz do projeto (este arquivo é ignorado pelo Git e não deve ser enviado ao repositório).
    3.  Adicione a URL de conexão do seu banco PostgreSQL ao arquivo `.env`:
        ```env
        DATABASE_URL="postgresql://user:password@host:port/dbname"
        ```
        Substitua `user`, `password`, `host`, `port`, e `dbname` pelas suas credenciais.
    4.  Em `database.py`, comente a linha referente ao `DATABASE_URL` do SQLite e descomente a linha que carrega a URL do `os.getenv("DATABASE_URL")`.

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