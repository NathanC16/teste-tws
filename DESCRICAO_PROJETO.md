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
    *   `status`: Status atual (ex: "ativo", "concluído", "suspenso", "vencido"; padrão: "ativo").
    *   `action_type`: Tipo de ação do processo (categorização textual).
*   **Operações CRUD:** Endpoints API para Criar, Ler (com filtros), Atualizar e Deletar processos.
*   **Exclusão em Massa (Interface de Teste):** A interface de teste (`index.html`) permite selecionar múltiplos processos através de checkboxes e excluí-los em uma única operação.
*   **Regra de Negócio:** `lawyer_id` e `client_id` devem existir ao criar/atualizar.
*   **Status Atual (Backend):** CRUD básico e validações implementados. Pydantic models aceitam datas no formato "dd/mm/aaaa" e ISO.
*   **Status Atual (Frontend de Teste `index.html`):** CRUD completo, incluindo listagem, adição, edição, exclusão individual e exclusão em massa de processos. Formulários de data aceitam e exibem o formato "dd/mm/aaaa". Implementada pesquisa em tempo real na lista de processos.
*   **Status Atual (Frontend do Painel `dashboard.html`):** Visualização em tabela dos processos com capacidade de pesquisa local na tabela. Filtros de processos por status, advogado e cliente via API.

### 4. Autenticação e Autorização

*   **Funcionalidade:**
    *   Login de usuários (advogados) via OAB ou `username` e senha.
    *   Geração de token JWT para autenticação em endpoints protegidos.
    *   Verificação de token para acesso a rotas da API e páginas frontend.
    *   Mecanismo de logout.
*   **Status Atual:**
    *   **Backend:** Implementado endpoint `/auth/token` para login. Segurança de senha com hashing (bcrypt). Endpoint `/auth/users/me` para obter dados do usuário logado.
    *   **Frontend:** Lógica de login em `login.html`. Token JWT armazenado no `localStorage`. Cabeçalhos de autorização `Bearer token` enviados nas requisições API. Funcionalidade de logout implementada nas páginas `index.html` e `dashboard.html`. Redirecionamento para login se não autenticado.

### 5. Painel Home / Resumo Gerencial (Frontend)

*   **Funcionalidade:** Apresentar uma visão geral e facilitar o acompanhamento dos processos. Requer autenticação.
*   **Componentes:**
    *   **Cards de Resumo:** Exibição de totais (Processos Ativos, Prazos Fatais Próximos, Total de Advogados, Total de Clientes).
    *   **Alertas de Prazos:** Listagem destacada de processos com prazos fatais nos próximos 7 dias, com indicação visual de urgência.
    *   **Filtros de Processos:** Permite filtrar a lista de processos exibida na tabela por Status, Advogado e Cliente (consultando a API).
    *   **Tabela de Processos:** Listagem dos processos com informações chave. Inclui campo de **pesquisa local** para filtrar dinamicamente os dados já carregados na tabela.
    *   **Gráficos para Acompanhamento:**
        *   Processos por Status (Gráfico de Pizza).
        *   Processos por Advogado (Gráfico de Barras).
        *   Processos por Tipo de Ação (Gráfico de Barras).
        *   Os gráficos são exibidos em **abas** para melhor organização.
        *   Os gráficos exibem **valores e/ou porcentagens diretamente nos elementos (datalabels)** para facilitar a leitura.
*   **Tecnologias Utilizadas (Frontend do Painel):**
    *   HTML5, CSS3, JavaScript (Vanilla JS).
    *   Bootstrap 5.3 (para layout e componentes).
    *   Chart.js 3.7 e `chartjs-plugin-datalabels` (para renderização dos gráficos e exibição de rótulos de dados).
*   **Status Atual:** Implementado (`static_frontend/dashboard.html`, `dashboard.js`, `dashboard.css`).
    *   Busca dados da API (requerendo autenticação) para processos, advogados e clientes.
    *   Renderiza todos os componentes listados: cards, alertas, filtros, tabela (com pesquisa local) e gráficos (em abas, com datalabels).
    *   A interface é servida em `/frontend/dashboard.html`.
*   **Navegação:** Inclui barra de navegação global com links para "Gerenciamento de Dados", "Painel Home" e botão de "Sair" (logout).

### 6. Integração com Telegram (Notificações Essenciais)

*   **Funcionalidade:** Enviar notificações automáticas aos advogados sobre seus prazos.
*   **Tipos de Notificação:**
    *   Prazos do dia (para `delivery_deadline` ou `fatal_deadline` no dia corrente).
    *   Prazos próximos (antecedência de X dias para `fatal_deadline`).
*   **Implementação:** Configurar bot no Telegram, armazenar token, desenvolver lógica no backend (provavelmente tarefas agendadas) para envio.
*   **Status Atual:** A ser desenvolvido. Campo `telegram_id` existe no modelo de Advogado.

### 7. Automação Mínima com Inteligência Artificial (IA) - Uma Funcionalidade Obrigatória

*   **Funcionalidade:** Implementar *uma* das seguintes opções de forma básica:
    *   **Opção A: Previsão de Atrasos:** Modelo simples para prever probabilidade de atraso.
    *   **Opção B: Classificação/Resumo Automático:** Ferramenta para gerar resumo curto ou classificar tipo de ação com base no nome/descrição do processo.
*   **Implementação:** Escolher opção, preparar dados (se necessário), treinar modelo simples, integrar ao backend.
*   **Status Atual:** A ser desenvolvido.

### 8. Requisitos Técnicos da Versão Estável

*   **Backend:** Python com FastAPI.
*   **Banco de Dados:** MySQL (Padrão). SQLite pode ser usado como alternativa para desenvolvimento local.
*   **Integração:** API do Telegram.
*   **Frontend:** HTML, CSS, Vanilla JavaScript.

### 9. Gerenciamento de Dados (Frontend - `index.html`)

*   **Funcionalidade:** Prover uma interface de usuário para gerenciamento direto (CRUD) das entidades base: Advogados, Clientes e Processos Jurídicos. Requer autenticação.
    *   Listagem, criação, edição e exclusão para cada entidade.
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
*   **Status Atual:** Implementada e funcional, com layout, navegação, CRUD completo para as três entidades, validações, pesquisa e funcionalidades de logout aprimoradas.

## Documentação Adicional

*   **README.md:** Contém instruções detalhadas para configuração do ambiente, instalação de dependências, configuração do banco de dados, execução da aplicação e acesso à interface de teste.
