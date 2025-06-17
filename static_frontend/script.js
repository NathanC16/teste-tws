const API_BASE_URL = ''; // Usaremos caminhos relativos para a API, ex: /lawyers

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
        lawyersListDiv.innerHTML = ''; // Limpar lista antiga
        const ul = document.createElement('ul');
        ul.className = 'item-list';
        lawyers.forEach(lawyer => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${lawyer.name} (OAB: ${lawyer.oab}, Email: ${lawyer.email}, Telegram: ${lawyer.telegram_id || 'N/A'})</span>
                <span class="item-actions">
                    <button onclick="editLawyer(${lawyer.id}, '${lawyer.name}', '${lawyer.oab}', '${lawyer.email}', '${lawyer.telegram_id || ''}')">Editar</button>
                    <button class="delete-btn" onclick="deleteLawyer(${lawyer.id})">Excluir</button>
                </span>
            `;
            ul.appendChild(li);
        });
        lawyersListDiv.appendChild(ul);
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
        alert(`Erro ao excluir advogado: ${error.message}`);
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
        const ul = document.createElement('ul');
        ul.className = 'item-list';
        clients.forEach(client => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${client.name} (Área: ${client.area_of_expertise})</span>
                <span class="item-actions">
                    <button onclick="editClient(${client.id}, '${client.name}', '${client.area_of_expertise}')">Editar</button>
                    <button class="delete-btn" onclick="deleteClient(${client.id})">Excluir</button>
                </span>
            `;
            ul.appendChild(li);
        });
        clientsListDiv.appendChild(ul);
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
        alert(`Erro ao excluir cliente: ${error.message}`);
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
        const ul = document.createElement('ul');
        ul.className = 'item-list';

        // Para exibir nomes em vez de IDs
        const lawyerMap = allLawyers.reduce((map, lawyer) => { map[lawyer.id] = lawyer.name; return map; }, {});
        const clientMap = allClients.reduce((map, client) => { map[client.id] = client.name; return map; }, {});

        processes.forEach(process => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>Nº: ${process.process_number} (Adv: ${lawyerMap[process.lawyer_id] || 'N/A'}, Cli: ${clientMap[process.client_id] || 'N/A'})</span>
                <span>Status: ${process.status}, Prazo Fatal: ${process.fatal_deadline}</span>
                <span class="item-actions">
                    <button onclick="editProcess(
                        ${process.id},
                        '${process.process_number}',
                        ${process.lawyer_id},
                        ${process.client_id},
                        '${process.entry_date}',
                        '${process.delivery_deadline}',
                        '${process.fatal_deadline}',
                        '${process.status}',
                        '${process.action_type || ''}'
                    )">Editar</button>
                    <button class="delete-btn" onclick="deleteProcess(${process.id})">Excluir</button>
                </span>
            `;
            ul.appendChild(li);
        });
        processesListDiv.appendChild(ul);
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

// Inicializar: Buscar dados ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    // Populando selects primeiro é importante para que a lista de processos possa mostrar nomes
    await populateLawyerOptions();
    await populateClientOptions();

    fetchLawyers(); // Busca e exibe a lista de advogados
    fetchClients(); // Busca e exibe a lista de clientes
    fetchProcesses(); // Busca e exibe a lista de processos
});
