const API_BASE_URL = ''; // Usaremos caminhos relativos para a API, ex: /lawyers
let currentUser = null; // Holds data of the currently logged-in user

// --- Token Management & Auth Header ---
function saveToken(token) {
    localStorage.setItem('authToken', token);
}

function getToken() {
    return localStorage.getItem('authToken');
}

function removeToken() {
    localStorage.removeItem('authToken');
}

function getAuthHeaders(isFormData = false) {
    const token = getToken();
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isFormData) { // Do not set Content-Type for FormData, browser does it with boundary
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        console.error("Failed to parse JWT:", e);
        return null;
    }
}


// --- Funções Utilitárias de Feedback de Validação ---
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}-error`);
    if (field) {
        field.classList.add('is-invalid');
    }
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block'; // Bootstrap .invalid-feedback é display:none por padrão
    }
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}-error`);
    if (field) {
        field.classList.remove('is-invalid');
    }
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
}

function clearAllFormErrors(formElement) {
    const inputs = formElement.querySelectorAll('.form-control, .form-select');
    inputs.forEach(input => {
        clearFieldError(input.id);
    });
    // Limpar também erros que podem não estar associados a um .form-control (raro, mas para garantir)
    const errorMessages = formElement.querySelectorAll('.invalid-feedback');
    errorMessages.forEach(errorDiv => {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    });
}
// --- Fim Funções Utilitárias de Feedback de Validação ---


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

// --- Seletores de Seção da UI ---
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const mainContentSection = document.getElementById('main-content');
const userInfoSection = document.getElementById('user-info-section');
const lawyerManagementSection = document.getElementById('lawyers-section'); // Section for managing lawyers (admin only)

// Links para alternar entre formulários de login/registro
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');

// --- Elementos dos Formulários de Login/Registro ---
const loginForm = document.getElementById('login-form');
const loginOabInput = document.getElementById('login-oab');
const loginPasswordInput = document.getElementById('login-password');

const registerForm = document.getElementById('register-form');
const registerNameInput = document.getElementById('register-name');
const registerOabInput = document.getElementById('register-oab');
const registerEmailInput = document.getElementById('register-email');
const registerPasswordInput = document.getElementById('register-password');
const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
const registerTelegramInput = document.getElementById('register-telegram');

const userOabDisplay = document.getElementById('user-oab-display');
const logoutButton = document.getElementById('logout-button');

// Elementos do DOM para Advogados (CRUD)
const lawyerForm = document.getElementById('lawyer-form'); // Note: This ID is for the CRUD lawyer form, not registration
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
    if (!getToken()) return; // Don't fetch if not logged in
    try {
        const response = await fetch(`${API_BASE_URL}/lawyers/`, { headers: getAuthHeaders() });
        if (response.status === 401) { // Handle unauthorized access
            alert("Sessão expirada ou inválida. Faça login novamente.");
            logout(); // Call logout to clear state
            return;
        }
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
    clearAllFormErrors(lawyerForm); // Limpa erros anteriores

    const id = lawyerIdInput.value;

    // Validação do ID do Telegram
    const telegramIdValue = lawyerTelegramInput.value.trim();
    if (telegramIdValue) {
        const telegramRegex = /^@[a-zA-Z0-9_]{3,31}$/;
        if (!telegramRegex.test(telegramIdValue)) {
            showFieldError('lawyer-telegram', "ID do Telegram inválido. Deve começar com '@' seguido por 3 a 31 caracteres (letras, números ou '_'). Ex: @usuario_123");
            lawyerTelegramInput.focus();
            return;
        }
    }

    // Validação do OAB
    let oabValue = lawyerOabInput.value.trim().toUpperCase();
    const oabPatternNumUf = /^\d{1,3}(\.?\d{3})?[A-Z]{2}$/;
    const oabPatternNumBarraUf = /^\d{1,6}\/[A-Z]{2}$/;
    let isValidOab = oabPatternNumUf.test(oabValue) || oabPatternNumBarraUf.test(oabValue);

    if (!oabValue) { // Adiciona verificação de campo obrigatório
        showFieldError('lawyer-oab', "O campo OAB é obrigatório.");
        lawyerOabInput.focus();
        return;
    }
    if (!isValidOab) {
        showFieldError('lawyer-oab', "Formato da OAB inválido. Use formatos como '12345SP', '123.456SP', ou '12345/SP'.");
        lawyerOabInput.focus();
        return;
    }
    if (oabPatternNumUf.test(oabValue) && oabValue.includes('.')) {
        oabValue = oabValue.replace('.', '');
    }

    // Validação do Nome (obrigatório)
    if (!lawyerNameInput.value.trim()) {
        showFieldError('lawyer-name', "O campo Nome é obrigatório.");
        lawyerNameInput.focus();
        return;
    }
    // Validação do Email (obrigatório e formato básico)
    if (!lawyerEmailInput.value.trim()) {
        showFieldError('lawyer-email', "O campo Email é obrigatório.");
        lawyerEmailInput.focus();
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex simples para email
    if (!emailRegex.test(lawyerEmailInput.value.trim())) {
         showFieldError('lawyer-email', "Formato de email inválido.");
        lawyerEmailInput.focus();
        return;
    }


    const lawyerData = {
        name: lawyerNameInput.value.trim(), // Adiciona trim() aqui também
        oab: oabValue,
        email: lawyerEmailInput.value.trim(), // Adiciona trim()
        telegram_id: telegramIdValue || null,
    };

    try {
        let response;
        const headers = getAuthHeaders();
        if (id) { // Atualizar
            response = await fetch(`${API_BASE_URL}/lawyers/${id}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(lawyerData),
            });
        } else { // Criar
            response = await fetch(`${API_BASE_URL}/lawyers/`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(lawyerData),
            });
        }

        if (response.status === 401) {
            alert("Sessão expirada ou inválida. Faça login novamente.");
            logout(); return;
        }
        if (!response.ok) {
            const errorData = await response.json();
            // Tenta exibir o erro da API no campo mais relevante ou um erro geral no formulário
            if (errorData.detail && errorData.detail.toLowerCase().includes("oab")) {
                showFieldError('lawyer-oab', errorData.detail);
            } else if (errorData.detail && errorData.detail.toLowerCase().includes("email")) {
                showFieldError('lawyer-email', errorData.detail);
            } else {
                // Adicionar um div geral para erros de formulário se necessário, ou usar alert
                alert(`Erro ao salvar advogado: ${errorData.detail || `Erro HTTP ${response.status}`}`);
            }
            throw new Error(`Erro HTTP: ${response.status} - ${errorData.detail || 'Erro desconhecido'}`);
        }

        lawyerForm.reset();
        clearAllFormErrors(lawyerForm); // Adicionar após reset para limpar visualmente
        lawyerIdInput.value = '';
        cancelLawyerUpdateBtn.style.display = 'none';
        fetchLawyers();
        alert(`Advogado ${id ? 'atualizado' : 'adicionado'} com sucesso!`);
    } catch (error) {
        console.error(`Falha ao salvar advogado:`, error);
        // Não mostrar alert aqui se o erro já foi tratado e exibido no campo
        // Apenas se for um erro inesperado não tratado acima.
        if (!document.querySelector('#lawyer-form .is-invalid')) {
             alert(`Erro ao salvar advogado: ${error.message.replace(/^Erro HTTP: \d+ - /, '')}`);
        }
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
    clearAllFormErrors(lawyerForm); // Adicionar esta linha
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
            headers: getAuthHeaders()
        });
        if (response.status === 401) {
            alert("Sessão expirada ou inválida. Faça login novamente.");
            logout(); return;
        }
        if (!response.ok) {
            const errorData = await response.json(); // Attempt to parse error
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
// const clientAreaInput = document.getElementById('client-area'); // Alterado para select
const clientAreaOfExpertiseSelect = document.getElementById('clientAreaOfExpertiseSelect');
const clientsListDiv = document.getElementById('clients-list');
const cancelClientUpdateBtn = document.getElementById('cancel-client-update');

// --- Funções para Clientes ---

// Carregar Áreas de Atuação para o Select
async function loadAreasOfExpertise() {
    try {
        const response = await fetch(`${API_BASE_URL}/areas-of-expertise/`);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const areas = await response.json();
        clientAreaOfExpertiseSelect.innerHTML = '<option value="">Selecione uma área</option>'; // Limpar e adicionar placeholder
        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            clientAreaOfExpertiseSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Falha ao buscar áreas de atuação:', error);
        clientAreaOfExpertiseSelect.innerHTML = '<option value="">Erro ao carregar áreas</option>';
    }
}

// Listar Clientes
async function fetchClients() {
    if (!getToken()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/clients/`, { headers: getAuthHeaders() });
        if (response.status === 401) {
            alert("Sessão expirada ou inválida. Faça login novamente.");
            logout(); return;
        }
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
    clearAllFormErrors(clientForm); // Limpa erros anteriores

    const id = clientIdInput.value;

    // Validação dos campos de Cliente
    const clientNameValue = clientNameInput.value.trim();
    const clientAreaValue = clientAreaOfExpertiseSelect.value; // Alterado para select

    let hasError = false;
    if (!clientNameValue) {
        showFieldError('client-name', "O campo Nome/Razão Social é obrigatório.");
        hasError = true;
    }
    if (!clientAreaValue) { // O select terá value="" se "Selecione..." estiver marcado
        showFieldError('clientAreaOfExpertiseSelect', "O campo Área de Atuação é obrigatório."); // ID do select para erro
        hasError = true;
    }

    if (hasError) {
        // Focar no primeiro campo com erro, se houver
        if (!clientNameValue) clientNameInput.focus();
        else if (!clientAreaValue) clientAreaOfExpertiseSelect.focus(); // Focar no select
        return;
    }

    const clientData = {
        name: clientNameValue,
        area_of_expertise: clientAreaValue,
    };

    try {
        let response;
        const headers = getAuthHeaders();
        if (id) { // Atualizar
            response = await fetch(`${API_BASE_URL}/clients/${id}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(clientData),
            });
        } else { // Criar
            response = await fetch(`${API_BASE_URL}/clients/`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(clientData),
            });
        }

        if (response.status === 401) {
            alert("Sessão expirada ou inválida. Faça login novamente.");
            logout(); return;
        }
        if (!response.ok) {
            const errorData = await response.json();
            // Tenta exibir o erro da API no campo mais relevante ou um erro geral
            if (errorData.detail && errorData.detail.toLowerCase().includes("nome") || errorData.detail.toLowerCase().includes("name")) {
                showFieldError('client-name', errorData.detail);
            } else if (errorData.detail && (errorData.detail.toLowerCase().includes("area") || errorData.detail.toLowerCase().includes("área") || errorData.detail.toLowerCase().includes("area_of_expertise"))) {
                showFieldError('clientAreaOfExpertiseSelect', errorData.detail); // ID do select para erro
            } else {
                alert(`Erro ao salvar cliente: ${errorData.detail || `Erro HTTP ${response.status}`}`);
            }
            throw new Error(`Erro HTTP: ${response.status} - ${errorData.detail || 'Erro desconhecido'}`);
        }

        clientForm.reset(); // Isso também deve resetar o select para a primeira opção
        clearAllFormErrors(clientForm); // Limpar após reset bem sucedido
        clientIdInput.value = '';
        cancelClientUpdateBtn.style.display = 'none';
        fetchClients();
        alert(`Cliente ${id ? 'atualizado' : 'adicionado'} com sucesso!`);
    } catch (error) {
        console.error(`Falha ao salvar cliente:`, error);
        if (!document.querySelector('#client-form .is-invalid')) {
             alert(`Erro ao salvar cliente: ${error.message.replace(/^Erro HTTP: \d+ - /, '')}`);
        }
    }
});

// Preencher formulário para Editar Cliente
function editClient(id, name, area) {
    clientIdInput.value = id;
    clientNameInput.value = name;
    clientAreaOfExpertiseSelect.value = area; // Alterado para select
    cancelClientUpdateBtn.style.display = 'inline-block';
    clientNameInput.focus();
}

// Cancelar Atualização de Cliente
cancelClientUpdateBtn.addEventListener('click', () => {
    clientForm.reset(); // Isso também deve resetar o select
    clearAllFormErrors(clientForm);
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
            headers: getAuthHeaders()
        });
        if (response.status === 401) {
            alert("Sessão expirada ou inválida. Faça login novamente.");
            logout(); return;
        }
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
    if (!getToken()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/lawyers/`, { headers: getAuthHeaders() });
        if (response.status === 401) {
            alert("Sessão expirada ou inválida. Faça login novamente.");
            logout(); return;
        }
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
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
    if (!getToken()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/clients/`, { headers: getAuthHeaders() });
        if (response.status === 401) {
            alert("Sessão expirada ou inválida. Faça login novamente.");
            logout(); return;
        }
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
    if (!getToken()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/processes/`, { headers: getAuthHeaders() });
        if (response.status === 401) {
            alert("Sessão expirada ou inválida. Faça login novamente.");
            logout(); return;
        }
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
    clearAllFormErrors(processForm); // Limpa erros anteriores

    const id = processIdInput.value;

    // Validação dos campos de Processo
    const processNumberValue = processNumberInput.value.trim();
    const lawyerIdValue = processLawyerSelect.value;
    const clientIdValue = processClientSelect.value;
    const entryDateValue = processEntryDateInput.value;
    const deliveryDeadlineValue = processDeliveryDeadlineInput.value;
    const fatalDeadlineValue = processFatalDeadlineInput.value;
    const statusValue = processStatusInput.value.trim();
    // actionTypeValue é opcional, então não precisa de validação de "obrigatório" aqui,
    // a menos que haja uma regra de formato se preenchido.

    let hasError = false;
    if (!processNumberValue) {
        showFieldError('process-number', "O campo Número do Processo é obrigatório.");
        hasError = true;
    }
    if (!lawyerIdValue) {
        showFieldError('process-lawyer', "Selecione um Advogado Responsável.");
        // Não tem um input direto para focar, mas o select será destacado pela classe se adicionarmos
        // ou podemos focar no select. Bootstrap pode não estilizar selects com is-invalid tão obviamente.
        if (!hasError) processLawyerSelect.focus(); // Foca se for o primeiro erro
        hasError = true;
    }
    if (!clientIdValue) {
        showFieldError('process-client', "Selecione um Cliente.");
        if (!hasError) processClientSelect.focus();
        hasError = true;
    }
    if (!entryDateValue) {
        showFieldError('process-entry-date', "A Data de Entrada é obrigatória.");
        if (!hasError) processEntryDateInput.focus();
        hasError = true;
    }
    if (!deliveryDeadlineValue) {
        showFieldError('process-delivery-deadline', "O Prazo para Entrega é obrigatório.");
        if (!hasError) processDeliveryDeadlineInput.focus();
        hasError = true;
    }
    if (!fatalDeadlineValue) {
        showFieldError('process-fatal-deadline', "O Prazo Fatal é obrigatório.");
        if (!hasError) processFatalDeadlineInput.focus();
        hasError = true;
    }
    if (!statusValue) { // Status é obrigatório (tem default, mas usuário pode apagar)
        showFieldError('process-status', "O campo Status é obrigatório.");
        if (!hasError) processStatusInput.focus();
        hasError = true;
    }
    // Validação de datas: Prazo de Entrega >= Data de Entrada
    if (entryDateValue && deliveryDeadlineValue && new Date(deliveryDeadlineValue) < new Date(entryDateValue)) {
        showFieldError('process-delivery-deadline', "O Prazo para Entrega deve ser igual ou posterior à Data de Entrada.");
        if (!hasError) processDeliveryDeadlineInput.focus();
        hasError = true;
    }
    // Validação de datas: Prazo Fatal >= Prazo de Entrega
    if (deliveryDeadlineValue && fatalDeadlineValue && new Date(fatalDeadlineValue) < new Date(deliveryDeadlineValue)) {
        showFieldError('process-fatal-deadline', "O Prazo Fatal deve ser igual ou posterior ao Prazo para Entrega.");
        if (!hasError) processFatalDeadlineInput.focus();
        hasError = true;
    }


    if (hasError) {
        // Focar no primeiro campo com erro já foi feito acima
        return;
    }

    const processData = {
        process_number: processNumberValue,
        lawyer_id: parseInt(lawyerIdValue),
        client_id: parseInt(clientIdValue),
        entry_date: entryDateValue,
        delivery_deadline: deliveryDeadlineValue,
        fatal_deadline: fatalDeadlineValue,
        status: statusValue,
        action_type: processActionTypeInput.value.trim() || null,
    };

    // Removida a validação aqui, pois já foi feita acima e pode ser confusa com os selects
    // if (!processData.lawyer_id || !processData.client_id) {
    //     alert("Por favor, selecione um advogado e um cliente.");
    //     return;
    // }

    try {
        let response;
        const headers = getAuthHeaders();
        if (id) { // Atualizar
            response = await fetch(`${API_BASE_URL}/processes/${id}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(processData),
            });
        } else { // Criar
            response = await fetch(`${API_BASE_URL}/processes/`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(processData),
            });
        }

        if (response.status === 401) {
            alert("Sessão expirada ou inválida. Faça login novamente.");
            logout(); return;
        }
        if (!response.ok) {
            const errorData = await response.json();
            // Tenta exibir o erro da API no campo mais relevante
            if (errorData.detail && errorData.detail.toLowerCase().includes("número do processo") || errorData.detail.toLowerCase().includes("process_number")) {
                showFieldError('process-number', errorData.detail);
            } else if (errorData.detail && errorData.detail.toLowerCase().includes("advogado") || errorData.detail.toLowerCase().includes("lawyer")) {
                showFieldError('process-lawyer', errorData.detail);
            } else if (errorData.detail && errorData.detail.toLowerCase().includes("cliente") || errorData.detail.toLowerCase().includes("client")) {
                showFieldError('process-client', errorData.detail);
            } else {
                alert(`Erro ao salvar processo: ${errorData.detail || `Erro HTTP ${response.status}`}`);
            }
            throw new Error(`Erro HTTP: ${response.status} - ${errorData.detail || 'Erro desconhecido'}`);
        }

        processForm.reset();
        clearAllFormErrors(processForm); // Limpar após reset bem sucedido
        processIdInput.value = '';
        cancelProcessUpdateBtn.style.display = 'none';
        fetchProcesses();
        alert(`Processo ${id ? 'atualizado' : 'adicionado'} com sucesso!`);
    } catch (error) {
        console.error(`Falha ao salvar processo:`, error);
        if (!document.querySelector('#process-form .is-invalid')) {
             alert(`Erro ao salvar processo: ${error.message.replace(/^Erro HTTP: \d+ - /, '')}`);
        }
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
    clearAllFormErrors(processForm); // Adicionar esta linha
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
            headers: getAuthHeaders()
        });
        if (response.status === 401) {
            alert("Sessão expirada ou inválida. Faça login novamente.");
            logout(); return;
        }
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
    let alertShownForBatchDelete = false; // Declare here for wider scope within the function
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
            headers: getAuthHeaders() // Add auth headers for each delete request
        })
        .then(response => {
            if (response.status === 401 && !alertShownForBatchDelete) { // Show alert once for batch
                alert("Sessão expirada ou inválida. Faça login novamente.");
                alertShownForBatchDelete = true; // Prevent multiple alerts
                logout();
                // Need to throw or handle to stop further processing if desired
                throw new Error("Unauthorized batch delete");
            }
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
    await populateClientOptions(); // Mantido para o formulário de processos
    await loadAreasOfExpertise(); // Carrega as áreas de atuação para o formulário de clientes

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

    // --- Lógica de Estado da UI (Login/Registro/Conteúdo Principal) ---
    async function fetchAndSetCurrentUser() {
        const token = getToken();
        if (!token) {
            currentUser = null;
            updateUIForAuthState(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/users/me`, { headers: getAuthHeaders() });
            if (response.ok) {
                currentUser = await response.json();
                updateUIForAuthState(true); // Update UI now that we have user data

                // Call functions to fetch initial protected data that depend on login state
                // These should ideally be called after currentUser is confirmed and UI is set.
                // Also, ensure these functions use getAuthHeaders() internally.
                await populateLawyerOptions();
                await populateClientOptions();
                await loadAreasOfExpertise(); // Public, but good to have here for sequence
                if (lawyerManagementSection.style.display !== 'none') { // Only fetch if section is visible
                    fetchLawyers();
                }
                fetchClients();
                fetchProcesses();

            } else if (response.status === 401) {
                console.error('Token inválido ou expirado durante fetchAndSetCurrentUser. Fazendo logout.');
                logout(); // Centralized logout handles token removal and UI update
            } else {
                console.error('Erro ao buscar dados do usuário:', response.status);
                currentUser = null;
                updateUIForAuthState(false); // Show login if /users/me fails for other reasons
            }
        } catch (error) {
            console.error('Falha na requisição /users/me:', error);
            currentUser = null;
            updateUIForAuthState(false);
        }
    }

    function updateUIForAuthState(isLoggedIn) {
        if (isLoggedIn && currentUser) { // Check currentUser as well
            loginSection.style.display = 'none';
            registerSection.style.display = 'none';
            mainContentSection.style.display = 'block';
            userInfoSection.style.display = 'block';
            userOabDisplay.textContent = currentUser.oab || 'N/A'; // Use OAB from currentUser

            // Control visibility of lawyer management section
            if (lawyerManagementSection) { // Check if element exists
                if (currentUser.is_admin) {
                    lawyerManagementSection.style.display = 'block'; // Or 'flex', 'grid'
                } else {
                    lawyerManagementSection.style.display = 'none';
                }
            }
             // Data fetching is now primarily handled by fetchAndSetCurrentUser after login
             // or on page load if token is valid.
        } else {
            loginSection.style.display = 'block';
            registerSection.style.display = 'none';
            mainContentSection.style.display = 'none';
            userInfoSection.style.display = 'none';
            if (userOabDisplay) userOabDisplay.textContent = '';
            if (lawyerManagementSection) lawyerManagementSection.style.display = 'none';
            currentUser = null; // Ensure currentUser is cleared on logout state

            // Limpar listas para não mostrar dados antigos
            lawyersListDiv.innerHTML = '';
            clientsListDiv.innerHTML = '';
            processesListDiv.innerHTML = '';
        }
    }

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginSection.style.display = 'none';
            registerSection.style.display = 'block';
            clearAllFormErrors(registerForm);
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerSection.style.display = 'none';
            loginSection.style.display = 'block';
            clearAllFormErrors(loginForm);
        });
    }

    // --- Event Listeners para Forms de Autenticação ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            clearAllFormErrors(loginForm);
            const oab = loginOabInput.value.trim();
            const password = loginPasswordInput.value.trim();

            if (!oab || !password) {
                alert("OAB e Senha são obrigatórios.");
                return;
            }

            const formData = new URLSearchParams();
            formData.append('username', oab);
            formData.append('password', password);

            try {
                const response = await fetch(`${API_BASE_URL}/auth/token`, {
                    method: 'POST',
                    body: formData
                    // Content-Type for URLSearchParams is set automatically by browser
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    showFieldError('login-oab', errorData.detail || "Falha no login. Verifique OAB e senha.");
                    showFieldError('login-password', " "); // Clear any previous specific password error, main error on OAB
                    loginPasswordInput.value = ""; // Clear password field
                    throw new Error(`Login failed: ${errorData.detail || response.status}`);
                }

                const data = await response.json();
                saveToken(data.access_token);
                loginPasswordInput.value = ""; // Clear password field
                await fetchAndSetCurrentUser(); // Fetch user data and then update UI & fetch other data
            } catch (error) {
                console.error('Erro no login:', error);
                // Error already shown by showFieldError or alert if it's a network error
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            clearAllFormErrors(registerForm);

            const name = registerNameInput.value.trim();
            const oab = registerOabInput.value.trim();
            const email = registerEmailInput.value.trim();
            const password = registerPasswordInput.value.trim();
            const confirmPassword = registerConfirmPasswordInput.value.trim();
            const telegramId = registerTelegramInput.value.trim();

            if (!name || !oab || !email || !password || !confirmPassword) {
                alert("Por favor, preencha todos os campos obrigatórios.");
                // Use showFieldError for specific fields if desired
                if(!name) showFieldError('register-name', "Nome é obrigatório");
                if(!oab) showFieldError('register-oab', "OAB é obrigatória");
                if(!email) showFieldError('register-email', "Email é obrigatório");
                if(!password) showFieldError('register-password', "Senha é obrigatória");
                if(!confirmPassword) showFieldError('register-confirm-password', "Confirmação de senha é obrigatória");
                return;
            }

            if (password !== confirmPassword) {
                showFieldError('register-password', "As senhas não coincidem.");
                showFieldError('register-confirm-password', "As senhas não coincidem.");
                registerPasswordInput.value = "";
                registerConfirmPasswordInput.value = "";
                return;
            }

            // Basic OAB validation (similar to lawyer form)
            const oabPatternNumUf = /^\d{1,3}(\.?\d{3})?[A-Z]{2}$/i; // Added i for case-insensitivity of UF
            const oabPatternNumBarraUf = /^\d{1,6}\/[A-Z]{2}$/i;
            if (!(oabPatternNumUf.test(oab) || oabPatternNumBarraUf.test(oab))) {
                showFieldError('register-oab', "Formato da OAB inválido. Ex: 12345SP, 123.456SP, 12345/SP.");
                return;
            }
            // Basic Telegram ID validation (optional)
            if (telegramId && !/^@[a-zA-Z0-9_]{3,31}$/.test(telegramId)) {
                 showFieldError('register-telegram', "ID Telegram inválido. Ex: @usuario_123");
                 return;
            }


            const lawyerData = {
                name: name,
                oab: oab.toUpperCase(), // Send OAB in uppercase
                email: email,
                password: password,
                telegram_id: telegramId || null
            };

            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }, // Register sends JSON
                    body: JSON.stringify(lawyerData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                     if (errorData.detail && errorData.detail.toLowerCase().includes("oab")) {
                        showFieldError('register-oab', errorData.detail);
                    } else if (errorData.detail && errorData.detail.toLowerCase().includes("email")) {
                        showFieldError('register-email', errorData.detail);
                    } else {
                        alert(`Erro no registro: ${errorData.detail || `Erro HTTP ${response.status}`}`);
                    }
                    throw new Error(`Registration failed: ${errorData.detail || response.status}`);
                }

                alert("Registro bem-sucedido! Faça o login com sua OAB e senha.");
                registerForm.reset();
                showLoginLink.click(); // Simulate click to switch to login view
                loginOabInput.value = oab.toUpperCase(); // Pre-fill OAB on login form
                loginPasswordInput.focus();

            } catch (error) {
                console.error('Erro no registro:', error);
            }
        });
    }

    function logout() {
        removeToken();
        currentUser = null; // Clear current user data
        updateUIForAuthState(false);
        // userOabDisplay.textContent = ''; // Already handled in updateUIForAuthState
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (confirm("Tem certeza que deseja sair?")) {
               logout();
            }
        });
    }

    // Estado inicial da UI - Chamar fetchAndSetCurrentUser para verificar token e configurar UI
    await fetchAndSetCurrentUser();
});
