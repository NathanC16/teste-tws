# Planejamento de Funcionalidades do Projeto

Este documento detalha as funcionalidades implementadas, pendentes para a Versão Estável, e as funcionalidades extras planejadas para a Versão de Teste do sistema de Cadastro e Monitoramento de Processos Jurídicos.

## Legenda de Status (Sugerida)
*   ✅ **Implementado:** Funcionalidade concluída e integrada.
*   ⏳ **Pendente:** Funcionalidade planejada para a versão atual, mas ainda não iniciada ou concluída.
*   📝 **Planejado (Extra):** Funcionalidade considerada para a Versão de Teste/futuras melhorias.

---

## I. Versão Estável

O objetivo desta versão é fornecer um sistema central robusto e confiável com as funcionalidades essenciais.

### A. Funcionalidades Implementadas na Versão Estável

*   ✅ **Backend API (FastAPI):**
    *   Endpoints CRUD completos para Advogados, Clientes e Processos Jurídicos.
    *   Validações de dados de entrada (Pydantic).
    *   Lógica de negócios básica (ex: impedir exclusão de advogados/clientes com processos ativos).
    *   Filtros para listagem de advogados e processos.
*   ✅ **Banco de Dados (MySQL com PyMySQL):**
    *   Configuração para uso do MySQL como banco de dados padrão.
    *   Modelos de dados SQLAlchemy (`LawyerDB`, `ClientDB`, `LegalProcessDB`) com relacionamentos e tipos de dados definidos (incluindo comprimento para `VARCHAR`).
    *   Criação automática de tabelas.
*   ✅ **Frontend - Interface de Gerenciamento de Dados (`index.html`):**
    *   Interface para operações CRUD diretas em Advogados, Clientes e Processos.
    *   Layout modernizado com Bootstrap e Font Awesome.
    *   Funcionalidade de exclusão em massa para processos.
    *   Tratamento de erros da API com mensagens (algumas personalizadas).
*   ✅ **Frontend - Painel Home/Dashboard (`dashboard.html`):**
    *   Estrutura inicial com Bootstrap e Chart.js.
    *   Exibição de cards de resumo (Processos Ativos, Prazos Próximos, Total Advogados, Total Clientes).
    *   Tabela de listagem de processos com dados da API.
    *   Filtros funcionais para a tabela de processos (por status, advogado, cliente).
    *   Gráficos dinâmicos (Processos por Status, por Advogado, por Tipo de Ação) baseados nos dados totais.
    *   Seção de Alertas de Prazos (processos com prazo fatal nos próximos 7 dias).
*   ✅ **Navegação Global:**
    *   Barra de navegação consistente (Bootstrap) em `index.html` e `dashboard.html` permitindo alternar entre as duas interfaces.
*   ✅ **Geração de Dados Sintéticos:**
    *   Script `seed_db.py` utilizando Faker para popular o banco de dados com dados de teste.
*   ✅ **Documentação Inicial:**
    *   `README.md` com instruções de configuração, execução, tecnologias, etc.
    *   `DESCRICAO_PROJETO.md` com o escopo geral do projeto.
    *   `COMMITS_A_TRADUZIR.md` para referência de histórico.

### B. Funcionalidades Pendentes para a Versão Estável

*   ⏳ **Integração com Telegram (Notificações Essenciais):**
    *   Configuração do Bot do Telegram.
    *   Armazenamento seguro do Token do Bot.
    *   Desenvolvimento da lógica no backend para:
        *   Enviar notificações diárias sobre prazos do dia.
        *   Enviar notificações antecipadas (ex: 5 dias antes de um prazo fatal).
*   ⏳ **Automação Mínima com Inteligência Artificial (IA) - Uma Funcionalidade Obrigatória:**
    *   Escolha definitiva e implementação de *uma* das opções:
        *   Opção A: Modelo simples para prever possíveis atrasos em processos.
        *   Opção B: Ferramenta que gera um resumo automático ou classifica o tipo de ação com base no nome/descrição do processo.
    *   Integração da funcionalidade de IA escolhida ao backend e, se aplicável, ao frontend.
*   ⏳ **Testes Automatizados:**
    *   **Backend:** Implementação de testes unitários e de integração para os endpoints da API e lógica de negócios (ex: usando `pytest` e `TestClient` do FastAPI).
    *   **(Opcional, mas recomendado) Frontend:** Testes básicos para as interações mais críticas das interfaces.
*   ⏳ **Documentação e Planejamento de Deployment:**
    *   Detalhar o processo de deployment da aplicação em um ambiente de produção.
    *   Considerar configurações de servidor web (Nginx), gerenciamento de processos (Gunicorn), segurança do banco de dados em produção, HTTPS.
*   **(Opcional/Refinamento) Melhoria no Feedback ao Usuário no `index.html`:**
    *   Substituir os `alert()`s JavaScript por componentes de alerta/toast do Bootstrap para uma experiência de usuário mais integrada e moderna.

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
