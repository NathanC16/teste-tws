# Planejamento de Funcionalidades do Projeto

Este documento detalha as funcionalidades implementadas, pendentes para a Versão Estável, e as funcionalidades extras planejadas para a Versão de Teste do sistema de Cadastro e Monitoramento de Processos Jurídicos.

## Legenda de Status (Sugerida)
*   ✅ **Implementado:** Funcionalidade concluída e integrada.
*   ⏳ **Pendente:** Funcionalidade planejada para a versão atual, mas ainda não iniciada ou concluída.
*   📝 **Planejado (Extra):** Funcionalidade considerada para a Versão de Teste/futuras melhorias.

---

## I. Versão Estável

O objetivo desta versão é fornecer um sistema central robusto e confiável com as funcionalidades essenciais, conforme listado abaixo.

### 1. Cadastro de Cliente e Processo

*   ✅ **ID único do cliente:** Implementado (gerado automaticamente pelo banco de dados).
*   ✅ **Nome completo / Razão social (Cliente):** Implementado (campo `name` no modelo `ClientDB`).
*   ⏳ **Área de atuação (selecionável entre as listadas) (Cliente):** Parcialmente implementado. Atualmente é um campo de texto livre (`area_of_expertise`). A funcionalidade de ser "selecionável entre as listadas" requer desenvolvimento adicional para gerenciar as opções e mudar o tipo de campo no frontend/backend.
*   ✅ **Número do processo:** Implementado (campo `process_number` no modelo `LegalProcessDB`, com constraint `unique`).
*   ✅ **Advogado responsável (selecionar de lista cadastrada) (Processo):** Implementado (campo `lawyer_id` no modelo `LegalProcessDB`, associado a `LawyerDB`; frontend `index.html` e `dashboard.html` populam select).
*   ✅ **Data de entrada do processo:** Implementado (campo `entry_date` no modelo `LegalProcessDB`).
*   ✅ **Prazo para entrega (Processo):** Implementado (campo `delivery_deadline` no modelo `LegalProcessDB`).
*   ✅ **Prazo fatal (Processo):** Implementado (campo `fatal_deadline` no modelo `LegalProcessDB`).
*   ✅ **Cliente associado ao processo (selecionar de lista cadastrada):** Implementado (campo `client_id` no modelo `LegalProcessDB`, associado a `ClientDB`; frontend `index.html` e `dashboard.html` populam select). (Inferido da necessidade de associar processo a cliente).
*   ✅ **CRUD para Clientes:** Implementado (API e interface de gerenciamento de dados).
*   ✅ **CRUD para Processos:** Implementado (API e interface de gerenciamento de dados, incluindo exclusão em massa).

### 2. Cadastro de Advogados

*   O sistema deve permitir cadastro de novos advogados, com os seguintes dados:
    *   ✅ **Nome completo:** Implementado (campo `name` no modelo `LawyerDB`).
    *   ✅ **Número da OAB:** Implementado (campo `oab` no modelo `LawyerDB`, com constraint `unique`).
    *   ✅ **E-mail:** Implementado (campo `email` no modelo `LawyerDB`, com constraint `unique`).
    *   ✅ **ID do Telegram (para notificações):** Implementado (campo `telegram_id`, opcional, no modelo `LawyerDB`).
*   ✅ **Edição dos dados (ex: troca de e-mail, alteração de Telegram ID):** Implementado (API e interface de gerenciamento de dados).
*   ✅ **Exclusão de advogados, com verificação se estão vinculados a processos (evitar exclusão direta se houver vínculos):** Implementado (API e interface de gerenciamento de dados com feedback).
*   ✅ **Consulta de advogados via listagem com filtros por nome, OAB:** Implementado (API `GET /lawyers/` com filtros por nome e OAB; interface de gerenciamento de dados lista todos; Painel Home não possui filtro específico de advogados para visualização geral ainda, mas a API suporta). (Considerando "etc." como os filtros já implementados).

### 3. Painel Home / Resumo Gerencial

*   ✅ **Lista de processos com status (ativos, concluídos, vencidos):** Implementado no `dashboard.html` (tabela de processos exibe status; filtros permitem selecionar por status).
*   ✅ **Gráficos de acompanhamento (por tipo de ação, por advogado, por status):** Implementado no `dashboard.html` (gráficos Chart.js para estas três dimensões, baseados nos dados totais).
*   ✅ **Alertas de prazos próximos (até 7 dias):** Implementado no `dashboard.html` (seção "Alertas de Prazos Importantes").
*   ✅ **Busca e filtros por cliente, tipo de ação, advogado, prazo:** Parcialmente implementado.
    *   ✅ Filtros por cliente, advogado, status (e tipo de ação implicitamente via dados para gráfico) estão disponíveis no `dashboard.html` para a tabela de processos.
    *   ⏳ Filtro por intervalo de "prazo" específico na tabela não está implementado.

### 4. Integração com Telegram

*   ⏳ **Notificações diárias com prazos do dia:** Pendente.
*   ⏳ **Notificação antecipada (ex: 5 dias antes do prazo fatal):** Pendente.
*   ⏳ **Possibilidade de envio automático de movimentações de processo (mock, simulação ou integração real com IA se possível):** Pendente.

### 5. Automação com IA (mínimo viável)

*   ⏳ **Proposta: usar IA para prever possíveis atrasos com base em histórico de prazos (simples modelo estatístico ou análise básica); Ou: Geração de resumo automático do tipo de ação com base no nome (classificação ou agrupamento):** Pendente (escolha da abordagem e implementação).

---

## II. Versão de Teste (Funcionalidades Extras Planejadas)

Esta versão incluirá todas as funcionalidades da Versão Estável, mais os seguintes recursos que agregam valor e podem ser usados para demonstração ou como base para futuras evoluções.

*   📝 **Sistema de Autenticação e Níveis de Acesso:**
    *   Login para usuários (advogados, administradores, etc.).
    *   Diferentes perfis de acesso com permissões distintas para visualizar ou modificar dados e acessar funcionalidades.
*   📝 **Upload de Documentos:**
    *   Funcionalidade para anexar arquivos (documentos, petições, etc.) a processos jurídicos específicos.
*   📝 **Exportação de Relatórios:**
    *   Capacidade de exportar dados e relatórios (ex: lista de processos filtrada, dados de gráficos) em formatos como CSV, Excel ou PDF.
*   📝 **Integração com Agendas Externas:**
    *   Sincronização de prazos de processos com agendas como Google Calendar ou Microsoft Outlook.
*   📝 **Funcionalidades de IA Expandidas (Além da Obrigatória):**
    *   Implementação da segunda opção de IA não escolhida para a versão estável.
    *   Exploração de outras funcionalidades de IA, como jurimetria básica, análise de sentimentos em descrições de processos, ou sugestão de jurisprudência (mais complexo).
*   📝 **Melhorias Avançadas de UI/UX no Painel Home:**
    *   Atualização dinâmica dos gráficos com base nos filtros da tabela de processos.
    *   Paginação para a tabela de processos.
    *   Funcionalidades de ordenação na tabela de processos.
    *   Interface de edição/visualização de detalhes de um processo diretamente do painel.

---
Este documento será atualizado conforme o progresso do projeto.
