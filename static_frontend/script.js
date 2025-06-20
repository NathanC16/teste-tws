const API_BASE_URL = '';
let currentUser = null;

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
    if (!isFormData) {
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
    if (field) field.classList.add('is-invalid');
    if (errorDiv) { errorDiv.textContent = message; errorDiv.style.display = 'block'; }
}
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}-error`);
    if (field) field.classList.remove('is-invalid');
    if (errorDiv) { errorDiv.textContent = ''; errorDiv.style.display = 'none'; }
}
function clearAllFormErrors(formElement) {
    if (!formElement) return;
    const inputs = formElement.querySelectorAll('.form-control, .form-select');
    inputs.forEach(input => clearFieldError(input.id));
    const errorMessages = formElement.querySelectorAll('.invalid-feedback, .alert-danger');
    errorMessages.forEach(errorDiv => { errorDiv.textContent = ''; errorDiv.style.display = 'none'; });
}

// --- Funções Utilitárias ---
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(Date.UTC(year, month, day));
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } else {
        console.warn(`Formato de data inesperado: ${dateString}.`);
        return 'Data Inválida';
    }
}

// Função para converter data de "dd/mm/aaaa" para "yyyy-mm-dd"
function parseDisplayDate(dateString_ddmmyyyy) {
    if (!dateString_ddmmyyyy) return ''; // Retorna vazio se a string for vazia
    const parts = dateString_ddmmyyyy.split('/');
    if (parts.length === 3) {
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        // Validação básica do formato (não checa validade da data em si, como dia 32)
        if (day.length === 2 && month.length === 2 && year.length === 4 &&
            /^\d+$/.test(day) && /^\d+$/.test(month) && /^\d+$/.test(year)) {
            return `${year}-${month}-${day}`;
        }
    }
    console.warn(`Formato de data para parseDisplayDate inválido: ${dateString_ddmmyyyy}. Esperado dd/mm/aaaa.`);
    return dateString_ddmmyyyy; // Retorna original se o formato for inesperado, para validação no backend
}

// --- Lógica de Autenticação e UI ---
function logout() {
    removeToken();
    currentUser = null;
    window.location.href = 'login.html';
}

// UI State update for index.html
function updateUIForIndexPage(isLoggedIn) {
    const mainContentSection = document.getElementById('main-content');
    const userInfoSection = document.getElementById('user-info-section');
    const userOabDisplay = document.getElementById('user-oab-display');
    const lawyersListDiv = document.getElementById('lawyers-list');
    const clientsListDiv = document.getElementById('clients-list');
    const processesListDiv = document.getElementById('processes-list');

    if (isLoggedIn && currentUser) {
        if (mainContentSection) mainContentSection.style.display = 'block';
        if (userInfoSection) userInfoSection.style.display = 'block';
        if (userOabDisplay) userOabDisplay.textContent = currentUser.oab || 'N/A';
    } else {
        if (mainContentSection) mainContentSection.style.display = 'none';
        if (userInfoSection) userInfoSection.style.display = 'none';
        if (userOabDisplay) userOabDisplay.textContent = '';
        if (lawyersListDiv) lawyersListDiv.innerHTML = '';
        if (clientsListDiv) clientsListDiv.innerHTML = '';
        if (processesListDiv) processesListDiv.innerHTML = '';
    }
}

async function fetchAndSetCurrentUser_forIndexPage() {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return false; // Indicate auth failed
    }
    try {
        const response = await fetch(`${API_BASE_URL}/auth/users/me`, { headers: getAuthHeaders() });
        if (response.ok) {
            currentUser = await response.json();
            updateUIForIndexPage(true);
            // Fetch initial data for index.html
            await populateLawyerOptions();
            await populateClientOptions();
            await loadAreasOfExpertise();
            fetchLawyers();
            fetchClients();
            fetchProcesses();
            return true; // Indicate auth succeeded
        } else { // Covers 401 and other errors
            console.error('Falha ao validar token ou buscar dados do usuário:', response.status);
            logout(); // Clears token and redirects to login.html
            return false; // Indicate auth failed
        }
    } catch (error) {
        console.error('Erro na requisição /users/me:', error);
        logout(); // Clears token and redirects to login.html
        return false; // Indicate auth failed
    }
}

// --- Funções de Carregamento de Dados (para index.html) ---
let allLawyers = [];
let allClients = [];

async function fetchLawyers() {
    if (!getToken() || !document.getElementById('lawyers-list')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/lawyers/`, { headers: getAuthHeaders() });
        if (response.status === 401) { logout(); return; }
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const lawyers = await response.json();
        const lawyersListDiv = document.getElementById('lawyers-list');
        lawyersListDiv.innerHTML = '';
        lawyers.forEach(lawyer => { /* ... (render lawyer list item) ... */
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            const escapedName = lawyer.name.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedOab = lawyer.oab.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedEmail = lawyer.email.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedTelegramId = (lawyer.telegram_id || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;");

            let deleteButtonHtml = '';
            if (lawyer.oab === "00001SP") { // Verifica se é o admin principal pela OAB
                deleteButtonHtml = `<button class="btn btn-sm btn-outline-secondary delete-btn" data-id="${lawyer.id}" disabled title="O admin principal não pode ser excluído">Excluir</button>`;
            } else {
                deleteButtonHtml = `<button class="btn btn-sm btn-outline-danger btn-delete-lawyer delete-btn" data-id="${lawyer.id}">Excluir</button>`;
            }

            li.innerHTML = `
                <div class="flex-grow-1">
                    <strong>${lawyer.name}</strong><br>
                    <small>OAB: ${lawyer.oab} | Email: ${lawyer.email} | Telegram: ${lawyer.telegram_id || 'N/A'}</small>
                </div>
                <div class="item-actions ms-3">
                    <button class="btn btn-sm btn-outline-primary btn-edit-lawyer" data-id="${lawyer.id}" data-name="${escapedName}" data-oab="${escapedOab}" data-email="${escapedEmail}" data-telegram="${escapedTelegramId}">Editar</button>
                    ${deleteButtonHtml}
                </div>`;
            lawyersListDiv.appendChild(li);
        });
    } catch (error) { console.error('Falha ao buscar advogados:', error); if(document.getElementById('lawyers-list')) document.getElementById('lawyers-list').innerHTML = '<p>Erro ao carregar.</p>'; }
}
async function loadAreasOfExpertise() {
    const clientAreaOfExpertiseSelect = document.getElementById('clientAreaOfExpertiseSelect');
    if (!clientAreaOfExpertiseSelect) return;
    try {
        const response = await fetch(`${API_BASE_URL}/areas-of-expertise/`);
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const areas = await response.json();
        clientAreaOfExpertiseSelect.innerHTML = '<option value="">Selecione uma área</option>';
        areas.forEach(area => { const option = document.createElement('option'); option.value = area; option.textContent = area; clientAreaOfExpertiseSelect.appendChild(option); });
    } catch (error) { console.error('Falha ao buscar áreas de atuação:', error); clientAreaOfExpertiseSelect.innerHTML = '<option value="">Erro</option>'; }
}
async function fetchClients() {
    if (!getToken() || !document.getElementById('clients-list')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/clients/`, { headers: getAuthHeaders() });
        if (response.status === 401) { logout(); return; }
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const clients = await response.json();
        const clientsListDiv = document.getElementById('clients-list');
        clientsListDiv.innerHTML = '';
        clients.forEach(client => { /* ... (render client list item) ... */
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
                    <button class="btn btn-sm btn-outline-primary btn-edit-client" data-id="${client.id}" data-name="${escapedClientName}" data-area="${escapedArea}">Editar</button>
                    <button class="btn btn-sm btn-outline-danger btn-delete-client delete-btn" data-id="${client.id}">Excluir</button>
                </div>`;
            clientsListDiv.appendChild(li);
        });
    } catch (error) { console.error('Falha ao buscar clientes:', error); if(document.getElementById('clients-list')) document.getElementById('clients-list').innerHTML = '<p>Erro ao carregar.</p>'; }
}
async function populateLawyerOptions() {
    const processLawyerSelect = document.getElementById('process-lawyer');
    if (!getToken() || !processLawyerSelect) return [];
    try {
        const response = await fetch(`${API_BASE_URL}/lawyers/`, { headers: getAuthHeaders() });
        if (response.status === 401) { logout(); return []; }
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        allLawyers = await response.json();
        processLawyerSelect.innerHTML = '<option value="">Selecione um Advogado</option>';
        allLawyers.forEach(lawyer => { const option = document.createElement('option'); option.value = lawyer.id; option.textContent = lawyer.name; processLawyerSelect.appendChild(option); });
        return allLawyers;
    } catch (error) { console.error('Falha ao buscar advogados para select:', error); return []; }
}
async function populateClientOptions() {
    const processClientSelect = document.getElementById('process-client');
    if (!getToken() || !processClientSelect) return [];
    try {
        const response = await fetch(`${API_BASE_URL}/clients/`, { headers: getAuthHeaders() });
        if (response.status === 401) { logout(); return []; }
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        allClients = await response.json();
        processClientSelect.innerHTML = '<option value="">Selecione um Cliente</option>';
        allClients.forEach(client => { const option = document.createElement('option'); option.value = client.id; option.textContent = client.name; processClientSelect.appendChild(option); });
        return allClients;
    } catch (error) { console.error('Falha ao buscar clientes para select:', error); return []; }
}
async function fetchProcesses() {
    const processesListDiv = document.getElementById('processes-list');
    if (!getToken() || !processesListDiv) return;
    try {
        const response = await fetch(`${API_BASE_URL}/processes/`, { headers: getAuthHeaders() });
        if (response.status === 401) { logout(); return; }
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const processes = await response.json();
        processesListDiv.innerHTML = '';
        const lawyerMap = allLawyers.reduce((map, lawyer) => { map[lawyer.id] = lawyer.name; return map; }, {});
        const clientMap = allClients.reduce((map, client) => { map[client.id] = client.name; return map; }, {});
        processes.forEach(process => { /* ... (render process list item) ... */
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex align-items-center';
            const escapedProcessNumber = process.process_number.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedStatus = process.status.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedActionType = (process.action_type || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            li.innerHTML = `
                <input type="checkbox" class="process-checkbox me-2" data-id="${process.id}" style="flex-shrink: 0;">
                <div class="flex-grow-1">
                    <strong>Nº: ${process.process_number}</strong> (Adv: ${lawyerMap[process.lawyer_id] || 'N/A'}, Cli: ${clientMap[process.client_id] || 'N/A'})<br>
                    <small>Status: ${process.status} | Prazo Fatal: ${formatDate(process.fatal_deadline)} | Tipo: ${process.action_type || 'N/A'}</small>
                </div>
                <div class="item-actions ms-3" style="flex-shrink: 0;">
                    <button class="btn btn-sm btn-outline-primary btn-edit-process" data-id="${process.id}" data-number="${escapedProcessNumber}" data-lawyerid="${process.lawyer_id}" data-clientid="${process.client_id}" data-entrydate="${process.entry_date}" data-deliverydeadline="${process.delivery_deadline}" data-fataldeadline="${process.fatal_deadline}" data-status="${escapedStatus}" data-actiontype="${escapedActionType}">Editar</button>
                    <button class="btn btn-sm btn-outline-danger btn-delete-process delete-btn" data-id="${process.id}">Excluir</button>
                </div>`;
            processesListDiv.appendChild(li);
        });
    } catch (error) { console.error('Falha ao buscar processos:', error); processesListDiv.innerHTML = '<p>Erro ao carregar.</p>'; }
}

// --- Page Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    const currentPagePath = window.location.pathname;

    if (currentPagePath.includes('login.html')) {
        // --- LOGIN PAGE LOGIC ---
        const token = getToken();
        if (token) {
            // Try to validate token; if good, redirect to index.html
            // This prevents showing login page if already logged in and token is valid
            try {
                const response = await fetch(`${API_BASE_URL}/auth/users/me`, { headers: getAuthHeaders() });
                if (response.ok) {
                    window.location.href = 'dashboard.html'; // Changed to dashboard.html
                    return; // Stop further execution on login page
                } else {
                    removeToken(); // Invalid token, remove it
                }
            } catch (e) {
                console.error("Error validating token on login page:", e);
                removeToken(); // Error during validation, remove token
            }
        }

        const loginFormEl = document.getElementById('login-form');
        const loginOabInputEl = document.getElementById('login-oab');
        const loginPasswordInputEl = document.getElementById('login-password');
        const loginGeneralErrorEl = document.getElementById('login-general-error');

        if (loginFormEl) {
            loginFormEl.addEventListener('submit', async (event) => {
                event.preventDefault();
                clearAllFormErrors(loginFormEl);
                const oab = loginOabInputEl.value.trim();
                const password = loginPasswordInputEl.value.trim();

                if (!oab || !password) {
                    if(loginGeneralErrorEl) { loginGeneralErrorEl.textContent = "OAB e Senha são obrigatórios."; loginGeneralErrorEl.style.display = 'block'; }
                    else { alert("OAB e Senha são obrigatórios."); }
                    return;
                }
                const formData = new URLSearchParams();
                formData.append('username', oab);
                formData.append('password', password);
                try {
                    const response = await fetch(`${API_BASE_URL}/auth/token`, { method: 'POST', body: formData });
                    if (!response.ok) {
                        const errorData = await response.json();
                        const detailError = errorData.detail || "Falha no login. Verifique OAB e senha.";
                        showFieldError('login-oab', detailError); // Show error on OAB field
                        if(loginGeneralErrorEl && detailError === "Falha no login. Verifique OAB e senha.") {
                            loginGeneralErrorEl.textContent = detailError; loginGeneralErrorEl.style.display = 'block';
                        }
                        loginPasswordInputEl.value = "";
                        throw new Error(`Login failed: ${detailError}`);
                    }
                    const data = await response.json();
                    saveToken(data.access_token);
                    window.location.href = 'dashboard.html'; // Changed to dashboard.html
                } catch (error) {
                    console.error('Erro no login:', error);
                    if(loginGeneralErrorEl && !loginGeneralErrorEl.textContent) {
                        loginGeneralErrorEl.textContent = "Erro ao tentar fazer login. Tente novamente.";
                        loginGeneralErrorEl.style.display = 'block';
                    }
                }
            });
        }
    } else if (currentPagePath.includes('index.html') || currentPagePath.endsWith('/frontend/') || currentPagePath.endsWith('/')) {
        // --- INDEX PAGE (MAIN APP) LOGIC ---
        const logoutButtonEl = document.getElementById('logout-button');
        if(logoutButtonEl) {
            logoutButtonEl.addEventListener('click', () => {
                if (confirm("Tem certeza que deseja sair?")) logout();
            });
        }

        const authSuccess = await fetchAndSetCurrentUser_forIndexPage();
        if (!authSuccess) return; // Stop if auth failed and redirection occurred

        // Event Listeners for CRUD forms and lists (scoped to index.html)
        // Advogados
        const lawyerFormEl = document.getElementById('lawyer-form');
        const lawyerIdInputEl = document.getElementById('lawyer-id');
        const lawyerNameInputEl = document.getElementById('lawyer-name');
        const lawyerOabCrudInputEl = document.getElementById('lawyer-oab'); // Specific ID for CRUD OAB
        const lawyerEmailInputEl = document.getElementById('lawyer-email');
        const lawyerTelegramInputEl = document.getElementById('lawyer-telegram');
        const lawyersListDivEl = document.getElementById('lawyers-list');
        const cancelLawyerUpdateBtnEl = document.getElementById('cancel-lawyer-update');

        if (lawyerFormEl) {
            lawyerFormEl.addEventListener('submit', async (event) => {
                event.preventDefault(); clearAllFormErrors(lawyerFormEl);
                const id = lawyerIdInputEl.value;
                const telegramIdValue = lawyerTelegramInputEl.value.trim();
                if (telegramIdValue) {
                    const telegramRegex = /^@[a-zA-Z0-9_]{3,31}$/;
                    if (!telegramRegex.test(telegramIdValue)) { showFieldError('lawyer-telegram', "ID Telegram inválido. Ex: @usuario_123"); lawyerTelegramInputEl.focus(); return; }
                }
                let oabValue = lawyerOabCrudInputEl.value.trim().toUpperCase();
                const oabPatternNumUf = /^\d{1,3}(\.?\d{3})?[A-Z]{2}$/; const oabPatternNumBarraUf = /^\d{1,6}\/[A-Z]{2}$/;
                if (!oabValue) { showFieldError('lawyer-oab', "OAB é obrigatório."); lawyerOabCrudInputEl.focus(); return; }
                if (!(oabPatternNumUf.test(oabValue) || oabPatternNumBarraUf.test(oabValue))) { showFieldError('lawyer-oab', "Formato OAB inválido."); lawyerOabCrudInputEl.focus(); return; }
                if (oabPatternNumUf.test(oabValue) && oabValue.includes('.')) oabValue = oabValue.replace('.', '');
                if (!lawyerNameInputEl.value.trim()) { showFieldError('lawyer-name', "Nome é obrigatório."); lawyerNameInputEl.focus(); return; }
                if (!lawyerEmailInputEl.value.trim()) { showFieldError('lawyer-email', "Email é obrigatório."); lawyerEmailInputEl.focus(); return; }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(lawyerEmailInputEl.value.trim())) { showFieldError('lawyer-email', "Email inválido."); lawyerEmailInputEl.focus(); return; }
                const lawyerData = { name: lawyerNameInputEl.value.trim(), oab: oabValue, email: lawyerEmailInputEl.value.trim(), telegram_id: telegramIdValue || null };
                try {
                    let response; const headers = getAuthHeaders();
                    if (id) { response = await fetch(`${API_BASE_URL}/lawyers/${id}`, { method: 'PUT', headers: headers, body: JSON.stringify(lawyerData) }); }
                    else { response = await fetch(`${API_BASE_URL}/lawyers/`, { method: 'POST', headers: headers, body: JSON.stringify(lawyerData) }); }
                    if (response.status === 401) { alert("Sessão expirada."); logout(); return; }
                    if (!response.ok) {
                        const errorData = await response.json();
                        if (errorData.detail && errorData.detail.toLowerCase().includes("oab")) showFieldError('lawyer-oab', errorData.detail);
                        else if (errorData.detail && errorData.detail.toLowerCase().includes("email")) showFieldError('lawyer-email', errorData.detail);
                        else alert(`Erro: ${errorData.detail || response.status}`);
                        throw new Error(`HTTP error: ${response.status}`);
                    }
                    lawyerFormEl.reset(); clearAllFormErrors(lawyerFormEl); lawyerIdInputEl.value = ''; if(cancelLawyerUpdateBtnEl) cancelLawyerUpdateBtnEl.style.display = 'none';
                    fetchLawyers(); alert(`Advogado ${id ? 'atualizado' : 'adicionado'}!`);
                } catch (e) { console.error('Falha ao salvar advogado:', e); if (!document.querySelector('#lawyer-form .is-invalid')) alert('Falha ao salvar advogado.');}
            });
        }
        if(lawyersListDivEl) lawyersListDivEl.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('btn-edit-lawyer')) {
                // Need to get references to lawyer form inputs again if they are not global
                document.getElementById('lawyer-id').value = target.dataset.id;
                document.getElementById('lawyer-name').value = target.dataset.name;
                document.getElementById('lawyer-oab').value = target.dataset.oab; // Ensure this ID is for CRUD form
                document.getElementById('lawyer-email').value = target.dataset.email;
                document.getElementById('lawyer-telegram').value = target.dataset.telegram;
                if(cancelLawyerUpdateBtnEl) cancelLawyerUpdateBtnEl.style.display = 'inline-block';
                document.getElementById('lawyer-name').focus();
            } else if (target.classList.contains('btn-delete-lawyer')) deleteLawyer(target.dataset.id);
        });
         if(cancelLawyerUpdateBtnEl) cancelLawyerUpdateBtnEl.addEventListener('click', () => {
            if(lawyerFormEl) lawyerFormEl.reset(); clearAllFormErrors(lawyerFormEl); if(lawyerIdInputEl) lawyerIdInputEl.value = ''; cancelLawyerUpdateBtnEl.style.display = 'none';
        });

        // Clientes
        const clientFormEl = document.getElementById('client-form');
        const clientIdInputEl = document.getElementById('client-id');
        const clientNameInputEl = document.getElementById('client-name');
        const clientAreaOfExpertiseSelectEl = document.getElementById('clientAreaOfExpertiseSelect');
        const clientsListDivEl = document.getElementById('clients-list');
        const cancelClientUpdateBtnEl = document.getElementById('cancel-client-update');

        if(clientFormEl) clientFormEl.addEventListener('submit', async (event) => {
            event.preventDefault(); clearAllFormErrors(clientFormEl);
            const id = clientIdInputEl.value; const clientNameValue = clientNameInputEl.value.trim(); const clientAreaValue = clientAreaOfExpertiseSelectEl.value;
            let hasError = false;
            if (!clientNameValue) { showFieldError('client-name', "Nome é obrigatório."); hasError = true; }
            if (!clientAreaValue) { showFieldError('clientAreaOfExpertiseSelect', "Área é obrigatória."); hasError = true; }
            if (hasError) { if (!clientNameValue) clientNameInputEl.focus(); else if (!clientAreaValue) clientAreaOfExpertiseSelectEl.focus(); return; }
            const clientData = { name: clientNameValue, area_of_expertise: clientAreaValue };
            try {
                let response; const headers = getAuthHeaders();
                if (id) { response = await fetch(`${API_BASE_URL}/clients/${id}`, { method: 'PUT', headers: headers, body: JSON.stringify(clientData) }); }
                else { response = await fetch(`${API_BASE_URL}/clients/`, { method: 'POST', headers: headers, body: JSON.stringify(clientData) }); }
                if (response.status === 401) { alert("Sessão expirada."); logout(); return; }
                if (!response.ok) {
                    const errorData = await response.json();
                    if (errorData.detail && errorData.detail.toLowerCase().includes("nome")) showFieldError('client-name', errorData.detail);
                    else if (errorData.detail && (errorData.detail.toLowerCase().includes("area") || errorData.detail.toLowerCase().includes("área"))) showFieldError('clientAreaOfExpertiseSelect', errorData.detail);
                    else alert(`Erro: ${errorData.detail || response.status}`);
                    throw new Error(`HTTP error: ${response.status}`);
                }
                clientFormEl.reset(); clearAllFormErrors(clientFormEl); clientIdInputEl.value = ''; if(cancelClientUpdateBtnEl) cancelClientUpdateBtnEl.style.display = 'none';
                fetchClients(); alert(`Cliente ${id ? 'atualizado' : 'adicionado'}!`);
            } catch (e) { console.error('Falha ao salvar cliente:', e); if (!document.querySelector('#client-form .is-invalid')) alert('Falha ao salvar cliente.');}
        });
         if(clientsListDivEl) clientsListDivEl.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('btn-edit-client')) {
                document.getElementById('client-id').value = target.dataset.id;
                document.getElementById('client-name').value = target.dataset.name;
                document.getElementById('clientAreaOfExpertiseSelect').value = target.dataset.area;
                if(cancelClientUpdateBtnEl) cancelClientUpdateBtnEl.style.display = 'inline-block';
                document.getElementById('client-name').focus();
            }
            else if (target.classList.contains('btn-delete-client')) deleteClient(target.dataset.id);
        });
        if(cancelClientUpdateBtnEl) cancelClientUpdateBtnEl.addEventListener('click', () => {
            if(clientFormEl) clientFormEl.reset(); clearAllFormErrors(clientFormEl); if(clientIdInputEl) clientIdInputEl.value = ''; cancelClientUpdateBtnEl.style.display = 'none';
        });

        // Processos
        const processFormEl = document.getElementById('process-form');
        const processIdInputEl = document.getElementById('process-id');
        const processNumberInputEl = document.getElementById('process-number');
        const processLawyerSelectEl = document.getElementById('process-lawyer');
        const processClientSelectEl = document.getElementById('process-client');
        const processEntryDateInputEl = document.getElementById('process-entry-date');
        const processDeliveryDeadlineInputEl = document.getElementById('process-delivery-deadline');
        const processFatalDeadlineInputEl = document.getElementById('process-fatal-deadline');
        const processStatusInputEl = document.getElementById('process-status');
        const processActionTypeInputEl = document.getElementById('process-action-type');
        const processesListDivEl = document.getElementById('processes-list');
        const cancelProcessUpdateBtnEl = document.getElementById('cancel-process-update');
        const deleteSelectedProcessesBtnEl = document.getElementById('delete-selected-processes-btn');


         if (processFormEl) processFormEl.addEventListener('submit', async (event) => {
            event.preventDefault(); clearAllFormErrors(processFormEl);
            const id = processIdInputEl.value;
            let hasError = false; // Flag para rastrear erros de validação

            // Limpar erros de validação anteriores para campos de data
            clearFieldError('process-entry-date');
            clearFieldError('process-delivery-deadline');
            clearFieldError('process-fatal-deadline');

            const processNumberValue = processNumberInputEl.value.trim();
            const lawyerIdValue = processLawyerSelectEl.value;
            const clientIdValue = processClientSelectEl.value;
            const statusValue = processStatusInputEl.value.trim();

            // Validação e obtenção dos valores de data
            const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
            let entryDateValue_display = processEntryDateInputEl.value.trim();
            let deliveryDeadlineValue_display = processDeliveryDeadlineInputEl.value.trim();
            let fatalDeadlineValue_display = processFatalDeadlineInputEl.value.trim();

            if (!processNumberValue) { showFieldError('process-number', "Número é obrigatório."); hasError = true; }
            if (!lawyerIdValue) { showFieldError('process-lawyer', "Advogado é obrigatório."); if(!hasError) processLawyerSelectEl.focus(); hasError = true; }
            if (!clientIdValue) { showFieldError('process-client', "Cliente é obrigatório."); if(!hasError) processClientSelectEl.focus(); hasError = true; }

            if (!entryDateValue_display) { showFieldError('process-entry-date', "Data de Entrada é obrigatória."); if(!hasError) processEntryDateInputEl.focus(); hasError = true; }
            else if (!dateRegex.test(entryDateValue_display)) { showFieldError('process-entry-date', "Formato de data deve ser dd/mm/aaaa."); if(!hasError) processEntryDateInputEl.focus(); hasError = true; }

            if (!deliveryDeadlineValue_display) { showFieldError('process-delivery-deadline', "Prazo de Entrega é obrigatório."); if(!hasError) processDeliveryDeadlineInputEl.focus(); hasError = true; }
            else if (!dateRegex.test(deliveryDeadlineValue_display)) { showFieldError('process-delivery-deadline', "Formato de data deve ser dd/mm/aaaa."); if(!hasError) processDeliveryDeadlineInputEl.focus(); hasError = true; }

            if (!fatalDeadlineValue_display) { showFieldError('process-fatal-deadline', "Prazo Fatal é obrigatório."); if(!hasError) processFatalDeadlineInputEl.focus(); hasError = true; }
            else if (!dateRegex.test(fatalDeadlineValue_display)) { showFieldError('process-fatal-deadline', "Formato de data deve ser dd/mm/aaaa."); if(!hasError) processFatalDeadlineInputEl.focus(); hasError = true; }

            if (!statusValue) { showFieldError('process-status', "Status é obrigatório."); if(!hasError) processStatusInputEl.focus(); hasError = true; }

            if (hasError) return; // Interrompe se houver erro de validação básico ou de formato

            // Converter datas para ISO "yyyy-mm-dd" para envio e validação de precedência
            const entryDate_iso = parseDisplayDate(entryDateValue_display);
            const deliveryDeadline_iso = parseDisplayDate(deliveryDeadlineValue_display);
            const fatalDeadline_iso = parseDisplayDate(fatalDeadlineValue_display);

            // Validação de datas (após conversão para ISO para facilitar a comparação)
            // É importante que parseDisplayDate retorne algo que Date() consiga interpretar ou que a comparação falhe de forma previsível
            if (entryDate_iso && deliveryDeadline_iso && new Date(deliveryDeadline_iso) < new Date(entryDate_iso)) {
                showFieldError('process-delivery-deadline', "Prazo Entrega deve ser >= Data Entrada."); hasError = true;
            }
            if (deliveryDeadline_iso && fatalDeadline_iso && new Date(fatalDeadline_iso) < new Date(deliveryDeadline_iso)) {
                showFieldError('process-fatal-deadline', "Prazo Fatal deve ser >= Prazo Entrega."); hasError = true;
            }

            if (hasError) return; // Interrompe se houver erro de precedência de datas

            const processData = {
                process_number: processNumberValue,
                lawyer_id: parseInt(lawyerIdValue),
                client_id: parseInt(clientIdValue),
                entry_date: entryDate_iso, // Enviar em formato ISO
                delivery_deadline: deliveryDeadline_iso, // Enviar em formato ISO
                fatal_deadline: fatalDeadline_iso, // Enviar em formato ISO
                status: statusValue,
                action_type: processActionTypeInputEl.value.trim() || null
            };

            try {
                let response; const headers = getAuthHeaders();
                if (id) { response = await fetch(`${API_BASE_URL}/processes/${id}`, { method: 'PUT', headers: headers, body: JSON.stringify(processData) }); }
                else { response = await fetch(`${API_BASE_URL}/processes/`, { method: 'POST', headers: headers, body: JSON.stringify(processData) }); }
                if (response.status === 401) { alert("Sessão expirada."); logout(); return; }
                if (!response.ok) {
                    const errorData = await response.json();
                    if (errorData.detail && errorData.detail.toLowerCase().includes("número do processo")) showFieldError('process-number', errorData.detail);
                    else alert(`Erro: ${errorData.detail || response.status}`);
                    throw new Error(`HTTP error: ${response.status}`);
                }
                processFormEl.reset(); clearAllFormErrors(processFormEl); processIdInputEl.value = ''; if(cancelProcessUpdateBtnEl) cancelProcessUpdateBtnEl.style.display = 'none';
                fetchProcesses(); alert(`Processo ${id ? 'atualizado' : 'adicionado'}!`);
            } catch (e) { console.error('Falha ao salvar processo:', e); if (!document.querySelector('#process-form .is-invalid')) alert('Falha ao salvar processo.');}
        });
        if(processesListDivEl) processesListDivEl.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('btn-edit-process')) {
                document.getElementById('process-id').value = target.dataset.id;
                document.getElementById('process-number').value = target.dataset.number;
                document.getElementById('process-lawyer').value = target.dataset.lawyerid;
                document.getElementById('process-client').value = target.dataset.clientid;
                // Formatar datas do dataset (yyyy-mm-dd) para exibição (dd/mm/aaaa)
                document.getElementById('process-entry-date').value = formatDate(target.dataset.entrydate);
                document.getElementById('process-delivery-deadline').value = formatDate(target.dataset.deliverydeadline);
                document.getElementById('process-fatal-deadline').value = formatDate(target.dataset.fataldeadline);
                document.getElementById('process-status').value = target.dataset.status;
                document.getElementById('process-action-type').value = target.dataset.actiontype;
                if(cancelProcessUpdateBtnEl) cancelProcessUpdateBtnEl.style.display = 'inline-block';
                document.getElementById('process-number').focus();
            }
            else if (target.classList.contains('btn-delete-process')) deleteProcess(target.dataset.id);
        });
        if(cancelProcessUpdateBtnEl) cancelProcessUpdateBtnEl.addEventListener('click', () => {
            if(processFormEl) processFormEl.reset(); clearAllFormErrors(processFormEl); if(processIdInputEl) processIdInputEl.value = ''; cancelProcessUpdateBtnEl.style.display = 'none';
        });
        if (deleteSelectedProcessesBtnEl) {
            deleteSelectedProcessesBtnEl.addEventListener('click', handleDeleteSelectedProcesses);
        }

        // --- Lógica de Busca ao Vivo ---
        // Função genérica para filtrar listas usando classes CSS e sem logs de depuração
        function setupLiveSearch(inputId, listSelector) {
            const searchInput = document.getElementById(inputId);
            if (!searchInput) {
                // console.warn(`Elemento de busca não encontrado: ${inputId}`); // Removido
                return;
            }
            // console.log(`Configurando listener para input: ${inputId}`); // Removido

            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                // console.log(`Termo da busca (${inputId}):`, searchTerm); // Removido

                const items = document.querySelectorAll(listSelector);
                // console.log(`Número de itens encontrados na lista (${listSelector}):`, items.length); // Removido

                // if (items.length === 0) { // Removido
                //     console.warn(`Nenhum item encontrado com o seletor: ${listSelector}`);
                // }

                items.forEach((item) => { // Index removido pois não é mais usado para log
                    const itemText = item.textContent.toLowerCase();
                    const isMatch = itemText.includes(searchTerm);

                    // console.log(...); // Removido

                    if (isMatch) {
                        item.classList.remove('d-none'); // Alterado para usar classe CSS
                    } else {
                        item.classList.add('d-none'); // Alterado para usar classe CSS
                    }
                });
            });

            // Adicionar listener para keydown (Enter) como antes, mas sem o log
            searchInput.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    // console.log(`Enter pressionado no campo ${inputId}`); // Removido
                    event.preventDefault();
                    searchInput.blur();
                }
            });
        }

        // Configurar busca para cada seção
        setupLiveSearch('search-lawyers', '#lawyers-list .list-group-item');
        setupLiveSearch('search-clients', '#clients-list .list-group-item');
        setupLiveSearch('search-processes', '#processes-list .list-group-item');

        // --- Lógica de Clique no Ícone de Busca ---
        // Função para configurar o clique no ícone de busca para focar no input
        function setupSearchIconClick(iconId, inputId) {
            const iconElement = document.getElementById(iconId);
            const inputElement = document.getElementById(inputId);

            if (iconElement && inputElement) {
                iconElement.addEventListener('click', function() {
                    inputElement.focus();
                });
            } else {
                if (!iconElement) console.warn(`Elemento do ícone de busca não encontrado: ${iconId}`);
                if (!inputElement) console.warn(`Elemento de input de busca não encontrado: ${inputId}`);
            }
        }

        // Configurar clique nos ícones de busca
        setupSearchIconClick('search-lawyers-icon', 'search-lawyers');
        setupSearchIconClick('search-clients-icon', 'search-clients');
        setupSearchIconClick('search-processes-icon', 'search-processes');

        // Configurar botão de logout para index.html (na navbar)
        const logoutButtonIndex = document.getElementById('logout-button-index');
        if (logoutButtonIndex) {
            logoutButtonIndex.addEventListener('click', () => {
                if (confirm('Tem certeza que deseja sair?')) {
                    logout();
                }
            });
        } else {
            console.warn("[Main App Debug] Botão logout-button-index não encontrado no index.html.");
        }
    }
});

// Helper functions for edit/delete that were previously defined globally
// These are now defined within the index.html scope if needed or kept global if they don't conflict.
// For simplicity, their original definitions are assumed to be fine if they don't rely on login-page-specific globals.
// Example:
function editLawyer(id, name, oab, email, telegram_id) {
    if(document.getElementById('lawyer-id')) { // Check if on index.html
        document.getElementById('lawyer-id').value = id;
        document.getElementById('lawyer-name').value = name;
        document.getElementById('lawyer-oab').value = oab;
        document.getElementById('lawyer-email').value = email;
        document.getElementById('lawyer-telegram').value = telegram_id;
        const cancelBtn = document.getElementById('cancel-lawyer-update');
        if(cancelBtn) cancelBtn.style.display = 'inline-block';
        document.getElementById('lawyer-name').focus();
    }
}
async function deleteLawyer(id) {
    if (!confirm('Tem certeza que deseja excluir este advogado?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/lawyers/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (response.status === 401) { alert("Sessão expirada."); logout(); return; }
        if (!response.ok) { const errorData = await response.json(); throw new Error(`HTTP error ${response.status}: ${errorData.detail || 'Erro desconhecido'}`); }
        fetchLawyers(); alert('Advogado excluído com sucesso!');
    } catch (error) { console.error('Falha ao excluir advogado:', error); alert(`Erro: ${error.message}`); }
}
function editClient(id, name, area) {
    if(document.getElementById('client-id')) {
        document.getElementById('client-id').value = id;
        document.getElementById('client-name').value = name;
        document.getElementById('clientAreaOfExpertiseSelect').value = area;
        const cancelBtn = document.getElementById('cancel-client-update');
        if(cancelBtn) cancelBtn.style.display = 'inline-block';
        document.getElementById('client-name').focus();
    }
}
async function deleteClient(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (response.status === 401) { alert("Sessão expirada."); logout(); return; }
        if (!response.ok) { const errorData = await response.json(); throw new Error(`HTTP error ${response.status}: ${errorData.detail || 'Erro desconhecido'}`); }
        fetchClients(); alert('Cliente excluído com sucesso!');
    } catch (error) { console.error('Falha ao excluir cliente:', error); alert(`Erro: ${error.message}`); }
}
function editProcess(id, number, lawyerId, clientId, entryDate, deliveryDeadline, fatalDeadline, status, actionType) {
    if(document.getElementById('process-id')) {
        document.getElementById('process-id').value = id;
        document.getElementById('process-number').value = number;
        document.getElementById('process-lawyer').value = lawyerId;
        document.getElementById('process-client').value = clientId;
        document.getElementById('process-entry-date').value = entryDate;
        document.getElementById('process-delivery-deadline').value = deliveryDeadline;
        document.getElementById('process-fatal-deadline').value = fatalDeadline;
        document.getElementById('process-status').value = status;
        document.getElementById('process-action-type').value = actionType;
        const cancelBtn = document.getElementById('cancel-process-update');
        if(cancelBtn) cancelBtn.style.display = 'inline-block';
        document.getElementById('process-number').focus();
    }
}
async function deleteProcess(id) {
    if (!confirm('Tem certeza que deseja excluir este processo?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/processes/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (response.status === 401) { alert("Sessão expirada."); logout(); return; }
        if (!response.ok) { const errorData = await response.json(); throw new Error(`HTTP error ${response.status}: ${errorData.detail || 'Erro desconhecido'}`); }
        fetchProcesses(); alert('Processo excluído com sucesso!');
    } catch (error) { console.error('Falha ao excluir processo:', error); alert(`Erro: ${error.message}`); }
}
async function handleDeleteSelectedProcesses() {
    let alertShownForBatchDelete = false;
    const selectedCheckboxes = document.querySelectorAll('#processes-list .process-checkbox:checked');
    if (selectedCheckboxes.length === 0) { alert('Nenhum processo selecionado.'); return; }
    const processIdsToDelete = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
    if (!confirm(`Excluir ${processIdsToDelete.length} processo(s)?`)) return;
    console.log(`Excluindo ${processIdsToDelete.length} processos...`);
    const deletePromises = processIdsToDelete.map(id => {
        return fetch(`${API_BASE_URL}/processes/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
        .then(response => {
            if (response.status === 401 && !alertShownForBatchDelete) {
                alert("Sessão expirada."); alertShownForBatchDelete = true; logout();
                throw new Error("Unauthorized batch delete");
            }
            if (!response.ok) {
                return response.json().then(errorData => ({ id, success: false, status: response.status, detail: errorData.detail || `HTTP ${response.status}` }))
                               .catch(() => ({ id, success: false, status: response.status, detail: `HTTP ${response.status}` }));
            }
            return { id, success: true };
        })
        .catch(error => ({ id, success: false, status: 'NetworkError', detail: error.message }));
    });
    const results = await Promise.allSettled(deletePromises);
    let successCount = 0; let failureCount = 0; const errorMessages = [];
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) successCount++;
        else if (result.status === 'fulfilled' && !result.value.success) {
            failureCount++; errorMessages.push(`ID ${result.value.id}: ${result.value.detail}`);
        } else if (result.status === 'rejected') {
            failureCount++; errorMessages.push(`ID desconhecido: ${result.reason}`);
        }
    });
    let finalMessage = '';
    if (successCount > 0) finalMessage += `${successCount} processo(s) excluído(s).\n`;
    if (failureCount > 0) { finalMessage += `${failureCount} falha(s).\nDetalhes:\n${errorMessages.join("\n")}`; }
    if (finalMessage) alert(finalMessage);
    fetchProcesses();
}
