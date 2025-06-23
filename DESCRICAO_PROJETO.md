# Descrição do Projeto: Cadastro e Monitoramento de Processos Jurídicos em Energia

## Objetivo Principal

Desenvolver uma aplicação web completa para um escritório de advocacia especializado no setor de energia. A plataforma deve permitir o cadastro e o acompanhamento detalhado de processos jurídicos, com foco em organização, controle rigoroso de prazos, automação de notificações para os advogados e uma visão gerencial clara do andamento de todos os casos.

Este documento será atualizado conforme o projeto evolui.

## Versão Atual Focada: Estável

Esta versão visa entregar um sistema funcional e confiável com as funcionalidades essenciais.

### 1. Módulo de Cadastro e Gerenciamento de Clientes

*   **Funcionalidade:** Permitir o registro, visualização, atualização e exclusão de clientes.
*   **Campos de Dados do Cliente:**
    *   `id`: Identificador único (gerado automaticamente).
    *   `name`: Nome completo (pessoa física) ou Razão Social (pessoa jurídica).
    *   `area_of_expertise`: Área de atuação específica do cliente.
*   **Operações CRUD:** Endpoints API para Criar, Ler, Atualizar e Deletar clientes.
*   **Regra de Negócio:** Cliente não pode ser excluído se vinculado a processos ativos.
*   **Status Atual (Backend):** CRUD básico e regra de negócio implementados.
*   **Status Atual (Frontend):** Interface de gerenciamento (CRUD) implementada em `static_frontend/index.html`, permitindo listagem, criação, edição e exclusão de clientes.

### 2. Módulo de Cadastro e Gerenciamento de Advogados

*   **Funcionalidade:** Permitir o registro, visualização, atualização e exclusão de advogados.
*   **Campos de Dados do Advogado:**
    *   `id`: Identificador único (gerado automaticamente).
    *   `name`: Nome completo.
    *   `oab`: Número da OAB (único).
    *   `email`: Endereço de e-mail (único).
    *   `username`: Nome de usuário para login (único, opcional).
    *   `telegram_id`: ID do Telegram (opcional, para notificações).
*   **Operações CRUD:** Endpoints API para Criar, Ler (com filtros por nome/OAB), Atualizar e Deletar advogados.
*   **Regra de Negócio:** Advogado não pode ser excluído se vinculado a processos ativos. O usuário admin principal (OAB "00001SP" ou username "admin") não pode ser excluído.
*   **Status Atual (Backend):** CRUD básico e regras de negócio implementadas, incluindo proteção contra deleção do admin. Login com OAB ou username.
*   **Status Atual (Frontend):** Interface de gerenciamento (CRUD) implementada em `static_frontend/index.html`, permitindo listagem, criação, edição e exclusão de advogados. A UI impede a deleção do usuário admin principal.

### 3. Módulo de Cadastro e Gerenciamento de Processos Jurídicos

*   **Funcionalidade:** Permitir o registro e acompanhamento detalhado dos processos.
*   **Campos de Dados do Processo:**
    *   `id`: Identificador único (gerado automaticamente).
    *   `process_number`: Número do processo (único).
    *   `lawyer_id`: ID do advogado responsável (associado à tabela de advogados).
    *   `client_id`: ID do cliente relacionado (associado à tabela de clientes).
    *   `entry_date`: Data de entrada do processo (aceita "dd/mm/aaaa" no frontend).
    *   `delivery_deadline`: Prazo para entrega (ação intermediária, aceita "dd/mm/aaaa" no frontend).
    *   `fatal_deadline`: Prazo fatal do processo (aceita "dd/mm/aaaa" no frontend).
    *   `data_conclusao_real`: Data em que o processo foi efetivamente concluído (opcional, para análise de prazos; aceita "dd/mm/aaaa" no frontend).
    *   `status`: Status atual (ex: "ativo", "concluído", "suspenso", "vencido"; padrão: "ativo").
    *   `action_type`: Tipo de ação do processo (categorização textual).
*   **Operações CRUD:** Endpoints API para Criar, Ler (com filtros, incluindo intervalo de `fatal_deadline`), Atualizar e Deletar processos.
*   **Exclusão em Massa (Interface de Teste):** A interface de teste (`index.html`) permite selecionar múltiplos processos através de checkboxes e excluí-los em uma única operação.
*   **Regra de Negócio:** `lawyer_id` e `client_id` devem existir ao criar/atualizar.
*   **Dados de Teste (`seed_db.py`):** O script `seed_db.py` popula o banco com um volume aumentado de dados (50 advogados, 100 clientes, 250 processos) e preenche o campo `data_conclusao_real` para processos com status "concluído", auxiliando em testes e análises futuras.
*   **Status Atual (Backend):** CRUD básico e validações implementados. Pydantic models aceitam datas no formato "dd/mm/aaaa" e ISO, incluindo o novo campo `data_conclusao_real`. API `GET /processes/` suporta filtragem por intervalo de `fatal_deadline`.
*   **Status Atual (Frontend de Teste `index.html`):** CRUD completo, incluindo listagem, adição, edição (com o campo `data_conclusao_real`), exclusão individual e exclusão em massa de processos. Formulários de data aceitam e exibem o formato "dd/mm/aaaa". Implementada pesquisa em tempo real na lista de processos.
*   **Status Atual (Frontend do Painel `dashboard.html`):** Visualização em tabela dos processos com capacidade de pesquisa local na tabela. Filtros de processos por status, advogado, cliente, e **intervalo de Prazo Fatal** (com campos de texto "dd/mm/aaaa" e validação no cliente) via API.

### 4. Autenticação e Autorização

*   **Funcionalidade:**
    *   Login de usuários (advogados) via OAB ou `username` e senha.
    *   Geração de token JWT para autenticação em endpoints protegidos.
    *   Verificação de token para acesso a rotas da API e páginas frontend.
    *   Mecanismo de logout.
*   **Status Atual:**
    *   **Backend:** Implementado endpoint `/auth/token` para login. Segurança de senha com hashing (bcrypt). Endpoint `/auth/users/me` para obter dados do usuário logado. Endpoint `PUT /auth/users/me/settings` para que usuários atualizem seus próprios dados (nome, email, telegram_id, senha).
    *   **Frontend:** Lógica de login em `login.html`. Token JWT armazenado no `localStorage`. Cabeçalhos de autorização `Bearer token` enviados nas requisições API. Funcionalidade de logout implementada em todas as páginas autenticadas. Redirecionamento para login se não autenticado.
    *   **Níveis de Acesso:**
        *   **Admin:** Acesso total a todos os dados e funcionalidades.
        *   **Advogado Padrão:** Acesso restrito aos seus próprios processos (visualização, criação, edição, exclusão). Pode gerenciar suas próprias configurações de perfil.
    *   **Criação Automática de Usuários Essenciais:** O usuário 'admin' (OAB '00001SP') e um usuário de teste 'advogado' (OAB '12345SP') são criados automaticamente no startup da aplicação se não existirem.

### 5. Configurações de Usuário (Frontend - `user_settings.html`)

*   **Funcionalidade:** Permitir que todos os usuários logados gerenciem suas próprias informações de perfil.
*   **Componentes:**
    *   Visualização de dados não editáveis (Username, OAB).
    *   Formulário para atualizar dados editáveis (Nome, Email, ID do Telegram).
    *   Formulário para alterar a senha (requer senha atual).
*   **Acesso:** Link "Minhas Configurações" disponível na barra de navegação para todos os usuários logados.
*   **Status Atual:** Implementado (`static_frontend/user_settings.html`, `static_frontend/user_settings.js`).

### 6. Painel Home / Resumo Gerencial (Frontend)

*   **Funcionalidade:** Apresentar uma visão geral e facilitar o acompanhamento dos processos. Requer autenticação.
*   **Componentes:**
    *   **Cards de Resumo:** Exibição de totais (Processos Ativos, Prazos Fatais Próximos, Total de Advogados, Total de Clientes).
    *   **Alertas de Prazos:** Listagem destacada de processos com prazos fatais nos próximos 7 dias, com indicação visual de urgência.
    *   **Filtros de Processos:** Permite filtrar a lista de processos exibida na tabela por Status, Advogado, Cliente, e **intervalo de Prazo Fatal** (campos de texto "dd/mm/aaaa" com validação no cliente), consultando a API.
    *   **Tabela de Processos:** Listagem dos processos com informações chave. Inclui campo de **pesquisa local** para filtrar dinamicamente os dados já carregados na tabela. A tabela possui uma **barra de scroll vertical** quando o conteúdo excede uma altura máxima, e o **cabeçalho da tabela permanece fixo (sticky)** durante a rolagem, melhorando a usabilidade.
    *   **Gráficos para Acompanhamento:**
        *   Processos por Status (Gráfico de Pizza).
        *   Processos por Advogado (Gráfico de Barras **Horizontais**).
        *   Processos por Tipo de Ação (Gráfico de Barras **Horizontais**).
        *   Os gráficos são exibidos em **abas** para melhor organização.
        *   Os gráficos exibem **valores e/ou porcentagens diretamente nos elementos (datalabels)** para facilitar a leitura. Foi realizado um ajuste de `offset` nos rótulos do gráfico "Processos por Tipo de Ação" para melhor visualização.
*   **Tecnologias Utilizadas (Frontend do Painel):**
    *   HTML5, CSS3, JavaScript (Vanilla JS).
    *   Bootstrap 5.3 (para layout e componentes).
    *   Chart.js 3.7 e `chartjs-plugin-datalabels` (para renderização dos gráficos e exibição de rótulos de dados).
*   **Status Atual:** Implementado (`static_frontend/dashboard.html`, `dashboard.js`, `dashboard.css`).
    *   Busca dados da API (requerendo autenticação) para processos, advogados e clientes.
    *   Renderiza todos os componentes listados: cards, alertas, filtros (incluindo intervalo de datas para Prazo Fatal), tabela (com pesquisa local e scroll, e dados restritos para não-admins) e gráficos (em abas, horizontais para barras, com datalabels).
    *   A interface é servida em `/frontend/dashboard.html`.
*   **Navegação:** Inclui barra de navegação global com links para "Gerenciamento de Dados", "Painel Home", "Minhas Configurações" e botão de "Sair" (logout).

### 7. Integração com Telegram (Notificações Essenciais)

*   **Funcionalidade:** Enviar notificações automáticas aos advogados sobre seus prazos.
*   **Tipos de Notificação:**
    *   Prazos do dia (para `delivery_deadline` ou `fatal_deadline` no dia corrente).
    *   Prazos próximos (antecedência de X dias para `fatal_deadline`).
*   **Implementação:** Bot do Telegram configurado (`telegram_bot.py`) para interagir com a API do Telegram (usando `async/await` com `python-telegram-bot` v20+). Lógica de notificações para prazos do dia e prazos futuros implementada em `core/notifications.py` (também `async`). As notificações são agendadas e disparadas automaticamente pela aplicação FastAPI usando `APScheduler` em background, que foi configurado para lidar com jobs assíncronos. As variáveis de ambiente `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADVANCE_NOTIFICATION_DAYS` e `TELEGRAM_TEST_CHAT_ID` (para o script de teste `teste_telegram_notifications.py`) são usadas. O campo `telegram_id` no modelo de Advogado (Chat ID numérico) é usado para direcionar as mensagens.
*   **Status Atual:** Implementado e testado.

### 8. Automação Mínima com Inteligência Artificial (IA) - Uma Funcionalidade Obrigatória

*   **Funcionalidade:** Implementar *uma* das seguintes opções de forma básica:
    *   **Opção A: Previsão de Atrasos:** Modelo simples para prever probabilidade de atraso. Nota: A preparação de dados para esta funcionalidade foi iniciada com a inclusão do campo `data_conclusao_real` no modelo de processos.
    *   **Opção B: Classificação/Resumo Automático:** Ferramenta para gerar resumo curto ou classificar tipo de ação com base no nome/descrição do processo.
*   **Implementação (Foco MVP):**
    *   A Opção A (Previsão de Atrasos) será o foco inicial para o MVP.
    *   Será desenvolvido um modelo estatístico simples para analisar o histórico de conclusão de processos (considerando `delivery_deadline` vs `data_conclusao_real`).
    *   Este modelo atribuirá um indicador de risco de atraso a processos ativos, auxiliando na priorização e gestão proativa.
*   **Status Atual:** Em planejamento e desenvolvimento inicial.

### 9. Requisitos Técnicos da Versão Estável

*   **Backend:** Python com FastAPI.
*   **Banco de Dados:** MySQL (Padrão). SQLite pode ser usado como alternativa para desenvolvimento local.
*   **Integração:** API do Telegram (via `python-telegram-bot`).
*   **Agendamento de Tarefas:** APScheduler.
*   **Frontend:** HTML, CSS, Vanilla JavaScript.

### 10. Gerenciamento de Dados (Frontend - `index.html`)

*   **Funcionalidade:** Prover uma interface de usuário para gerenciamento direto (CRUD) das entidades base: Advogados, Clientes e Processos Jurídicos. Requer autenticação.
    *   Listagem, criação, edição e exclusão para cada entidade. As listas agora possuem **barras de scroll vertical** para melhor navegação com grande volume de dados.
    *   Exclusão em massa para processos.
    *   **Pesquisa em tempo real** para as listas de advogados, clientes e processos, com acionamento por digitação e pela tecla "Enter" (que remove o foco do campo). Ícones de lupa clicáveis para focar nos campos de pesquisa.
    *   **Formulários com validação** no lado do cliente para formatos de OAB, Telegram ID, e-mail, e datas ("dd/mm/aaaa").
    *   **Botão de logout** na barra de navegação.
    *   **Prevenção de deleção do admin** principal diretamente na interface do usuário (botão de excluir desabilitado).
*   **Tecnologias:**
    *   HTML5, CSS3 (customizado e Bootstrap 5.3).
    *   JavaScript (Vanilla JS).
    *   Font Awesome 6.5 (para iconografia).
*   **Estrutura e Design:**
    *   `static_frontend/index.html`: Página principal.
    *   Layout aprimorado com Bootstrap, utilizando sistema de grid para organizar as seções.
    *   Formulários e listas estilizados com componentes Bootstrap e ícones Font Awesome.
    *   Navegação global implementada através de uma barra de navegação Bootstrap.
    *   `static_frontend/style.css`: CSS customizado.
    *   `static_frontend/script.js`: Lógica para interagir com a API FastAPI e manipular o DOM.
*   **Servindo os arquivos:** A API FastAPI serve esta interface em `/frontend/index.html`.
*   **Status Atual:** Implementada e funcional, com layout, navegação, CRUD completo para as três entidades (incluindo `data_conclusao_real` para processos), validações, pesquisa e funcionalidades de logout aprimoradas. As listas de dados principais agora possuem barras de scroll.

## Documentação Adicional

*   **README.md:** Contém instruções detalhadas para configuração do ambiente, instalação de dependências, configuração do banco de dados, execução da aplicação e acesso à interface de teste.
