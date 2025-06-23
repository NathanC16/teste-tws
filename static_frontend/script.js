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
    // As listas são preenchidas por fetchLawyers, etc. Não precisa limpar aqui.

    if (isLoggedIn && currentUser) {
        if (mainContentSection) mainContentSection.style.display = 'block';
        if (userInfoSection) userInfoSection.style.display = 'block';
        if (userOabDisplay) userOabDisplay.textContent = currentUser.oab || 'N/A';
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
                    console.log("[Script.js] Link 'Minhas Configurações' VISÍVEL para index.html.");
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
                console.log("[Script.js] Usuário é admin. Seções de Advogados e Clientes VISÍVEIS. Select de advogado HABILITADO.");
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
                console.log("[Script.js] Usuário NÃO é admin. Seções de Advogados e Clientes ESCONDIDAS. Select de advogado DESABILITADO e pré-selecionado.");
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
        const lawyersListDiv = document.getElementById('lawyers-list');
        lawyersListDiv.innerHTML = '';

        const isAdmin = currentUser && (currentUser.oab === "00001SP" || currentUser.username === "admin");

        lawyers.forEach(lawyer => {
            const escapedName = lawyer.name.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedOab = lawyer.oab.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedEmail = lawyer.email.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedTelegramId = (lawyer.telegram_id || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;");

            if (lawyer.oab === "00001SP" || lawyer.username === "admin") {
                return;
            }

            let adminButtons = '';
            if (isAdmin) {
                adminButtons += `<button class="btn btn-sm btn-outline-warning ms-2 btn-admin-reset-password" data-lawyer-id="${lawyer.id}" data-lawyer-name="${escapedName}" data-lawyer-oab="${escapedOab}">Redefinir Senha</button>`;
            }

            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';

            let deleteButtonHtml = `<button class="btn btn-sm btn-outline-danger btn-delete-lawyer delete-btn" data-id="${lawyer.id}">Excluir</button>`;
            // O admin principal (00001SP) já é filtrado acima, então não precisamos mais dessa condição aqui.

            li.innerHTML = `
                <div class="flex-grow-1">
                    <strong>${lawyer.name}</strong><br>
                    <small>OAB: ${lawyer.oab} | Email: ${lawyer.email} | Telegram: ${lawyer.telegram_id || 'N/A'}</small>
                </div>
                <div class="item-actions ms-3">
                    <button class="btn btn-sm btn-outline-primary btn-edit-lawyer" data-id="${lawyer.id}" data-name="${escapedName}" data-oab="${escapedOab}" data-email="${escapedEmail}" data-telegram="${escapedTelegramId}">Editar</button>
                    ${deleteButtonHtml}
                    ${adminButtons}
                </div>`;
            lawyersListDiv.appendChild(li);
        });
    } catch (error) { console.error('Falha ao buscar advogados:', error); if(document.getElementById('lawyers-list')) document.getElementById('lawyers-list').innerHTML = '<p>Erro ao carregar.</p>'; }
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
    if (!getToken() || !document.getElementById('clients-list')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/clients/`, { headers: getAuthHeaders() });
        if (response.status === 401) { logout(); return; }
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const clients = await response.json();
        const clientsListDiv = document.getElementById('clients-list');
        clientsListDiv.innerHTML = '';
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
        allLawyers.forEach(lawyer => {
            // Não adicionar o admin ao select de advogados responsáveis por processos
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
        processes.forEach(process => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex align-items-center';
            const escapedProcessNumber = process.process_number.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedStatus = process.status.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const escapedActionType = (process.action_type || '').replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            const dataConclusaoRealStr = process.data_conclusao_real ? formatDate(process.data_conclusao_real) : 'N/A';

            li.innerHTML = `
                <input type="checkbox" class="process-checkbox me-2" data-id="${process.id}" style="flex-shrink: 0;">
                <div class="flex-grow-1">
                    <strong>Nº: ${process.process_number}</strong> (Adv: ${lawyerMap[process.lawyer_id] || 'N/A'}, Cli: ${clientMap[process.client_id] || 'N/A'})<br>
                    <small>Status: ${process.status} | Prazo Fatal: ${formatDate(process.fatal_deadline)} | Conclusão: ${dataConclusaoRealStr} | Tipo: ${process.action_type || 'N/A'}</small>
                </div>
                <div class="item-actions ms-3" style="flex-shrink: 0;">
                    <button class="btn btn-sm btn-outline-primary btn-edit-process" data-id="${process.id}" data-number="${escapedProcessNumber}" data-lawyerid="${process.lawyer_id}" data-clientid="${process.client_id}" data-entrydate="${process.entry_date}" data-deliverydeadline="${process.delivery_deadline}" data-fataldeadline="${process.fatal_deadline}" data-status="${escapedStatus}" data-actiontype="${escapedActionType}" data-completiondate="${process.data_conclusao_real || ''}">Editar</button>
                    <button class="btn btn-sm btn-outline-danger btn-delete-process delete-btn" data-id="${process.id}">Excluir</button>
                </div>`;
            processesListDiv.appendChild(li);
        });
    } catch (error) { console.error('Falha ao buscar processos:', error); processesListDiv.innerHTML = '<p>Erro ao carregar.</p>'; }
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
        if (loginFormEl) { /* ... (lógica de login) ... */ }

    } else if (currentPagePath.includes('index.html') || currentPagePath.endsWith('/frontend/') || currentPagePath.endsWith('/')) {
        const logoutButtonEl = document.getElementById('logout-button'); // Este é o da seção user-info, não da navbar principal
        if(logoutButtonEl) {
            logoutButtonEl.addEventListener('click', () => { if (confirm("Tem certeza que deseja sair?")) logout(); });
        }
        const authSuccess = await fetchAndSetCurrentUser_forIndexPage();
        if (!authSuccess) return;

        // Advogados
        const lawyerFormEl = document.getElementById('lawyer-form');
        const lawyersListDivEl = document.getElementById('lawyers-list');
        const cancelLawyerUpdateBtnEl = document.getElementById('cancel-lawyer-update');
        if (lawyerFormEl) { /* ... (lógica form advogados) ... */ }
        if(lawyersListDivEl) { lawyersListDivEl.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('btn-edit-lawyer')) { /* ... */ }
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
        if(cancelLawyerUpdateBtnEl) { /* ... */ }
        initializeAdminResetPasswordModal();

        // Clientes
        const clientFormEl = document.getElementById('client-form');
        // ... (outros listeners de clientes e processos) ...
        if (clientFormEl) { /* ... (lógica form clientes) ... */ }
        // ...

        // Processos
        const processFormEl = document.getElementById('process-form');
        // ...
        if (processFormEl) { /* ... (lógica form processos) ... */ }
        // ...

        // Lógica de Busca ao Vivo
        setupLiveSearch('search-lawyers', '#lawyers-list .list-group-item');
        setupLiveSearch('search-clients', '#clients-list .list-group-item');
        setupLiveSearch('search-processes', '#processes-list .list-group-item');
        setupSearchIconClick('search-lawyers-icon', 'search-lawyers');
        setupSearchIconClick('search-clients-icon', 'search-clients');
        setupSearchIconClick('search-processes-icon', 'search-processes');

        const logoutButtonIndex = document.getElementById('logout-button-index');
        if (logoutButtonIndex) {
            logoutButtonIndex.addEventListener('click', () => { if (confirm('Tem certeza que deseja sair?')) logout(); });
        } else { console.warn("[Main App Debug] Botão logout-button-index não encontrado no index.html."); }
    }
    // A lógica de CRUD (add, edit, delete) para advogados, clientes, processos está simplificada aqui.
    // O código completo já existe e não precisa ser repetido.
});

// Funções CRUD (simplificado para brevidade, o código completo já existe)
async function deleteLawyer(id) { /* ... */ }
async function deleteClient(id) { /* ... */ }
async function deleteProcess(id) { /* ... */ }
async function handleDeleteSelectedProcesses() { /* ... */ }
// ... (outras funções de edição não mostradas por brevidade)

// Garantir que as funções de edição estejam globais se chamadas de `onclick` no HTML,
// mas a abordagem com delegação de evento é melhor e já está sendo usada para delete/reset.
// Se editLawyer, editClient, editProcess são chamadas de dentro da renderização do innerHTML,
// elas devem estar no escopo global ou serem anexadas via addEventListener.
// A prática atual é usar addEventListener na lista pai.

// Exemplo de como a função de edição de advogado (btn-edit-lawyer) é tratada no listener de lawyersListDivEl:
// ...
// if (target.classList.contains('btn-edit-lawyer')) {
//     document.getElementById('lawyer-id').value = target.dataset.id;
//     document.getElementById('lawyer-name').value = target.dataset.name;
//     document.getElementById('lawyer-oab').value = target.dataset.oab;
//     document.getElementById('lawyer-email').value = target.dataset.email;
//     document.getElementById('lawyer-telegram').value = target.dataset.telegram;
//     const cancelBtn = document.getElementById('cancel-lawyer-update');
//     if(cancelBtn) cancelBtn.style.display = 'inline-block';
//     document.getElementById('lawyer-name').focus();
// }
// ...
// Similar para editClient e editProcess.
