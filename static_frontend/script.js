const API_BASE_URL = ''; // Usaremos caminhos relativos para a API, ex: /lawyers

// --- Funções Utilitárias ---
function formatDate(dateString) {
    if (!dateString) return 'N/A'; // Retorna N/A se a string de data for nula ou vazia

    // As datas da API vêm como YYYY-MM-DD.
    // new Date('YYYY-MM-DD') trata a string como UTC.
    // Para evitar problemas de fuso horário que mostram o dia anterior,
    // parseamos os componentes e criamos a data como local.
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Mês em JavaScript é 0-indexado (0-11)
        const day = parseInt(parts[2], 10);

        // Cria o objeto Date usando os componentes, interpretados como data local
        const date = new Date(year, month, day);

        // Formata para o padrão pt-BR (DD/MM/YYYY)
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } else {
        // Se a string de data não estiver no formato esperado, retorna um aviso e tenta uma conversão direta.
        console.warn(`Formato de data inesperado: ${dateString}. Tentando conversão direta.`);
        const date = new Date(dateString); // Tentativa de fallback
        // Verifica se a data é válida após a tentativa de fallback
        if (isNaN(date.getTime())) {
            return 'Data Inválida';
        }
        return date.toLocaleDateString('pt-BR'); // Formatação padrão se o fallback funcionar
    }
}
// --- Fim Funções Utilitárias ---

// Elementos do DOM para Advogados
const lawyerForm = document.getElementById('lawyer-form');
const lawyerIdInput = document.getElementById('lawyer-id');
const lawyerNameInput = document.getElementById('lawyer-name');
const lawyerOabInput = document.getElementById('lawyer-oab');
const lawyerEmailInput = document.getElementById('lawyer-email');
const lawyerTelegramInput = document.getElementById('lawyer-telegram');
const lawyersListDiv = document.getElementById('lawyers-list');
const cancelLawyerUpdateBtn = document.getElementById('cancel-lawyer-update');

// --- Funções para Advogados ---

// Listar Advogados
async function fetchLawyers() {
    try {
        const response = await fetch(`${API_BASE_URL}/lawyers/`);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const lawyers = await response.json();
        lawyersListDiv.innerHTML = ''; // Limpar lista antiga (a div pai já é o list-group)
        lawyers.forEach(lawyer => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';

            const escapedName = lawyer.name.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedOab = lawyer.oab.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedEmail = lawyer.email.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedTelegramId = (lawyer.telegram_id || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;");

            li.innerHTML = `
                <div class="flex-grow-1"> <!-- Ocupa espaço, empurrando botões para a direita -->
                    <strong>${lawyer.name}</strong><br>
                    <small>OAB: ${lawyer.oab} | Email: ${lawyer.email} | Telegram: ${lawyer.telegram_id || 'N/A'}</small>
                </div>
                <div class="item-actions ms-3"> <!-- ms-3 para margem à esquerda dos botões -->
                    <button class="btn btn-sm btn-outline-primary btn-edit-lawyer"
                            data-id="${lawyer.id}"
                            data-name="${escapedName}"
                            data-oab="${escapedOab}"
                            data-email="${escapedEmail}"
                            data-telegram="${escapedTelegramId}">Editar</button>
                    <button class="btn btn-sm btn-outline-danger btn-delete-lawyer delete-btn"
                            data-id="${lawyer.id}">Excluir</button>
                </div>
            `;
            lawyersListDiv.appendChild(li);
        });
    } catch (error) {
        console.error('Falha ao buscar advogados:', error);
        lawyersListDiv.innerHTML = '<p>Erro ao carregar advogados.</p>';
    }
}

// Adicionar ou Atualizar Advogado
lawyerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = lawyerIdInput.value;
    const lawyerData = {
        name: lawyerNameInput.value,
        oab: lawyerOabInput.value,
        email: lawyerEmailInput.value,
        telegram_id: lawyerTelegramInput.value || null,
    };

    try {
        let response;
        if (id) { // Atualizar
            response = await fetch(`${API_BASE_URL}/lawyers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lawyerData),
            });
        } else { // Criar
            response = await fetch(`${API_BASE_URL}/lawyers/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lawyerData),
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro HTTP: ${response.status} - ${errorData.detail || 'Erro desconhecido'}`);
        }

        lawyerForm.reset();
        lawyerIdInput.value = '';
        cancelLawyerUpdateBtn.style.display = 'none';
        fetchLawyers(); // Atualizar lista
        alert(`Advogado ${id ? 'atualizado' : 'adicionado'} com sucesso!`);
    } catch (error) {
        console.error(`Falha ao salvar advogado:`, error);
        alert(`Erro ao salvar advogado: ${error.message}`);
    }
});

// Preencher formulário para Editar Advogado
function editLawyer(id, name, oab, email, telegram_id) {
    lawyerIdInput.value = id;
    lawyerNameInput.value = name;
    lawyerOabInput.value = oab;
    lawyerEmailInput.value = email;
    lawyerTelegramInput.value = telegram_id;
    cancelLawyerUpdateBtn.style.display = 'inline-block';
    lawyerNameInput.focus();
}

// Cancelar Atualização de Advogado
cancelLawyerUpdateBtn.addEventListener('click', () => {
    lawyerForm.reset();
    lawyerIdInput.value = '';
    cancelLawyerUpdateBtn.style.display = 'none';
});

// Deletar Advogado
async function deleteLawyer(id) {
    if (!confirm('Tem certeza que deseja excluir este advogado?')) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/lawyers/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro HTTP: ${response.status} - ${errorData.detail || 'Erro desconhecido'}`);
        }
        fetchLawyers(); // Atualizar lista
        alert('Advogado excluído com sucesso!');
    } catch (error) {
        console.error('Falha ao excluir advogado:', error);
        if (error.message && error.message.includes('Lawyer cannot be deleted as they are associated with one or more legal processes')) {
            alert(`Advogado não pode ser excluído, pois está associado a um ou mais processos. Detalhes: ${error.message}`);
        } else {
            alert(`Erro ao excluir advogado: ${error.message}`);
        }
    }
}

// --- Fim das Funções para Advogados ---

// Elementos do DOM para Clientes
const clientForm = document.getElementById('client-form');
const clientIdInput = document.getElementById('client-id');
const clientNameInput = document.getElementById('client-name');
const clientAreaInput = document.getElementById('client-area');
const clientsListDiv = document.getElementById('clients-list');
const cancelClientUpdateBtn = document.getElementById('cancel-client-update');

// --- Funções para Clientes ---

// Listar Clientes
async function fetchClients() {
    try {
        const response = await fetch(`${API_BASE_URL}/clients/`);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const clients = await response.json();
        clientsListDiv.innerHTML = ''; // Limpar lista antiga
        clients.forEach(client => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';

            const escapedClientName = client.name.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedArea = client.area_of_expertise.replace(/'/g, "&apos;").replace(/"/g, "&quot;");

            li.innerHTML = `
                <div class="flex-grow-1">
                    <strong>${client.name}</strong><br>
                    <small>Área: ${client.area_of_expertise}</small>
                </div>
                <div class="item-actions ms-3">
                    <button class="btn btn-sm btn-outline-primary btn-edit-client"
                            data-id="${client.id}"
                            data-name="${escapedClientName}"
                            data-area="${escapedArea}">Editar</button>
                    <button class="btn btn-sm btn-outline-danger btn-delete-client delete-btn"
                            data-id="${client.id}">Excluir</button>
                </div>
            `;
            clientsListDiv.appendChild(li);
        });
    } catch (error) {
        console.error('Falha ao buscar clientes:', error);
        clientsListDiv.innerHTML = '<p>Erro ao carregar clientes.</p>';
    }
}

// Adicionar ou Atualizar Cliente
clientForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = clientIdInput.value;
    const clientData = {
        name: clientNameInput.value,
        area_of_expertise: clientAreaInput.value,
    };

    try {
        let response;
        if (id) { // Atualizar
            response = await fetch(`${API_BASE_URL}/clients/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData),
            });
        } else { // Criar
            response = await fetch(`${API_BASE_URL}/clients/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData),
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro HTTP: ${response.status} - ${errorData.detail || 'Erro desconhecido'}`);
        }

        clientForm.reset();
        clientIdInput.value = '';
        cancelClientUpdateBtn.style.display = 'none';
        fetchClients(); // Atualizar lista
        alert(`Cliente ${id ? 'atualizado' : 'adicionado'} com sucesso!`);
    } catch (error) {
        console.error(`Falha ao salvar cliente:`, error);
        alert(`Erro ao salvar cliente: ${error.message}`);
    }
});

// Preencher formulário para Editar Cliente
function editClient(id, name, area) {
    clientIdInput.value = id;
    clientNameInput.value = name;
    clientAreaInput.value = area;
    cancelClientUpdateBtn.style.display = 'inline-block';
    clientNameInput.focus();
}

// Cancelar Atualização de Cliente
cancelClientUpdateBtn.addEventListener('click', () => {
    clientForm.reset();
    clientIdInput.value = '';
    cancelClientUpdateBtn.style.display = 'none';
});

// Deletar Cliente
async function deleteClient(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro HTTP: ${response.status} - ${errorData.detail || 'Erro desconhecido'}`);
        }
        fetchClients(); // Atualizar lista
        alert('Cliente excluído com sucesso!');
    } catch (error) {
        console.error('Falha ao excluir cliente:', error);
        if (error.message && error.message.includes('Client cannot be deleted as they are associated with one or more legal processes')) {
            alert(`Cliente não pode ser excluído, pois está associado a um ou mais processos. Detalhes: ${error.message}`);
        } else {
            alert(`Erro ao excluir cliente: ${error.message}`);
        }
    }
}

// --- Fim das Funções para Clientes ---

// Elementos do DOM para Processos
const processForm = document.getElementById('process-form');
const processIdInput = document.getElementById('process-id');
const processNumberInput = document.getElementById('process-number');
const processLawyerSelect = document.getElementById('process-lawyer');
const processClientSelect = document.getElementById('process-client');
const processEntryDateInput = document.getElementById('process-entry-date');
const processDeliveryDeadlineInput = document.getElementById('process-delivery-deadline');
const processFatalDeadlineInput = document.getElementById('process-fatal-deadline');
const processStatusInput = document.getElementById('process-status');
const processActionTypeInput = document.getElementById('process-action-type');
const processesListDiv = document.getElementById('processes-list');
const cancelProcessUpdateBtn = document.getElementById('cancel-process-update');
    const deleteSelectedProcessesBtn = document.getElementById('delete-selected-processes-btn'); // <-- Adicionar esta linha

let allLawyers = []; // Para armazenar advogados para o select
let allClients = []; // Para armazenar clientes para o select

// --- Funções para Processos Jurídicos ---

// Popular Select de Advogados
async function populateLawyerOptions() {
    try {
        const response = await fetch(`${API_BASE_URL}/lawyers/`);
        allLawyers = await response.json();
        processLawyerSelect.innerHTML = '<option value="">Selecione um Advogado</option>'; // Opção padrão
        allLawyers.forEach(lawyer => {
            const option = document.createElement('option');
            option.value = lawyer.id;
            option.textContent = lawyer.name;
            processLawyerSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Falha ao buscar advogados para o select:', error);
    }
}

// Popular Select de Clientes
async function populateClientOptions() {
    try {
        const response = await fetch(`${API_BASE_URL}/clients/`);
        allClients = await response.json();
        processClientSelect.innerHTML = '<option value="">Selecione um Cliente</option>'; // Opção padrão
        allClients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            processClientSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Falha ao buscar clientes para o select:', error);
    }
}


// Listar Processos
async function fetchProcesses() {
    try {
        const response = await fetch(`${API_BASE_URL}/processes/`);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const processes = await response.json();
        processesListDiv.innerHTML = ''; // Limpar lista antiga

        // Para exibir nomes em vez de IDs
        const lawyerMap = allLawyers.reduce((map, lawyer) => { map[lawyer.id] = lawyer.name; return map; }, {});
        const clientMap = allClients.reduce((map, client) => { map[client.id] = client.name; return map; }, {});

        processes.forEach(process => {
            const li = document.createElement('li');
            // Escape quotes for data attributes
            const escapedProcessNumber = process.process_number.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedStatus = process.status.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedActionType = (process.action_type || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;");

            // A classe list-group-item já tem display:flex por padrão se for um flex container,
            // mas para garantir o alinhamento vertical da checkbox com o texto, podemos manter.
            li.className = 'list-group-item d-flex align-items-center';

            li.innerHTML = `
                <input type="checkbox" class="process-checkbox me-2" data-id="${process.id}" style="flex-shrink: 0;">
                <div class="flex-grow-1">
                    <strong>Nº: ${process.process_number}</strong> (Adv: ${lawyerMap[process.lawyer_id] || 'N/A'}, Cli: ${clientMap[process.client_id] || 'N/A'})<br>
                    <small>Status: ${process.status} | Prazo Fatal: ${formatDate(process.fatal_deadline)} | Tipo: ${process.action_type || 'N/A'}</small>
                </div>
                <div class="item-actions ms-3" style="flex-shrink: 0;">
                    <button class="btn btn-sm btn-outline-primary btn-edit-process"
                            data-id="${process.id}"
                            data-number="${escapedProcessNumber}"
                            data-lawyerid="${process.lawyer_id}"
                            data-clientid="${process.client_id}"
                            data-entrydate="${process.entry_date}"
                            data-deliverydeadline="${process.delivery_deadline}"
                            data-fataldeadline="${process.fatal_deadline}"
                            data-status="${escapedStatus}"
                            data-actiontype="${escapedActionType}">Editar</button>
                    <button class="btn btn-sm btn-outline-danger btn-delete-process delete-btn"
                            data-id="${process.id}">Excluir</button>
                </div>
            `;
            processesListDiv.appendChild(li);
        });
    } catch (error) {
        console.error('Falha ao buscar processos:', error);
        processesListDiv.innerHTML = '<p>Erro ao carregar processos. Certifique-se que advogados e clientes foram carregados primeiro.</p>';
    }
}

// Adicionar ou Atualizar Processo
processForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = processIdInput.value;
    const processData = {
        process_number: processNumberInput.value,
        lawyer_id: parseInt(processLawyerSelect.value),
        client_id: parseInt(processClientSelect.value),
        entry_date: processEntryDateInput.value,
        delivery_deadline: processDeliveryDeadlineInput.value,
        fatal_deadline: processFatalDeadlineInput.value,
        status: processStatusInput.value,
        action_type: processActionTypeInput.value || null,
    };

    if (!processData.lawyer_id || !processData.client_id) {
        alert("Por favor, selecione um advogado e um cliente.");
        return;
    }

    try {
        let response;
        if (id) { // Atualizar
            response = await fetch(`${API_BASE_URL}/processes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(processData),
            });
        } else { // Criar
            response = await fetch(`${API_BASE_URL}/processes/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(processData),
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro HTTP: ${response.status} - ${errorData.detail || 'Erro desconhecido'}`);
        }

        processForm.reset();
        processIdInput.value = '';
        cancelProcessUpdateBtn.style.display = 'none';
        fetchProcesses(); // Atualizar lista
        alert(`Processo ${id ? 'atualizado' : 'adicionado'} com sucesso!`);
    } catch (error) {
        console.error(`Falha ao salvar processo:`, error);
        alert(`Erro ao salvar processo: ${error.message}`);
    }
});

// Preencher formulário para Editar Processo
function editProcess(id, number, lawyerId, clientId, entryDate, deliveryDeadline, fatalDeadline, status, actionType) {
    processIdInput.value = id;
    processNumberInput.value = number;
    processLawyerSelect.value = lawyerId;
    processClientSelect.value = clientId;
    processEntryDateInput.value = entryDate;
    processDeliveryDeadlineInput.value = deliveryDeadline;
    processFatalDeadlineInput.value = fatalDeadline;
    processStatusInput.value = status;
    processActionTypeInput.value = actionType;
    cancelProcessUpdateBtn.style.display = 'inline-block';
    processNumberInput.focus();
}

// Cancelar Atualização de Processo
cancelProcessUpdateBtn.addEventListener('click', () => {
    processForm.reset();
    processIdInput.value = '';
    cancelProcessUpdateBtn.style.display = 'none';
});

// Deletar Processo
async function deleteProcess(id) {
    if (!confirm('Tem certeza que deseja excluir este processo?')) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/processes/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro HTTP: ${response.status} - ${errorData.detail || 'Erro desconhecido'}`);
        }
        fetchProcesses(); // Atualizar lista
        alert('Processo excluído com sucesso!');
    } catch (error) {
        console.error('Falha ao excluir processo:', error);
        alert(`Erro ao excluir processo: ${error.message}`);
    }
}

// --- Fim das Funções para Processos Jurídicos ---

async function handleDeleteSelectedProcesses() {
    const selectedCheckboxes = document.querySelectorAll('.process-checkbox:checked');

    if (selectedCheckboxes.length === 0) {
        alert('Nenhum processo selecionado para exclusão.');
        return;
    }

    const processIdsToDelete = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);

    if (!confirm(`Tem certeza que deseja excluir ${processIdsToDelete.length} processo(s) selecionado(s)?`)) {
        return;
    }

    // Mostra um feedback de carregamento (opcional, mas bom para UX)
    // Poderia ser um spinner ou desabilitar o botão
    console.log(`Iniciando exclusão de ${processIdsToDelete.length} processos...`);
    // deleteSelectedProcessesBtn.disabled = true; // Exemplo de desabilitar botão

    const deletePromises = processIdsToDelete.map(id => {
        return fetch(`${API_BASE_URL}/processes/${id}`, {
            method: 'DELETE',
        })
        .then(response => {
            if (!response.ok) {
                // Tenta pegar o detalhe do erro do backend
                return response.json().then(errorData => {
                    return { id: id, success: false, status: response.status, detail: errorData.detail || `Erro HTTP ${response.status}` };
                }).catch(() => {
                    // Se o corpo não for JSON ou estiver vazio
                    return { id: id, success: false, status: response.status, detail: `Erro HTTP ${response.status}` };
                });
            }
            return { id: id, success: true, status: response.status };
        })
        .catch(error => {
            console.error(`Erro de rede ou fetch ao excluir processo ID ${id}:`, error);
            return { id: id, success: false, status: 'NetworkError', detail: error.message };
        });
    });

    const results = await Promise.allSettled(deletePromises);

    let successCount = 0;
    let failureCount = 0;
    const errorMessages = [];

    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
        } else if (result.status === 'fulfilled' && !result.value.success) {
            failureCount++;
            errorMessages.push(`Falha ao excluir Processo ID ${result.value.id}: ${result.value.detail} (Status: ${result.value.status})`);
        } else if (result.status === 'rejected') { // Erro na promise em si, não na requisição HTTP
            failureCount++;
            // O 'result.reason' pode não ter a estrutura que esperamos, então tratamos com cuidado
            const id = result.reason && result.reason.id ? result.reason.id : 'Desconhecido';
            const detail = result.reason && result.reason.detail ? result.reason.detail : result.reason;
            errorMessages.push(`Erro crítico ao tentar excluir Processo ID ${id}: ${detail}`);
        }
    });

    let finalMessage = '';
    if (successCount > 0) {
        finalMessage += `${successCount} processo(s) excluído(s) com sucesso.\n`;
    }
    if (failureCount > 0) {
        finalMessage += `${failureCount} processo(s) não puderam ser excluídos.\n`;
        finalMessage += "Detalhes dos erros:\n" + errorMessages.join("\n");
    }

    if (finalMessage) {
        alert(finalMessage);
    }

    // deleteSelectedProcessesBtn.disabled = false; // Reabilitar botão
    fetchProcesses(); // Atualizar a lista de processos
}

// Inicializar: Buscar dados ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    // Populando selects primeiro é importante para que a lista de processos possa mostrar nomes
    await populateLawyerOptions();
    await populateClientOptions();

    fetchLawyers(); // Busca e exibe a lista de advogados
    fetchClients(); // Busca e exibe a lista de clientes
    fetchProcesses(); // Busca e exibe a lista de processos

    // Delegação de Eventos para a lista de Advogados
    lawyersListDiv.addEventListener('click', (event) => {
        const target = event.target;

        if (target.classList.contains('btn-edit-lawyer')) {
            const id = target.dataset.id;
            const name = target.dataset.name;
            const oab = target.dataset.oab;
            const email = target.dataset.email;
            const telegram = target.dataset.telegram;
            editLawyer(id, name, oab, email, telegram);
        } else if (target.classList.contains('btn-delete-lawyer')) {
            const id = target.dataset.id;
            deleteLawyer(id);
        }
    });

    // Delegação de Eventos para a lista de Clientes
    clientsListDiv.addEventListener('click', (event) => {
        const target = event.target;

        if (target.classList.contains('btn-edit-client')) {
            const id = target.dataset.id;
            const name = target.dataset.name;
            const area = target.dataset.area;
            editClient(id, name, area);
        } else if (target.classList.contains('btn-delete-client')) {
            const id = target.dataset.id;
            deleteClient(id);
        }
    });

    // Delegação de Eventos para a lista de Processos
    processesListDiv.addEventListener('click', (event) => {
        const target = event.target;

        if (target.classList.contains('btn-edit-process')) {
            const id = target.dataset.id;
            const number = target.dataset.number;
            const lawyerId = target.dataset.lawyerid;
            const clientId = target.dataset.clientid;
            const entryDate = target.dataset.entrydate;
            const deliveryDeadline = target.dataset.deliverydeadline;
            const fatalDeadline = target.dataset.fataldeadline;
            const status = target.dataset.status;
            const actionType = target.dataset.actiontype;
            editProcess(id, number, lawyerId, clientId, entryDate, deliveryDeadline, fatalDeadline, status, actionType);
        } else if (target.classList.contains('btn-delete-process')) {
            const id = target.dataset.id;
            deleteProcess(id);
        }
    });

    if (deleteSelectedProcessesBtn) { // Adiciona verificação, pois este botão só existe no index.html
        deleteSelectedProcessesBtn.addEventListener('click', handleDeleteSelectedProcesses);
    }
});
