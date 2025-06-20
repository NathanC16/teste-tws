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
    const errorDiv = document.getElementById(`${fieldId}-error`); // Assumes error div ID is fieldId + '-error'
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
    const errorMessages = formElement.querySelectorAll('.invalid-feedback, .text-danger'); // Include general error divs
    errorMessages.forEach(errorDiv => { errorDiv.textContent = ''; errorDiv.style.display = 'none';});
}

// --- Funções Utilitárias ---
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(Date.UTC(year, month, day)); // Use UTC to avoid timezone issues with YYYY-MM-DD
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } else {
        console.warn(`Formato de data inesperado: ${dateString}.`);
        return 'Data Inválida';
    }
}

// --- Lógica de UI e Autenticação ---

// UI State for index.html (main app page)
function updateUIForIndexPage(isLoggedIn) {
    const mainContentSection = document.getElementById('main-content');
    const userInfoSection = document.getElementById('user-info-section');
    const userOabDisplay = document.getElementById('user-oab-display');
    // Lawyer CRUD elements (assuming they are part of mainContentSection)
    const lawyersListDiv = document.getElementById('lawyers-list');
    const clientsListDiv = document.getElementById('clients-list');
    const processesListDiv = document.getElementById('processes-list');


    if (isLoggedIn && currentUser) {
        if(mainContentSection) mainContentSection.style.display = 'block';
        if(userInfoSection) userInfoSection.style.display = 'block';
        if(userOabDisplay) userOabDisplay.textContent = currentUser.oab || 'N/A';
        // Lawyer management section is part of mainContentSection, so it's shown.
    } else {
        if(mainContentSection) mainContentSection.style.display = 'none';
        if(userInfoSection) userInfoSection.style.display = 'none';
        if (userOabDisplay) userOabDisplay.textContent = '';
        currentUser = null;
        if(lawyersListDiv) lawyersListDiv.innerHTML = '';
        if(clientsListDiv) clientsListDiv.innerHTML = '';
        if(processesListDiv) processesListDiv.innerHTML = '';
    }
}

async function fetchAndSetCurrentUser_forIndexPage() {
    const token = getToken();
    if (!token) {
        currentUser = null;
        updateUIForIndexPage(false);
        window.location.href = 'login.html'; // Redirect if no token
        return;
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
        } else if (response.status === 401) {
            console.error('Token inválido ou expirado. Redirecionando para login.');
            logout(); // This will remove token and redirect
        } else {
            console.error('Erro ao buscar dados do usuário:', response.status);
            currentUser = null;
            updateUIForIndexPage(false);
            window.location.href = 'login.html'; // Redirect on other errors
        }
    } catch (error) {
        console.error('Falha na requisição /users/me:', error);
        currentUser = null;
        updateUIForIndexPage(false);
        window.location.href = 'login.html'; // Redirect on fetch failure
    }
}

function logout() {
    removeToken();
    currentUser = null;
    // No need to call updateUIForIndexPage(false) here as we are redirecting
    window.location.href = 'login.html';
}

// --- Funções de Carregamento de Dados (for index.html) ---
// (fetchLawyers, loadAreasOfExpertise, fetchClients, populateLawyerOptions, populateClientOptions, fetchProcesses - assumed to be defined below and adapted to use getAuthHeaders)

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('login.html') || window.location.pathname.endsWith('/frontend/') || window.location.pathname.endsWith('/')) {
        // Logic for login.html
        const token = getToken();
        if (token) {
            // Simple check: if token exists, try to go to index.html
            // More robust: validate token with /users/me, then redirect.
            // For now, if a token exists, we assume it might be valid and redirect.
            // fetchAndSetCurrentUser_forIndexPage will validate it on index.html.
            window.location.href = 'index.html';
            return; // Stop further execution on login page if redirecting
        }

        const loginForm = document.getElementById('login-form');
        const loginOabInput = document.getElementById('login-oab');
        const loginPasswordInput = document.getElementById('login-password');
        const loginGeneralError = document.getElementById('login-general-error');


        if (loginForm) {
            loginForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                clearAllFormErrors(loginForm);
                const oab = loginOabInput.value.trim();
                const password = loginPasswordInput.value.trim();

                if (!oab || !password) {
                    if(loginGeneralError) { loginGeneralError.textContent = "OAB e Senha são obrigatórios."; loginGeneralError.style.display = 'block'; }
                    else { alert("OAB e Senha são obrigatórios."); }
                    return;
                }

                const formData = new URLSearchParams();
                formData.append('username', oab);
                formData.append('password', password);

                try {
                    const response = await fetch(`${API_BASE_URL}/auth/token`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        const detailError = errorData.detail || "Falha no login. Verifique OAB e senha.";
                        showFieldError('login-oab', detailError);
                        // showFieldError('login-password', " "); // Keep password field for re-entry attempt
                        if(loginGeneralError && detailError === "Falha no login. Verifique OAB e senha.") {
                             loginGeneralError.textContent = detailError; loginGeneralError.style.display = 'block';
                        }
                        loginPasswordInput.value = "";
                        throw new Error(`Login failed: ${detailError}`);
                    }

                    const data = await response.json();
                    saveToken(data.access_token);
                    window.location.href = 'index.html'; // Redirect to main app page
                } catch (error) {
                    console.error('Erro no login:', error);
                    if(loginGeneralError && !loginGeneralError.textContent) { // If no specific field error shown by detail
                        loginGeneralError.textContent = "Erro ao tentar fazer login. Tente novamente.";
                        loginGeneralError.style.display = 'block';
                    }
                }
            });
        }
    } else if (window.location.pathname.includes('index.html')) {
        // Logic for index.html (main app page)
        const mainContentSection = document.getElementById('main-content');
        const userInfoSection = document.getElementById('user-info-section');
        const userOabDisplay = document.getElementById('user-oab-display');
        const logoutButton = document.getElementById('logout-button');

        // Assign CRUD form/list elements (already defined globally earlier in the script)
        // Ensure event listeners for CRUD operations are set up here, within the index.html context

        if(logoutButton) {
            logoutButton.addEventListener('click', () => {
                if (confirm("Tem certeza que deseja sair?")) {
                   logout();
                }
            });
        }

        await fetchAndSetCurrentUser_forIndexPage();

        // Setup CRUD event listeners only for index.html
        // Advogados
        if (lawyerForm) {
            lawyerForm.addEventListener('submit', async (event) => {
                event.preventDefault(); clearAllFormErrors(lawyerForm);
                const id = lawyerIdInput.value;
                const telegramIdValue = lawyerTelegramInput.value.trim();
                if (telegramIdValue) {
                    const telegramRegex = /^@[a-zA-Z0-9_]{3,31}$/;
                    if (!telegramRegex.test(telegramIdValue)) { showFieldError('lawyer-telegram', "ID Telegram inválido. Ex: @usuario_123"); lawyerTelegramInput.focus(); return; }
                }
                let oabValue = document.getElementById('lawyer-oab').value.trim().toUpperCase(); // Use specific ID for lawyer OAB
                const oabPatternNumUf = /^\d{1,3}(\.?\d{3})?[A-Z]{2}$/; const oabPatternNumBarraUf = /^\d{1,6}\/[A-Z]{2}$/;
                if (!oabValue) { showFieldError('lawyer-oab', "OAB é obrigatório."); document.getElementById('lawyer-oab').focus(); return; }
                if (!(oabPatternNumUf.test(oabValue) || oabPatternNumBarraUf.test(oabValue))) { showFieldError('lawyer-oab', "Formato OAB inválido."); document.getElementById('lawyer-oab').focus(); return; }
                if (oabPatternNumUf.test(oabValue) && oabValue.includes('.')) oabValue = oabValue.replace('.', '');
                if (!lawyerNameInput.value.trim()) { showFieldError('lawyer-name', "Nome é obrigatório."); lawyerNameInput.focus(); return; }
                if (!lawyerEmailInput.value.trim()) { showFieldError('lawyer-email', "Email é obrigatório."); lawyerEmailInput.focus(); return; }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(lawyerEmailInput.value.trim())) { showFieldError('lawyer-email', "Email inválido."); lawyerEmailInput.focus(); return; }
                const lawyerData = { name: lawyerNameInput.value.trim(), oab: oabValue, email: lawyerEmailInput.value.trim(), telegram_id: telegramIdValue || null };
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
                    lawyerForm.reset(); clearAllFormErrors(lawyerForm); lawyerIdInput.value = ''; cancelLawyerUpdateBtn.style.display = 'none';
                    fetchLawyers(); alert(`Advogado ${id ? 'atualizado' : 'adicionado'}!`);
                } catch (e) { console.error('Falha ao salvar advogado:', e); if (!document.querySelector('#lawyer-form .is-invalid')) alert('Falha ao salvar advogado.');}
            });
        }
        if(document.getElementById('lawyers-list')) document.getElementById('lawyers-list').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('btn-edit-lawyer')) editLawyer(target.dataset.id, target.dataset.name, target.dataset.oab, target.dataset.email, target.dataset.telegram);
            else if (target.classList.contains('btn-delete-lawyer')) deleteLawyer(target.dataset.id);
        });
         if(cancelLawyerUpdateBtn) cancelLawyerUpdateBtn.addEventListener('click', () => {
            lawyerForm.reset(); clearAllFormErrors(lawyerForm); lawyerIdInput.value = ''; cancelLawyerUpdateBtn.style.display = 'none';
        });


        // Clientes
        if(clientForm) clientForm.addEventListener('submit', async (event) => {
            event.preventDefault(); clearAllFormErrors(clientForm);
            const id = clientIdInput.value; const clientNameValue = clientNameInput.value.trim(); const clientAreaValue = clientAreaOfExpertiseSelect.value;
            let hasError = false;
            if (!clientNameValue) { showFieldError('client-name', "Nome é obrigatório."); hasError = true; }
            if (!clientAreaValue) { showFieldError('clientAreaOfExpertiseSelect', "Área é obrigatória."); hasError = true; }
            if (hasError) { if (!clientNameValue) clientNameInput.focus(); else if (!clientAreaValue) clientAreaOfExpertiseSelect.focus(); return; }
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
                clientForm.reset(); clearAllFormErrors(clientForm); clientIdInput.value = ''; cancelClientUpdateBtn.style.display = 'none';
                fetchClients(); alert(`Cliente ${id ? 'atualizado' : 'adicionado'}!`);
            } catch (e) { console.error('Falha ao salvar cliente:', e); if (!document.querySelector('#client-form .is-invalid')) alert('Falha ao salvar cliente.');}
        });
         if(document.getElementById('clients-list')) document.getElementById('clients-list').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('btn-edit-client')) editClient(target.dataset.id, target.dataset.name, target.dataset.area);
            else if (target.classList.contains('btn-delete-client')) deleteClient(target.dataset.id);
        });
        if(cancelClientUpdateBtn) cancelClientUpdateBtn.addEventListener('click', () => {
            clientForm.reset(); clearAllFormErrors(clientForm); clientIdInput.value = ''; cancelClientUpdateBtn.style.display = 'none';
        });


        // Processos
         if (processForm) processForm.addEventListener('submit', async (event) => {
            event.preventDefault(); clearAllFormErrors(processForm);
            const id = processIdInput.value;
            const processNumberValue = processNumberInput.value.trim(); const lawyerIdValue = processLawyerSelect.value; const clientIdValue = processClientSelect.value;
            const entryDateValue = processEntryDateInput.value; const deliveryDeadlineValue = processDeliveryDeadlineInput.value; const fatalDeadlineValue = processFatalDeadlineInput.value;
            const statusValue = processStatusInput.value.trim(); let hasError = false;
            if (!processNumberValue) { showFieldError('process-number', "Número é obrigatório."); hasError = true; }
            if (!lawyerIdValue) { showFieldError('process-lawyer', "Advogado é obrigatório."); if(!hasError)processLawyerSelect.focus(); hasError = true; }
            if (!clientIdValue) { showFieldError('process-client', "Cliente é obrigatório."); if(!hasError)processClientSelect.focus(); hasError = true; }
            if (!entryDateValue) { showFieldError('process-entry-date', "Data de Entrada é obrigatória."); if(!hasError)processEntryDateInput.focus(); hasError = true; }
            if (!deliveryDeadlineValue) { showFieldError('process-delivery-deadline', "Prazo de Entrega é obrigatório."); if(!hasError)processDeliveryDeadlineInput.focus(); hasError = true; }
            if (!fatalDeadlineValue) { showFieldError('process-fatal-deadline', "Prazo Fatal é obrigatório."); if(!hasError)processFatalDeadlineInput.focus(); hasError = true; }
            if (!statusValue) { showFieldError('process-status', "Status é obrigatório."); if(!hasError)processStatusInput.focus(); hasError = true; }
            if (entryDateValue && deliveryDeadlineValue && new Date(deliveryDeadlineValue) < new Date(entryDateValue)) { showFieldError('process-delivery-deadline', "Prazo Entrega >= Data Entrada."); if(!hasError)processDeliveryDeadlineInput.focus(); hasError = true; }
            if (deliveryDeadlineValue && fatalDeadlineValue && new Date(fatalDeadlineValue) < new Date(deliveryDeadlineValue)) { showFieldError('process-fatal-deadline', "Prazo Fatal >= Prazo Entrega."); if(!hasError)processFatalDeadlineInput.focus(); hasError = true; }
            if (hasError) return;
            const processData = { process_number: processNumberValue, lawyer_id: parseInt(lawyerIdValue), client_id: parseInt(clientIdValue), entry_date: entryDateValue, delivery_deadline: deliveryDeadlineValue, fatal_deadline: fatalDeadlineValue, status: statusValue, action_type: processActionTypeInput.value.trim() || null };
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
                processForm.reset(); clearAllFormErrors(processForm); processIdInput.value = ''; cancelProcessUpdateBtn.style.display = 'none';
                fetchProcesses(); alert(`Processo ${id ? 'atualizado' : 'adicionado'}!`);
            } catch (e) { console.error('Falha ao salvar processo:', e); if (!document.querySelector('#process-form .is-invalid')) alert('Falha ao salvar processo.');}
        });
        if(document.getElementById('processes-list')) document.getElementById('processes-list').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('btn-edit-process')) editProcess(target.dataset.id, target.dataset.number, target.dataset.lawyerid, target.dataset.clientid, target.dataset.entrydate, target.dataset.deliverydeadline, target.dataset.fataldeadline, target.dataset.status, target.dataset.actiontype);
            else if (target.classList.contains('btn-delete-process')) deleteProcess(target.dataset.id);
        });
        if(cancelProcessUpdateBtn) cancelProcessUpdateBtn.addEventListener('click', () => {
            processForm.reset(); clearAllFormErrors(processForm); processIdInput.value = ''; cancelProcessUpdateBtn.style.display = 'none';
        });
        if (deleteSelectedProcessesBtn) {
            deleteSelectedProcessesBtn.addEventListener('click', handleDeleteSelectedProcesses);
        }
    }
});

// Helper functions for editing/deleting (already defined above, just ensure they are accessible)
// function editLawyer(...){...}
// async function deleteLawyer(...){...}
// function editClient(...){...}
// async function deleteClient(...){...}
// function editProcess(...){...}
// async function deleteProcess(...){...}
// async function handleDeleteSelectedProcesses(...){...}
