# Desafio Técnico - Cadastro e Monitoramento de Processos Jurídicos

Aplicação web para um escritório de advocacia especializado no setor de energia, permitindo o cadastro e o acompanhamento detalhado de processos jurídicos.

## Configuração do Ambiente

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd <NOME_DO_DIRETORIO>
    ```

2.  **Crie e ative um ambiente virtual:**
    ```bash
    python -m venv venv
    # No Windows
    # venv\Scripts\activate
    # No macOS/Linux
    # source venv/bin/activate
    ```

3.  **Instale as dependências:**
    ```bash
    pip install -r requirements.txt
    ```

## Executando a Aplicação

Para iniciar o servidor FastAPI, execute o seguinte comando na raiz do projeto:
```bash
uvicorn main:app --reload
```
A aplicação estará disponível em `http://127.0.0.1:8000`.
Você pode acessar a documentação interativa da API (Swagger UI) em `http://127.0.0.1:8000/docs`.

## Estrutura do Projeto (Inicial)

- `main.py`: Arquivo principal da aplicação FastAPI com os endpoints.
- `requirements.txt`: Lista de dependências do projeto.
- `models/`: Diretório contendo os modelos de dados Pydantic.
  - `lawyer.py`: Modelo para Advogados.
  - `client.py`: Modelo para Clientes.
  - `legal_process.py`: Modelo para Processos Jurídicos.