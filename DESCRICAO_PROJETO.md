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
*   **Status Atual (Frontend):** A ser desenvolvido.

### 2. Módulo de Cadastro e Gerenciamento de Advogados

*   **Funcionalidade:** Permitir o registro, visualização, atualização e exclusão de advogados.
*   **Campos de Dados do Advogado:**
    *   `id`: Identificador único (gerado automaticamente).
    *   `name`: Nome completo.
    *   `oab`: Número da OAB (único).
    *   `email`: Endereço de e-mail (único).
    *   `telegram_id`: ID do Telegram (opcional, para notificações).
*   **Operações CRUD:** Endpoints API para Criar, Ler (com filtros por nome/OAB), Atualizar e Deletar advogados.
*   **Regra de Negócio:** Advogado não pode ser excluído se vinculado a processos ativos.
*   **Status Atual (Backend):** CRUD básico e regra de negócio implementados.
*   **Status Atual (Frontend):** A ser desenvolvido.

### 3. Módulo de Cadastro e Gerenciamento de Processos Jurídicos

*   **Funcionalidade:** Permitir o registro e acompanhamento detalhado dos processos.
*   **Campos de Dados do Processo:**
    *   `id`: Identificador único (gerado automaticamente).
    *   `process_number`: Número do processo (único).
    *   `lawyer_id`: ID do advogado responsável (associado à tabela de advogados).
    *   `client_id`: ID do cliente relacionado (associado à tabela de clientes).
    *   `entry_date`: Data de entrada do processo.
    *   `delivery_deadline`: Prazo para entrega (ação intermediária).
    *   `fatal_deadline`: Prazo fatal do processo.
    *   `status`: Status atual (ex: "ativo", "concluído", "suspenso", "vencido"; padrão: "ativo").
    *   `action_type`: Tipo de ação do processo (categorização textual).
*   **Operações CRUD:** Endpoints API para Criar, Ler (com filtros), Atualizar e Deletar processos.
*   **Regra de Negócio:** `lawyer_id` e `client_id` devem existir ao criar/atualizar.
*   **Status Atual (Backend):** CRUD básico e validações implementados.
*   **Status Atual (Frontend):** A ser desenvolvido.

### 4. Painel Home / Resumo Gerencial (Frontend)

*   **Funcionalidade:** Apresentar uma visão geral e facilitar o acompanhamento dos processos.
*   **Componentes:**
    *   Listagem de Processos (com informações chave).
    *   Gráficos: Processos por Tipo de Ação, por Advogado, por Status.
    *   Alertas visuais para prazos próximos (ex: 7 dias do vencimento).
    *   Busca e Filtros (por cliente, tipo de ação, advogado, prazo).
*   **Status Atual (Backend):** API fornece os dados.
*   **Status Atual (Frontend):** A ser desenvolvido.

### 5. Integração com Telegram (Notificações Essenciais)

*   **Funcionalidade:** Enviar notificações automáticas aos advogados sobre seus prazos.
*   **Tipos de Notificação:**
    *   Prazos do dia (para `delivery_deadline` ou `fatal_deadline` no dia corrente).
    *   Prazos próximos (antecedência de X dias para `fatal_deadline`).
*   **Implementação:** Configurar bot no Telegram, armazenar token, desenvolver lógica no backend (provavelmente tarefas agendadas) para envio.
*   **Status Atual:** A ser desenvolvido. Campo `telegram_id` existe no modelo de Advogado.

### 6. Automação Mínima com Inteligência Artificial (IA) - Uma Funcionalidade Obrigatória

*   **Funcionalidade:** Implementar *uma* das seguintes opções de forma básica:
    *   **Opção A: Previsão de Atrasos:** Modelo simples para prever probabilidade de atraso.
    *   **Opção B: Classificação/Resumo Automático:** Ferramenta para gerar resumo curto ou classificar tipo de ação com base no nome/descrição do processo.
*   **Implementação:** Escolher opção, preparar dados (se necessário), treinar modelo simples, integrar ao backend.
*   **Status Atual:** A ser desenvolvido.

### 7. Requisitos Técnicos da Versão Estável

*   **Backend:** Python com FastAPI.
*   **Banco de Dados:** PostgreSQL (atualmente SQLite em desenvolvimento).
*   **Integração:** API do Telegram.
*   **Frontend:** Tecnologia a ser definida.
