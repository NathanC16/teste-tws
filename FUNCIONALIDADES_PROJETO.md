# Planejamento de Funcionalidades do Projeto

Este documento detalha as funcionalidades implementadas, pendentes para a Versão Estável, e as funcionalidades extras planejadas para a Versão de Teste do sistema de Cadastro e Monitoramento de Processos Jurídicos.

## Legenda de Status
*   ✅ **Implementado:** Funcionalidade concluída e integrada.
*   ⏳ **Pendente:** Funcionalidade planejada para a versão atual, mas ainda não iniciada ou concluída.
*   📝 **Planejado (Extra):** Funcionalidade considerada para a Versão de Teste/futuras melhorias.

---

## I. Versão Estável

O objetivo desta versão é fornecer um sistema central robusto e confiável com as funcionalidades essenciais, conforme listado abaixo.

### 1. Módulo de Cadastro e Gerenciamento de Clientes

*   ✅ **ID único do cliente:** Implementado (gerado automaticamente pelo banco de dados).
*   ✅ **Nome completo / Razão social (Cliente):** Implementado (campo `name` no modelo `ClientDB`).
*   ✅ **Área de atuação (selecionável entre as listadas) (Cliente):** Implementado. A API (`GET /areas-of-expertise/`) fornece as opções do `AreaOfExpertiseEnum`, e o frontend (`index.html`) popula um campo `<select>` para escolha.
*   ✅ **CRUD para Clientes:** Implementado (API e interface de gerenciamento de dados em `index.html`).
*   ✅ **Regra de Negócio:** Cliente não pode ser excluído se vinculado a processos ativos (implementado no backend).

### 2. Módulo de Cadastro e Gerenciamento de Advogados

*   O sistema deve permitir cadastro de novos advogados, com os seguintes dados:
    *   ✅ **Nome completo:** Implementado (campo `name` no modelo `LawyerDB`).
    *   ✅ **Número da OAB:** Implementado (campo `oab` no modelo `LawyerDB`, com constraint `unique`).
    *   ✅ **E-mail:** Implementado (campo `email` no modelo `LawyerDB`, com constraint `unique`).
    *   ✅ **Username:** Implementado (campo `username` no modelo `LawyerDB`, único, para login).
    *   ✅ **ID do Telegram (para notificações):** Implementado (campo `telegram_id`, opcional, no modelo `LawyerDB`).
*   ✅ **Edição dos dados:** Implementado (API e interface de gerenciamento de dados em `index.html`).
*   ✅ **Exclusão de advogados, com verificação se estão vinculados a processos:** Implementado (API).
*   ✅ **Proteção contra deleção do admin:** O usuário admin principal (OAB "00001SP" / username "admin") não pode ser excluído (proteção no backend e na UI de `index.html`).
*   ✅ **Consulta de advogados via listagem com filtros por nome, OAB:** Implementado (API `GET /lawyers/`).

### 3. Autenticação e Autorização

*   ✅ **Login de usuário:** Implementado com OAB/Username e Senha.
*   ✅ **Geração e uso de Token JWT:** Tokens JWT são gerados no login e usados para autenticar requisições à API.
*   ✅ **Proteção de rotas da API:** Endpoints da API que requerem manipulação de dados são protegidos e exigem token JWT válido.
*   ✅ **Logout:** Funcionalidade de logout implementada nas interfaces `index.html` e `dashboard.html`, limpando o token do cliente.
*   ✅ **Páginas Frontend Protegidas:** As páginas `index.html` (gerenciamento) e `dashboard.html` verificam a existência de token e redirecionam para `login.html` se o token não for válido ou não existir.

### 4. Interface de Gerenciamento de Dados (`index.html`)

*   ✅ **CRUD completo para Advogados, Clientes e Processos Jurídicos:** Implementado, permitindo listagem, criação, edição e exclusão das três entidades.
*   ✅ **Exclusão em Massa de Processos:** Implementada.
*   ✅ **Pesquisa em Tempo Real:** Implementada para as listas de Advogados, Clientes e Processos. A pesquisa é acionada durante a digitação. Pressionar "Enter" remove o foco do campo de busca. Clicar no ícone de lupa foca no campo de busca.
*   ✅ **Formatação de Datas ("dd/mm/aaaa"):** Formulários de criação/edição de processos aceitam datas no formato "dd/mm/aaaa" e as exibem nesse formato ao editar. A conversão para o formato ISO (yyyy-mm-dd) é feita antes do envio para a API.
*   ✅ **Validação de Formulários no Cliente:** Implementada para campos como OAB, Telegram ID, e-mail, e formato das datas.
*   ✅ **Layout e Navegação:** Interface organizada com Bootstrap, navegação global e feedback visual para o usuário.
*   ✅ **Barras de Scroll nas Listas:** As listas de Advogados, Clientes e Processos agora possuem barras de scroll vertical para melhor navegação com grande volume de dados.

### 5. Módulo de Cadastro e Gerenciamento de Processos Jurídicos

*   ✅ **ID único do processo:** Implementado (gerado automaticamente).
*   ✅ **Número do processo:** Implementado (campo `process_number`, único).
*   ✅ **Advogado responsável (selecionar de lista cadastrada):** Implementado.
*   ✅ **Cliente associado ao processo (selecionar de lista cadastrada):** Implementado.
*   ✅ **Data de entrada do processo:** Implementado (campo `entry_date`).
*   ✅ **Prazo para entrega (Processo):** Implementado (campo `delivery_deadline`).
*   ✅ **Prazo fatal (Processo):** Implementado (campo `fatal_deadline`).
*   ✅ **Campo `data_conclusao_real`:** Permite registrar a data de conclusão efetiva dos processos. Implementado no backend (modelo e API) e no frontend (`index.html`) para CRUD.
*   ✅ **Status do processo:** Implementado (campo `status`, com valor padrão "ativo").
*   ✅ **Tipo de ação do processo:** Implementado (campo `action_type`, opcional).
*   ✅ **CRUD para Processos:** Implementado (API e interface de gerenciamento de dados em `index.html`).
*   ✅ **Regra de Negócio:** `lawyer_id` e `client_id` devem existir (validação no backend).
*   ✅ **Povoamento de `data_conclusao_real` no `seed_db.py`:** Script de popular dados agora preenche o campo `data_conclusao_real` para processos concluídos, simulando cenários de conclusão no prazo e com atraso, para futura análise de IA.
*   ✅ **Volume de Dados de Teste Aumentado:** O script `seed_db.py` foi atualizado para gerar um volume 5x maior de dados (50 advogados, 100 clientes, 250 processos) para testes mais robustos.

### 6. Painel Home / Resumo Gerencial (`dashboard.html`)

*   ✅ **Visão Geral com Cards de Resumo:** Exibição de totais (Processos Ativos, Prazos Fatais Próximos, Total de Advogados, Total de Clientes).
*   ✅ **Alertas de Prazos Próximos:** Listagem destacada de processos com prazos fatais nos próximos 7 dias.
*   ✅ **Tabela de Processos Detalhada:** Listagem de processos com informações chave, incluindo pesquisa local na tabela para filtrar os dados exibidos. Adicionada **barra de scroll vertical** à tabela e **cabeçalho fixo (sticky)** para melhor navegação com muitos registros.
*   ✅ **Filtros de Processos (via API):** Permite filtrar a lista de processos exibida na tabela por Status, Advogado e Cliente.
*   ✅ **Filtro por intervalo de Prazo Fatal:** Permite filtrar processos no dashboard especificando um período "De" e "Até" para o Prazo Fatal (campos de texto com formato "dd/mm/aaaa" e validação no cliente).
*   ✅ **Gráficos de Acompanhamento:**
    *   Implementados usando Chart.js e `chartjs-plugin-datalabels`.
    *   Gráficos são organizados em **abas** para melhor visualização ("Por Status", "Por Advogado", "Por Tipo de Ação").
    *   Exibem **valores e/ou porcentagens diretamente nos elementos do gráfico** (datalabels).
    *   Tipos: Pizza (Status), Barras **Horizontais** (Advogado, Tipo de Ação) para melhor legibilidade.
    *   Ajuste visual (offset) aplicado aos datalabels do gráfico "Processos por Tipo de Ação".
    *   Renderização otimizada (gráficos em abas não ativas são renderizados quando a aba é mostrada).

### 7. Integração com Telegram

*   ✅ **Notificações diárias com prazos do dia:** Implementado. Advogados recebem alertas para `delivery_deadline` ou `fatal_deadline` no dia corrente.
*   ✅ **Notificação antecipada (ex: X dias antes do prazo fatal):** Implementado. Advogados recebem alertas para `fatal_deadline` com antecedência configurável via `.env` (`TELEGRAM_ADVANCE_NOTIFICATION_DAYS`).
*   ⏳ **Possibilidade de envio automático de movimentações de processo:** Pendente (Considerado funcionalidade extra/futura).

### 8. Automação com IA (mínimo viável)

*   ⏳ **Proposta:** Usar IA para prever possíveis atrasos ou gerar resumo automático. Nota: A preparação de dados para a "previsão de possíveis atrasos" foi iniciada com a inclusão do campo `data_conclusao_real` no modelo de processos.

---

## II. Versão de Teste (Funcionalidades Extras Planejadas)

Esta versão incluirá todas as funcionalidades da Versão Estável, mais os seguintes recursos que agregam valor e podem ser usados para demonstração ou como base para futuras evoluções.

*   📝 **Níveis de Acesso Detalhados:**
    *   Diferentes perfis de acesso (além do admin implícito) com permissões distintas para visualizar ou modificar dados e acessar funcionalidades.
*   📝 **Upload de Documentos:**
    *   Funcionalidade para anexar arquivos (documentos, petições, etc.) a processos jurídicos específicos.
*   📝 **Exportação de Relatórios:**
    *   Capacidade de exportar dados e relatórios (ex: lista de processos filtrada, dados de gráficos) em formatos como CSV, Excel ou PDF.
*   📝 **Integração com Agendas Externas:**
    *   Sincronização de prazos de processos com agendas como Google Calendar ou Microsoft Outlook.
*   📝 **Funcionalidades de IA Expandidas (Além da Obrigatória):**
    *   Implementação da segunda opção de IA não escolhida para a versão estável.
    *   Exploração de outras funcionalidades de IA.
*   📝 **Melhorias Avançadas de UI/UX no Painel Home:**
    *   Atualização dinâmica dos gráficos com base nos filtros da tabela de processos.
    *   Paginação para a tabela de processos.
    *   Funcionalidades de ordenação na tabela de processos.
    *   Interface de edição/visualização de detalhes de um processo diretamente do painel.

---
Este documento será atualizado conforme o progresso do projeto.
