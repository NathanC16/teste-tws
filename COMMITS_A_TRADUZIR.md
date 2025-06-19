# Lista de Commits com Elementos a Traduzir para Português

Este arquivo lista os commits recentes cujos prefixos de tipo de commit e/ou nomes de branch foram originalmente em inglês. As mensagens de corpo dos commits, em sua maioria, já estavam em português. Esta lista serve como referência.

**Nota:** Alterar o histórico de commits que já foram enviados para um repositório compartilhado (push) é geralmente desaconselhado e deve ser feito com extremo cuidado, especialmente em branches colaborativas. Esta lista é fornecida primariamente para fins de registro e se uma reescrita local do histórico for considerada antes de um novo push para um branch pessoal ou antes de um merge controlado.

---

1.  **Commit: Adição do Painel Home**
    *   **Branch Original:** `feat/dashboard-home-panel`
        *   **Tradução Sugerida do Branch:** `funcionalidade/painel-home-dashboard`
    *   **Prefixo Original da Mensagem:** `feat:`
        *   **Tradução Sugerida do Prefixo:** `funcionalidade:`
    *   **Corpo da Mensagem:** (Já em português) "Implementa Painel Home com resumos, filtros e gráficos..."

2.  **Commit: Correção da Formatação de Data**
    *   **Branch Original:** `fix/date-formatting-pt-br`
        *   **Tradução Sugerida do Branch:** `correcao/formatacao-data-pt-br`
    *   **Prefixo Original da Mensagem:** `fix:`
        *   **Tradução Sugerida do Prefixo:** `corrige:`
    *   **Corpo da Mensagem:** (Já em português) "Corrige formatação de data para padrão brasileiro (DD/MM/AAAA)..."

3.  **Commit: Correção dos Botões de Editar/Excluir com Delegação de Eventos**
    *   **Branch Original:** `fix/event-delegation-crud-buttons`
        *   **Tradução Sugerida do Branch:** `correcao/delegacao-eventos-botoes-crud`
    *   **Prefixo Original da Mensagem:** `fix:`
        *   **Tradução Sugerida do Prefixo:** `corrige:`
    *   **Corpo da Mensagem:** (Já em português) "Corrige botões de editar/excluir com delegação de eventos..."

4.  **Commit: Adição de Logs de Depuração (posteriormente removidos)**
    *   **Branch Original:** `debug/delete-button-logging`
        *   **Tradução Sugerida do Branch:** `depuracao/logs-botao-excluir`
    *   **Prefixo Original da Mensagem:** `debug:`
        *   **Tradução Sugerida do Prefixo:** `depuracao:`
    *   **Corpo da Mensagem:** (Já em português) "Adiciona console.log para depurar botões de exclusão..."

5.  **Commit: Nota sobre Teste em Firefox e Remoção de Logs**
    *   **Branch Original:** `docs/firefox-testing-note-and-cleanup`
        *   **Tradução Sugerida do Branch:** `docs/nota-teste-firefox-e-limpeza`
    *   **Prefixo Original da Mensagem:** `docs:`
        *   **Tradução Sugerida do Prefixo:** `docs:` (ou `documentacao:`)
    *   **Corpo da Mensagem:** (Já em português) "Adiciona nota sobre teste em Firefox e remove logs de depuração..."

6.  **Commit: Melhoria da Mensagem de Erro de Exclusão (Advogados/Clientes)**
    *   **Branch Original:** `fix/friendly-delete-error-messages`
        *   **Tradução Sugerida do Branch:** `correcao/mensagens-erro-exclusao-amigaveis`
    *   **Prefixo Original da Mensagem:** `fix:`
        *   **Tradução Sugerida do Prefixo:** `corrige:`
    *   **Corpo da Mensagem:** (Já em português) "Melhora mensagens de erro ao excluir advogados/clientes com dependências..."

7.  **Commit: Adição do Script de Seeding de Dados Sintéticos**
    *   **Branch Original:** `feat/dados-sinteticos-seeding` (Este já estava em português)
        *   **Tradução Sugerida do Branch:** (Manter, ou `funcionalidade/dados-sinteticos-seeding` se o prefixo for traduzido)
    *   **Prefixo Original da Mensagem:** `feat:` (Este já estava em português na mensagem de commit, mas o nome do branch usou "feat")
        *   **Tradução Sugerida do Prefixo:** `funcionalidade:`
    *   **Corpo da Mensagem:** (Já em português) "Adiciona script para geração de dados sintéticos (seeding)..."
        *Nota: O commit para este foi `feat: Adiciona script para geração de dados sintéticos (seeding)`. O nome do branch foi `feat/dados-sinteticos-seeding`. A sugestão é alinhar o prefixo na mensagem se for traduzir o conceito.*

---
A partir do commit referente à tradução das mensagens de erro (item 6 desta lista), os nomes de branch e prefixos de commit passaram a ser consistentemente em português.
