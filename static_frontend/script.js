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

function parseDisplayDate(dateString_ddmmyyyy) {
    if (!dateString_ddmmyyyy) return '';
    const parts = dateString_ddmmyyyy.split('/');
    if (parts.length === 3) {
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        if (day.length === 2 && month.length === 2 && year.length === 4 &&
            /^\d+$/.test(day) && /^\d+$/.test(month) && /^\d+$/.test(year)) {
            return `${year}-${month}-${day}`;
        }
    }
    console.warn(`Formato de data para parseDisplayDate inválido: ${dateString_ddmmyyyy}. Esperado dd/mm/aaaa.`);
    return dateString_ddmmyyyy;
}

// --- Lógica de Autenticação e UI ---
function logout() {
    removeToken();
    currentUser = null;
    window.location.href = 'login.html';
}

function updateUIForIndexPage(isLoggedIn) {
    const mainContentSection = document.getElementById('main-content');
    const userInfoSection = document.getElementById('user-info-section');
    const userOabDisplay = document.getElementById('user-oab-display');

    if (isLoggedIn && currentUser) {
        if (mainContentSection) mainContentSection.style.display = 'block';
        if (userInfoSection) userInfoSection.style.display = 'block';
        if (userOabDisplay) userOabDisplay.textContent = currentUser.oab || 'N/A'; // Ou currentUser.username se preferir
    } else {
        if (mainContentSection) mainContentSection.style.display = 'none';
        if (userInfoSection) userInfoSection.style.display = 'none';
        if (userOabDisplay) userOabDisplay.textContent = '';
    }
}

async function fetchAndSetCurrentUser_forIndexPage() {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/auth/users/me`, { headers: getAuthHeaders() });
        if (response.ok) {
            currentUser = await response.json();
            updateUIForIndexPage(true);

            const userSettingsNavItemIndex = document.getElementById('user-settings-nav-item-index');
            if (userSettingsNavItemIndex) {
                if (currentUser) {
                    userSettingsNavItemIndex.style.display = 'list-item';
                    const linkElement = userSettingsNavItemIndex.querySelector('a');
                    if (linkElement) {
                        linkElement.textContent = 'Minhas Configurações';
                        linkElement.href = '/frontend/user_settings.html';
                    }
                } else {
                    userSettingsNavItemIndex.style.display = 'none';
                }
            } else {
                console.warn("[Script.js] user-settings-nav-item-index não encontrado no DOM de index.html. Verifique o HTML.");
            }

            await populateLawyerOptions();
            await populateClientOptions();
            await loadAreasOfExpertise();

            const isAdmin = currentUser && (currentUser.oab === "00001SP" || currentUser.username === "admin");
            const lawyersSection = document.getElementById('lawyers-section');
            const clientsSection = document.getElementById('clients-section');
            const processLawyerSelect = document.getElementById('process-lawyer');

            if (isAdmin) {
                if (lawyersSection) lawyersSection.style.display = 'block';
                if (clientsSection) clientsSection.style.display = 'block';
                if (processLawyerSelect) processLawyerSelect.disabled = false;
            } else {
                if (lawyersSection) lawyersSection.style.display = 'none';
                if (clientsSection) clientsSection.style.display = 'none';
                if (processLawyerSelect) {
                    processLawyerSelect.value = currentUser.id;
                    processLawyerSelect.disabled = true;
                    let helpText = processLawyerSelect.parentNode.querySelector('.form-text');
                    if (!helpText) {
                        helpText = document.createElement('small');
                        helpText.className = 'form-text text-muted';
                        processLawyerSelect.parentNode.appendChild(helpText);
                    }
                    helpText.textContent = 'O processo será atribuído a você.';
                }
            }

            fetchLawyers();
            fetchClients();
            fetchProcesses();
            return true;
        } else {
            console.error('Falha ao validar token ou buscar dados do usuário:', response.status);
            logout();
            return false;
        }
    } catch (error) {
        console.error('Erro na requisição /users/me:', error);
        logout();
        return false;
    }
}

let allLawyers = [];
let allClients = [];

async function fetchLawyers() {
    if (!getToken() || !document.getElementById('lawyers-list')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/lawyers/`, { headers: getAuthHeaders() });
        if (response.status === 401) { logout(); return; }
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const lawyers = await response.json();
        const lawyersTableBody = document.getElementById('lawyers-table-body'); // ID do tbody da tabela
        if (!lawyersTableBody) {
            console.error("Elemento lawyers-table-body não encontrado!");
            return;
        }
        lawyersTableBody.innerHTML = ''; // Limpar conteúdo anterior

        const isAdminUser = currentUser && (currentUser.oab === "00001SP" || currentUser.username === "admin");

        lawyers.forEach(lawyer => {
            if (lawyer.oab === "00001SP" || lawyer.username === "admin") { // Não listar o admin user para gerenciamento
                return;
            }

            const escapedName = lawyer.name.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedOab = lawyer.oab.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedEmail = lawyer.email.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedTelegramId = (lawyer.telegram_id || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedUsername = (lawyer.username || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;");

            const tr = lawyersTableBody.insertRow();

            // Coluna Nome (Nickname)
            const cellName = tr.insertCell();
            cellName.innerHTML = `<strong>${lawyer.name}</strong><br><small>(Nickname: ${lawyer.username || 'N/A'})</small>`;

            // Coluna Detalhes (OAB, Email, Telegram)
            const cellDetails = tr.insertCell();
            cellDetails.innerHTML = `<small>OAB: ${lawyer.oab}<br>Email: ${lawyer.email}<br>Telegram: ${lawyer.telegram_id || 'N/A'}</small>`;

            // Coluna Ações
            const cellActions = tr.insertCell();
            cellActions.style.verticalAlign = "middle";
            let actionsHtml = `
                <button class="btn btn-sm btn-outline-primary btn-edit-lawyer"
                        data-id="${lawyer.id}"
                        data-name="${escapedName}"
                        data-oab="${escapedOab}"
                        data-email="${escapedEmail}"
                        data-username="${escapedUsername}"
                        data-telegram="${escapedTelegramId}">Editar</button>
                <button class="btn btn-sm btn-outline-danger btn-delete-lawyer delete-btn ms-1" data-id="${lawyer.id}">Excluir</button>`;

            if (isAdminUser) {
                actionsHtml += `<button class="btn btn-sm btn-outline-warning ms-1 btn-admin-reset-password" data-lawyer-id="${lawyer.id}" data-lawyer-name="${escapedName}" data-lawyer-oab="${escapedOab}">Redefinir Senha</button>`;
            }
            cellActions.innerHTML = actionsHtml;
        });
    } catch (error) {
        console.error('Falha ao buscar advogados:', error);
        const lawyersTableBody = document.getElementById('lawyers-table-body');
        if(lawyersTableBody) lawyersTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Erro ao carregar advogados.</td></tr>';
    }
}

// --- Lógica de Busca em Tabelas para Index.html ---
function setupTableSearchIndex(inputId, tableBodyId) {
    const searchInput = document.getElementById(inputId);
    const tableBody = document.getElementById(tableBodyId);

    if (!searchInput) {
        console.warn(`Search input not found for table: ${inputId}`);
        return;
    }
    if (!tableBody) {
        console.warn(`Table body not found: ${tableBodyId}`);
        return;
    }

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = tableBody.getElementsByTagName('tr');

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowText = row.textContent.toLowerCase();
            if (rowText.includes(searchTerm)) {
                row.classList.remove('d-none');
            } else {
                row.classList.add('d-none');
            }
        }
    });

    searchInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchInput.blur();
        }
    });
}

// --- Lógica de Clique no Ícone de Busca ---
function setupSearchIconClick(iconId, inputId) {
    const iconElement = document.getElementById(iconId);
    const inputElement = document.getElementById(inputId);
    if (iconElement && inputElement) {
        iconElement.addEventListener('click', function() { inputElement.focus(); });
    }
}

// --- Lógica para Modal de Redefinir Senha (Admin) ---
let lawyerIdToResetPassword = null;
let adminResetPasswordModalInstance = null;

function initializeAdminResetPasswordModal() {
    const modalElement = document.getElementById('adminResetPasswordModal');
    if (modalElement) {
        adminResetPasswordModalInstance = new bootstrap.Modal(modalElement);
        const saveButton = document.getElementById('adminSaveNewPasswordBtn');
        if (saveButton) {
            saveButton.addEventListener('click', async () => {
                const newPasswordEl = document.getElementById('admin-reset-new-password');
                const confirmPasswordEl = document.getElementById('admin-reset-confirm-password');
                const feedbackDiv = document.getElementById('adminResetPasswordFeedback');

                clearFieldError('admin-reset-new-password');
                clearFieldError('admin-reset-confirm-password');
                if(feedbackDiv) { feedbackDiv.textContent = ''; feedbackDiv.className = 'mt-2'; }

                const newPassword = newPasswordEl.value;
                const confirmPassword = confirmPasswordEl.value;

                if (!newPassword || newPassword.length < 6) {
                    showFieldError('admin-reset-new-password', 'Nova senha deve ter pelo menos 6 caracteres.');
                    newPasswordEl.focus(); return;
                }
                if (newPassword !== confirmPassword) {
                    showFieldError('admin-reset-confirm-password', 'As senhas não coincidem.');
                    confirmPasswordEl.focus(); return;
                }

                if (lawyerIdToResetPassword) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/admin/lawyers/${lawyerIdToResetPassword}/reset-password`, {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ new_password: newPassword })
                        });
                        if (response.ok) {
                            const result = await response.json();
                            if(feedbackDiv) {
                                feedbackDiv.textContent = result.message || "Senha redefinida com sucesso!";
                                feedbackDiv.className = 'mt-2 alert alert-success';
                            } else { alert(result.message || "Senha redefinida com sucesso!"); }
                            newPasswordEl.value = '';
                            confirmPasswordEl.value = '';
                            setTimeout(() => {
                                if (adminResetPasswordModalInstance) adminResetPasswordModalInstance.hide();
                                if(feedbackDiv) { feedbackDiv.textContent = ''; feedbackDiv.className = 'mt-2'; }
                            }, 3000);
                        } else {
                            const errorData = await response.json();
                            const detail = errorData.detail || `Erro ${response.status} ao redefinir senha.`;
                            if(feedbackDiv) {
                                feedbackDiv.textContent = detail;
                                feedbackDiv.className = 'mt-2 alert alert-danger';
                            } else { alert(detail); }
                            console.error("Erro ao redefinir senha:", errorData);
                        }
                    } catch (e) {
                        console.error("Exceção ao redefinir senha:", e);
                        if(feedbackDiv) {
                            feedbackDiv.textContent = "Erro de comunicação ao redefinir senha.";
                            feedbackDiv.className = 'mt-2 alert alert-danger';
                        } else { alert("Erro de comunicação ao redefinir senha.");}
                    }
                }
            });
        }
    } else {
        console.warn("Modal adminResetPasswordModal não encontrado no DOM de index.html");
    }
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
    const clientsTableBody = document.getElementById('clients-table-body');
    if (!getToken() || !clientsTableBody) {
        if (!clientsTableBody) console.error("Elemento clients-table-body não encontrado!");
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/clients/`, { headers: getAuthHeaders() });
        if (response.status === 401) { logout(); return; }
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const clients = await response.json();
        clientsTableBody.innerHTML = ''; // Limpar conteúdo anterior
        clients.forEach(client => {
            const escapedClientName = client.name.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedArea = client.area_of_expertise.replace(/'/g, "&apos;").replace(/"/g, "&quot;");

            const tr = clientsTableBody.insertRow();

            // Coluna Nome/Razão Social
            tr.insertCell().textContent = client.name;

            // Coluna Área de Atuação
            tr.insertCell().textContent = client.area_of_expertise;

            // Coluna Ações
            const cellActions = tr.insertCell();
            cellActions.style.verticalAlign = "middle";
            cellActions.innerHTML = `
                <button class="btn btn-sm btn-outline-primary btn-edit-client" data-id="${client.id}" data-name="${escapedClientName}" data-area="${escapedArea}">Editar</button>
                <button class="btn btn-sm btn-outline-danger btn-delete-client delete-btn ms-1" data-id="${client.id}">Excluir</button>`;
        });
    } catch (error) {
        console.error('Falha ao buscar clientes:', error);
        if(clientsTableBody) clientsTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Erro ao carregar clientes.</td></tr>';
    }
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
        allLawyers.forEach(lawyer => {
            if (lawyer.oab === "00001SP" || lawyer.username === "admin") return;
            const option = document.createElement('option');
            option.value = lawyer.id;
            option.textContent = lawyer.name;
            processLawyerSelect.appendChild(option);
        });
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
    const processesTableBody = document.getElementById('processes-table-body');
    if (!getToken() || !processesTableBody) {
        if(!processesTableBody) console.error("Elemento processes-table-body não encontrado!");
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/processes/`, { headers: getAuthHeaders() });
        if (response.status === 401) { logout(); return; }
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const processes = await response.json();
        processesTableBody.innerHTML = ''; // Limpar conteúdo anterior

        // Certifique-se que allLawyers e allClients estão populados.
        // Idealmente, fetchLawyers e fetchClients deveriam ser chamados antes e garantir que allLawyers/allClients são preenchidos.
        // Para este exemplo, assumimos que já foram preenchidos e são arrays.
        const lawyerMap = Array.isArray(allLawyers) ? allLawyers.reduce((map, lawyer) => { map[lawyer.id] = lawyer.name; return map; }, {}) : {};
        const clientMap = Array.isArray(allClients) ? allClients.reduce((map, client) => { map[client.id] = client.name; return map; }, {}) : {};

        processes.forEach(process => {
            const escapedProcessNumber = process.process_number.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedStatus = process.status.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedActionType = (process.action_type || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;");

            const tr = processesTableBody.insertRow();

            // Coluna Sel. (Checkbox)
            const cellCheckbox = tr.insertCell();
            cellCheckbox.innerHTML = `<input type="checkbox" class="process-checkbox" data-id="${process.id}" style="vertical-align: middle;">`;
            cellCheckbox.style.textAlign = "center";


            // Coluna Nº Processo
            tr.insertCell().textContent = process.process_number;
            // Coluna Advogado
            tr.insertCell().textContent = lawyerMap[process.lawyer_id] || 'N/A';
            // Coluna Cliente
            tr.insertCell().textContent = clientMap[process.client_id] || 'N/A';
            // Coluna Status
            tr.insertCell().textContent = process.status;
            // Coluna Prazo Fatal
            tr.insertCell().textContent = formatDate(process.fatal_deadline);
            // Coluna Tipo Ação
            tr.insertCell().textContent = process.action_type || 'N/A';

            // Coluna Ações
            const cellActions = tr.insertCell();
            cellActions.style.verticalAlign = "middle";
            cellActions.innerHTML = `
                <button class="btn btn-sm btn-outline-primary btn-edit-process"
                        data-id="${process.id}"
                        data-number="${escapedProcessNumber}"
                        data-lawyerid="${process.lawyer_id}"
                        data-clientid="${process.client_id}"
                        data-entrydate="${process.entry_date}"
                        data-deliverydeadline="${process.delivery_deadline}"
                        data-fataldeadline="${process.fatal_deadline}"
                        data-status="${escapedStatus}"
                        data-actiontype="${escapedActionType}"
                        data-completiondate="${process.data_conclusao_real || ''}">Editar</button>
                <button class="btn btn-sm btn-outline-danger btn-delete-process delete-btn ms-1" data-id="${process.id}">Excluir</button>`;
        });
    } catch (error) {
        console.error('Falha ao buscar processos:', error);
        if(processesTableBody) processesTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Erro ao carregar processos.</td></tr>'; // colspan=8 (7 colunas + checkbox)
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const currentPagePath = window.location.pathname;

    if (currentPagePath.includes('login.html')) {
        const token = getToken();
        if (token) {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/users/me`, { headers: getAuthHeaders() });
                if (response.ok) {
                    window.location.href = 'dashboard.html';
                    return;
                } else { removeToken(); }
            } catch (e) { console.error("Error validating token on login page:", e); removeToken(); }
        }
        const loginFormEl = document.getElementById('login-form');
        const loginOabInputEl = document.getElementById('login-oab'); // Mantido como oab para input, mas envia como username
        const loginPasswordInputEl = document.getElementById('login-password');
        const loginGeneralErrorEl = document.getElementById('login-general-error');

        if (loginFormEl) {
            loginFormEl.addEventListener('submit', async (event) => {
                event.preventDefault();
                clearAllFormErrors(loginFormEl);
                const loginValue = loginOabInputEl.value.trim(); // Pode ser OAB ou Nickname
                const password = loginPasswordInputEl.value.trim();

                if (!loginValue || !password) {
                    if(loginGeneralErrorEl) { loginGeneralErrorEl.textContent = "Nickname/OAB e Senha são obrigatórios."; loginGeneralErrorEl.style.display = 'block'; }
                    else { alert("Nickname/OAB e Senha são obrigatórios."); }
                    return;
                }
                const formData = new URLSearchParams();
                formData.append('username', loginValue); // API espera 'username' no form
                formData.append('password', password);
                try {
                    const response = await fetch(`${API_BASE_URL}/auth/token`, { method: 'POST', body: formData });
                    if (!response.ok) {
                        const errorData = await response.json();
                        const detailError = errorData.detail || "Falha no login. Verifique Nickname/OAB e senha.";
                        showFieldError('login-oab', detailError);
                        if(loginGeneralErrorEl && detailError.includes("Falha no login")) { // Ser mais genérico
                            loginGeneralErrorEl.textContent = detailError; loginGeneralErrorEl.style.display = 'block';
                        }
                        loginPasswordInputEl.value = "";
                        throw new Error(`Login failed: ${detailError}`);
                    }
                    const data = await response.json();
                    saveToken(data.access_token);
                    window.location.href = 'dashboard.html';
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
        const logoutButtonEl = document.getElementById('logout-button');
        if(logoutButtonEl) {
            logoutButtonEl.addEventListener('click', () => { if (confirm("Tem certeza que deseja sair?")) logout(); });
        }
        const authSuccess = await fetchAndSetCurrentUser_forIndexPage();
        if (!authSuccess) return;

        // Advogados
        const lawyerFormEl = document.getElementById('lawyer-form');
        const lawyerIdInputEl = document.getElementById('lawyer-id');
        const lawyerNameInputEl = document.getElementById('lawyer-name');
        const lawyerUsernameInputEl = document.getElementById('lawyer-username'); // Novo
        const lawyerOabCrudInputEl = document.getElementById('lawyer-oab');
        const lawyerEmailInputEl = document.getElementById('lawyer-email');
        const lawyerTelegramInputEl = document.getElementById('lawyer-telegram');
        const lawyersTableBodyEl = document.getElementById('lawyers-table-body'); // ATUALIZADO AQUI
        const cancelLawyerUpdateBtnEl = document.getElementById('cancel-lawyer-update');

        if (lawyerFormEl) {
            lawyerFormEl.addEventListener('submit', async (event) => {
                event.preventDefault(); clearAllFormErrors(lawyerFormEl);
                const id = lawyerIdInputEl.value;
                const name = lawyerNameInputEl.value.trim();
                const username = lawyerUsernameInputEl.value.trim(); // Novo
                let oab = lawyerOabCrudInputEl.value.trim().toUpperCase();
                const email = lawyerEmailInputEl.value.trim();
                const telegramId = lawyerTelegramInputEl.value.trim();

                let hasError = false;
                if (!name) { showFieldError('lawyer-name', "Nome é obrigatório."); hasError = true; }
                if (!username) { showFieldError('lawyer-username', "Nickname é obrigatório."); hasError = true; }
                else if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) { showFieldError('lawyer-username', "Nickname inválido (3-20 alfanuméricos)."); hasError = true;}
                if (!oab) { showFieldError('lawyer-oab', "OAB é obrigatório."); hasError = true; }
                // Validação de OAB já existe no backend e no Pydantic, mas uma checagem básica pode ser útil
                // if (!(/^\d{1,6}[A-Z]{2}$/.test(oab) || /^\d{1,6}\/[A-Z]{2}$/.test(oab))) { showFieldError('lawyer-oab', "Formato OAB inválido."); hasError = true; }
                if (oab.includes('.') && !oab.includes('/')) oab = oab.replace('.', ''); // Normalização
                if (!email) { showFieldError('lawyer-email', "Email é obrigatório."); hasError = true; }
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('lawyer-email', "Email inválido."); hasError = true; }
                if (telegramId && !(/^(@[a-zA-Z0-9_]{3,31}|-?\d+)$/.test(telegramId))) { showFieldError('lawyer-telegram', "ID Telegram inválido."); hasError = true; }
                if (hasError) return;

                const lawyerData = { name, username, oab, email, telegram_id: telegramId || null };

                try {
                    let response; const headers = getAuthHeaders();
                    if (id) { response = await fetch(`${API_BASE_URL}/lawyers/${id}`, { method: 'PUT', headers: headers, body: JSON.stringify(lawyerData) }); }
                    else { response = await fetch(`${API_BASE_URL}/lawyers/`, { method: 'POST', headers: headers, body: JSON.stringify(lawyerData) }); }

                    if (response.status === 401) { alert("Sessão expirada."); logout(); return; }
                    if (!response.ok) {
                        const errorData = await response.json();
                        const detail = errorData.detail || `Erro ${response.status}`;
                        if (typeof detail === 'string') {
                            if (detail.toLowerCase().includes("oab")) showFieldError('lawyer-oab', detail);
                            else if (detail.toLowerCase().includes("email")) showFieldError('lawyer-email', detail);
                            else if (detail.toLowerCase().includes("nickname") || detail.toLowerCase().includes("username")) showFieldError('lawyer-username', detail);
                            else alert(`Erro: ${detail}`);
                        } else { alert(`Erro: ${JSON.stringify(detail)}`);}
                        throw new Error(`HTTP error: ${response.status}`);
                    }
                    lawyerFormEl.reset(); clearAllFormErrors(lawyerFormEl); lawyerIdInputEl.value = '';
                    if(cancelLawyerUpdateBtnEl) cancelLawyerUpdateBtnEl.style.display = 'none';
                    fetchLawyers();
                    populateLawyerOptions(); // Repopular select de advogados
                    alert(`Advogado ${id ? 'atualizado' : 'adicionado'}!`);
                } catch (e) {
                    console.error('Falha ao salvar advogado:', e);
                    if (!document.querySelector('#lawyer-form .is-invalid')) alert('Falha ao salvar advogado. Verifique os campos.');
                }
            });
        }
        if(lawyersTableBodyEl) { lawyersTableBodyEl.addEventListener('click', (event) => { // ATUALIZADO AQUI
            const target = event.target.closest('button'); // Garantir que pegamos o botão, mesmo se o clique for no ícone dentro dele
            if (!target) return; // Se o clique não foi em um botão ou perto dele

            if (target.classList.contains('btn-edit-lawyer')) {
                document.getElementById('lawyer-id').value = target.dataset.id;
                document.getElementById('lawyer-name').value = target.dataset.name;
                document.getElementById('lawyer-username').value = target.dataset.username; // Novo
                document.getElementById('lawyer-oab').value = target.dataset.oab;
                document.getElementById('lawyer-email').value = target.dataset.email;
                document.getElementById('lawyer-telegram').value = target.dataset.telegram;
                if(cancelLawyerUpdateBtnEl) cancelLawyerUpdateBtnEl.style.display = 'inline-block';
                document.getElementById('lawyer-name').focus();
            }
            else if (target.classList.contains('btn-delete-lawyer')) { deleteLawyer(target.dataset.id); }
            else if (target.classList.contains('btn-admin-reset-password')) {
                lawyerIdToResetPassword = target.dataset.lawyerId;
                const lawyerName = target.dataset.lawyerName;
                const lawyerOab = target.dataset.lawyerOab;
                const modalLawyerInfo = document.getElementById('resetPasswordLawyerInfo');
                if (modalLawyerInfo) modalLawyerInfo.textContent = `${lawyerName} (OAB: ${lawyerOab})`;

                const newPassEl = document.getElementById('admin-reset-new-password');
                const confirmPassEl = document.getElementById('admin-reset-confirm-password');
                const feedbackDivModal = document.getElementById('adminResetPasswordFeedback');
                if(newPassEl) newPassEl.value = '';
                if(confirmPassEl) confirmPassEl.value = '';
                if(feedbackDivModal) { feedbackDivModal.textContent = ''; feedbackDivModal.className = 'mt-2'; }
                clearFieldError('admin-reset-new-password');
                clearFieldError('admin-reset-confirm-password');

                if (adminResetPasswordModalInstance) adminResetPasswordModalInstance.show();
                else console.error("Instância do modal de redefinição de senha não encontrada.");
            }
        });}
        if(cancelLawyerUpdateBtnEl) {
            cancelLawyerUpdateBtnEl.addEventListener('click', () => {
                if(lawyerFormEl) lawyerFormEl.reset();
                clearAllFormErrors(lawyerFormEl);
                if(lawyerIdInputEl) lawyerIdInputEl.value = '';
                cancelLawyerUpdateBtnEl.style.display = 'none';
            });
        }
        initializeAdminResetPasswordModal();

        // Clientes
        const clientFormEl = document.getElementById('client-form');
        // Handler do form de cliente (simplificado, pois a lógica interna do form não muda)
        if (clientFormEl) {
            clientFormEl.addEventListener('submit', async (event) => {
                event.preventDefault(); clearAllFormErrors(clientFormEl);
                const id = document.getElementById('client-id').value;
                const name = document.getElementById('client-name').value.trim();
                const area = document.getElementById('clientAreaOfExpertiseSelect').value;
                if (!name || !area) {
                    if(!name) showFieldError('client-name', "Nome é obrigatório.");
                    if(!area) showFieldError('client-area', "Área é obrigatória."); // Assumindo client-area-error
                    return;
                }
                const clientData = { name, area_of_expertise: area };
                try {
                    let response; const headers = getAuthHeaders();
                    if (id) { response = await fetch(`${API_BASE_URL}/clients/${id}`, { method: 'PUT', headers, body: JSON.stringify(clientData) }); }
                    else { response = await fetch(`${API_BASE_URL}/clients/`, { method: 'POST', headers, body: JSON.stringify(clientData) }); }
                    if (response.status === 401) { alert("Sessão expirada."); logout(); return; }
                    if (!response.ok) { const errorData = await response.json(); alert(`Erro: ${errorData.detail || response.status}`); throw new Error(errorData.detail); }
                    clientFormEl.reset(); clearAllFormErrors(clientFormEl); document.getElementById('client-id').value = '';
                    document.getElementById('cancel-client-update').style.display = 'none';
                    fetchClients(); populateClientOptions();
                    alert(`Cliente ${id ? 'atualizado' : 'adicionado'}!`);
                } catch (e) { console.error('Falha ao salvar cliente:', e); if (!document.querySelector('#client-form .is-invalid')) alert('Falha ao salvar cliente.');}
            });
        }

        const clientsTableBodyEl = document.getElementById('clients-table-body'); // ATUALIZADO AQUI
        if (clientsTableBodyEl) {
            clientsTableBodyEl.addEventListener('click', (event) => { // ATUALIZADO AQUI
                const target = event.target.closest('button');
                if (!target) return;

                if (target.classList.contains('btn-edit-client')) {
                    document.getElementById('client-id').value = target.dataset.id;
                    document.getElementById('client-name').value = target.dataset.name;
                    document.getElementById('clientAreaOfExpertiseSelect').value = target.dataset.area;
                    document.getElementById('cancel-client-update').style.display = 'inline-block';
                    document.getElementById('client-name').focus();
                } else if (target.classList.contains('btn-delete-client')) {
                    deleteClient(target.dataset.id);
                }
            });
        }
        const cancelClientUpdateBtnEl = document.getElementById('cancel-client-update');
        if (cancelClientUpdateBtnEl) {
            cancelClientUpdateBtnEl.addEventListener('click', () => {
                if(clientFormEl) clientFormEl.reset();
                clearAllFormErrors(clientFormEl);
                document.getElementById('client-id').value = '';
                cancelClientUpdateBtnEl.style.display = 'none';
            });
        }


        // Processos
        const processFormEl = document.getElementById('process-form');
        const processIdInputEl = document.getElementById('process-id');
        // (outros inputs do formulário de processo já são obtidos dentro do handler)

        if (processFormEl) {
            processFormEl.addEventListener('submit', async (event) => {
                event.preventDefault(); clearAllFormErrors(processFormEl);
                const id = processIdInputEl.value;
                const processData = {
                    process_number: document.getElementById('process-number').value.trim(),
                    lawyer_id: parseInt(document.getElementById('process-lawyer').value),
                    client_id: parseInt(document.getElementById('process-client').value),
                    entry_date: parseDisplayDate(document.getElementById('process-entry-date').value.trim()),
                    delivery_deadline: parseDisplayDate(document.getElementById('process-delivery-deadline').value.trim()),
                    fatal_deadline: parseDisplayDate(document.getElementById('process-fatal-deadline').value.trim()),
                    data_conclusao_real: parseDisplayDate(document.getElementById('process-completion-date').value.trim()) || null,
                    status: document.getElementById('process-status').value.trim(),
                    action_type: document.getElementById('process-action-type').value.trim() || null,
                };

                // Validações básicas (outras são feitas no backend)
                let hasError = false;
                if (!processData.process_number) { showFieldError('process-number', 'Número do processo é obrigatório.'); hasError = true; }
                if (!processData.lawyer_id) { /* Idealmente, validar se é um número válido. O select deve garantir isso. */ }
                if (!processData.client_id) { /* Idem */ }
                if (!document.getElementById('process-entry-date').value.trim()) { showFieldError('process-entry-date', 'Data de entrada é obrigatória.'); hasError=true;}
                if (!document.getElementById('process-delivery-deadline').value.trim()) { showFieldError('process-delivery-deadline', 'Prazo de entrega é obrigatório.'); hasError=true;}
                if (!document.getElementById('process-fatal-deadline').value.trim()) { showFieldError('process-fatal-deadline', 'Prazo fatal é obrigatório.'); hasError=true;}
                if (hasError) return;

                try {
                    let response; const headers = getAuthHeaders();
                    if (id) { response = await fetch(`${API_BASE_URL}/processes/${id}`, { method: 'PUT', headers, body: JSON.stringify(processData) }); }
                    else { response = await fetch(`${API_BASE_URL}/processes/`, { method: 'POST', headers, body: JSON.stringify(processData) }); }
                    if (response.status === 401) { alert("Sessão expirada."); logout(); return; }
                    if (!response.ok) { const errorData = await response.json(); alert(`Erro: ${errorData.detail || response.status}`); throw new Error(errorData.detail); }
                    processFormEl.reset(); clearAllFormErrors(processFormEl); processIdInputEl.value = '';
                    document.getElementById('cancel-process-update').style.display = 'none';
                    fetchProcesses();
                    alert(`Processo ${id ? 'atualizado' : 'adicionado'}!`);
                } catch (e) { console.error('Falha ao salvar processo:', e); if (!document.querySelector('#process-form .is-invalid')) alert('Falha ao salvar processo.');}
            });
        }

        const processesTableBodyEl = document.getElementById('processes-table-body'); // ATUALIZADO AQUI
        if (processesTableBodyEl) {
            processesTableBodyEl.addEventListener('click', (event) => { // ATUALIZADO AQUI
                const target = event.target.closest('button'); // Pega o botão mais próximo
                if (target && target.classList.contains('btn-edit-process')) {
                    processIdInputEl.value = target.dataset.id;
                    document.getElementById('process-number').value = target.dataset.number;
                    document.getElementById('process-lawyer').value = target.dataset.lawyerid;
                    document.getElementById('process-client').value = target.dataset.clientid;
                    document.getElementById('process-entry-date').value = formatDate(target.dataset.entrydate);
                    document.getElementById('process-delivery-deadline').value = formatDate(target.dataset.deliverydeadline);
                    document.getElementById('process-fatal-deadline').value = formatDate(target.dataset.fataldeadline);
                    document.getElementById('process-completion-date').value = target.dataset.completiondate ? formatDate(target.dataset.completiondate) : '';
                    document.getElementById('process-status').value = target.dataset.status;
                    document.getElementById('process-action-type').value = target.dataset.actiontype;
                    document.getElementById('cancel-process-update').style.display = 'inline-block';
                    document.getElementById('process-number').focus();
                } else if (target && target.classList.contains('btn-delete-process')) {
                    deleteProcess(target.dataset.id);
                }
                // O clique no checkbox é tratado separadamente se necessário, ou não precisa de handler aqui.
            });
        }
        const cancelProcessUpdateBtnEl = document.getElementById('cancel-process-update');
        if (cancelProcessUpdateBtnEl) {
            cancelProcessUpdateBtnEl.addEventListener('click', () => {
                if(processFormEl) processFormEl.reset();
                clearAllFormErrors(processFormEl);
                processIdInputEl.value = '';
                cancelProcessUpdateBtnEl.style.display = 'none';
            });
        }
        const deleteSelectedProcessesBtnEl = document.getElementById('delete-selected-processes-btn');
        if (deleteSelectedProcessesBtnEl) {
            deleteSelectedProcessesBtnEl.addEventListener('click', handleDeleteSelectedProcesses);
        }


        // Lógica de Busca em Tabelas
        setupTableSearchIndex('search-lawyers', 'lawyers-table-body');
        setupTableSearchIndex('search-clients', 'clients-table-body');
        setupTableSearchIndex('search-processes', 'processes-table-body');
        setupSearchIconClick('search-lawyers-icon', 'search-lawyers');
        setupSearchIconClick('search-clients-icon', 'search-clients');
        setupSearchIconClick('search-processes-icon', 'search-processes');

        const logoutButtonIndex = document.getElementById('logout-button-index');
        if (logoutButtonIndex) {
            logoutButtonIndex.addEventListener('click', () => { if (confirm('Tem certeza que deseja sair?')) logout(); });
        } else { console.warn("[Main App Debug] Botão logout-button-index não encontrado no index.html."); }
    }
});

// Funções CRUD (simplificadas para manter o foco, o código completo já existe e foi verificado)
async function deleteLawyer(id) {
    if (!confirm('Tem certeza que deseja excluir este advogado?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/lawyers/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (response.status === 401) { alert("Sessão expirada."); logout(); return; }
        if (!response.ok) { const errorData = await response.json(); throw new Error(`HTTP error ${response.status}: ${errorData.detail || 'Erro desconhecido'}`); }
        fetchLawyers();
        populateLawyerOptions(); // Repopular select
        alert('Advogado excluído com sucesso!');
    } catch (error) { console.error('Falha ao excluir advogado:', error); alert(`Erro: ${error.message}`); }
}
async function deleteClient(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (response.status === 401) { alert("Sessão expirada."); logout(); return; }
        if (!response.ok) { const errorData = await response.json(); throw new Error(`HTTP error ${response.status}: ${errorData.detail || 'Erro desconhecido'}`); }
        fetchClients();
        populateClientOptions(); // Repopular select
        alert('Cliente excluído com sucesso!');
    } catch (error) { console.error('Falha ao excluir cliente:', error); alert(`Erro: ${error.message}`); }
}
async function deleteProcess(id) {
    if (!confirm('Tem certeza que deseja excluir este processo?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/processes/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (response.status === 401) { alert("Sessão expirada."); logout(); return; }
        if (!response.ok) { const errorData = await response.json(); throw new Error(`HTTP error ${response.status}: ${errorData.detail || 'Erro desconhecido'}`); }
        fetchProcesses();
        alert('Processo excluído com sucesso!');
    } catch (error) { console.error('Falha ao excluir processo:', error); alert(`Erro: ${error.message}`); }
}
async function handleDeleteSelectedProcesses() {
    /* ... (lógica existente) ... */
    const selectedCheckboxes = document.querySelectorAll('#processes-list .process-checkbox:checked');
    if (selectedCheckboxes.length === 0) { alert('Nenhum processo selecionado.'); return; }
    const processIdsToDelete = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
    if (!confirm(`Excluir ${processIdsToDelete.length} processo(s)?`)) return;
    // ... (restante da lógica de Promise.allSettled e feedback)
    let successCount = 0;
    for (const id of processIdsToDelete) {
        try {
            const response = await fetch(`${API_BASE_URL}/processes/${id}`, { method: 'DELETE', headers: getAuthHeaders()});
            if(response.ok) successCount++;
            else console.error(`Falha ao excluir processo ${id}: ${response.statusText}`);
        } catch (e) { console.error(`Erro ao excluir processo ${id}:`, e); }
    }
    alert(`${successCount} processo(s) excluído(s). Falhas (se houver) registradas no console.`);
    fetchProcesses();
}
