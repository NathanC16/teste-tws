// admin_settings.js
const API_BASE_URL_ADMIN_SETTINGS = ''; // Usar caminhos relativos
let adminSettingsCurrentUser = null; // Renomeado para evitar conflito se script.js for carregado

// Funções de token e headers (podem ser importadas de um utilitário comum no futuro se refatorado)
function adminSettingsGetToken() { return localStorage.getItem('authToken'); }
function adminSettingsRemoveToken() { localStorage.removeItem('authToken'); }
function adminSettingsGetAuthHeaders(isFormData = false) {
    const token = adminSettingsGetToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';
    return headers;
}
function adminSettingsLogout() {
    adminSettingsRemoveToken();
    adminSettingsCurrentUser = null;
    window.location.href = 'login.html';
}

// Função para popular os campos da página com os dados do admin
function populateAdminSettingsData() {
    if (!adminSettingsCurrentUser) {
        console.warn("[AdminSettings] Tentativa de popular dados sem usuário admin carregado.");
        return;
    }

    const adminNameDisplay = document.getElementById('admin-name-display');
    const adminUsernameDisplay = document.getElementById('admin-username-display');
    const adminOabDisplay = document.getElementById('admin-oab-display');
    const emailInput = document.getElementById('admin-email');
    const telegramInput = document.getElementById('admin-telegram');

    if (adminNameDisplay) adminNameDisplay.textContent = adminSettingsCurrentUser.name || '-';
    if (adminUsernameDisplay) adminUsernameDisplay.textContent = adminSettingsCurrentUser.username || '-';
    if (adminOabDisplay) adminOabDisplay.textContent = adminSettingsCurrentUser.oab || '-';
    if (emailInput) emailInput.value = adminSettingsCurrentUser.email || '';
    if (telegramInput) telegramInput.value = adminSettingsCurrentUser.telegram_id || '';

    // Mostrar o link "Config. Admin" na navbar desta página também, e marcá-lo como ativo
    const adminSettingsNavItem = document.getElementById('admin-settings-nav-item');
    if (adminSettingsNavItem) {
        adminSettingsNavItem.style.display = 'list-item'; // 'list-item' para <li>
        const navLink = adminSettingsNavItem.querySelector('.nav-link');
        if (navLink) navLink.classList.add('active');

        // Desativar o link "active" de outros itens da navbar se houver
        const otherLinks = adminSettingsNavItem.parentElement.querySelectorAll('li:not(#admin-settings-nav-item) .nav-link.active');
        otherLinks.forEach(link => link.classList.remove('active'));

    } else {
        console.warn("[AdminSettings] Elemento da navbar 'admin-settings-nav-item' não encontrado.");
    }
}

async function initializeAdminSettingsPage() {
    console.log("[AdminSettings] Inicializando página de configurações do admin...");
    const token = adminSettingsGetToken();
    if (!token) {
        console.log("[AdminSettings] Nenhum token. Redirecionando para login.");
        adminSettingsLogout(); // Redireciona para login
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL_ADMIN_SETTINGS}/auth/users/me`, { headers: adminSettingsGetAuthHeaders() });
        if (response.ok) {
            adminSettingsCurrentUser = await response.json();
            console.log("[AdminSettings] Dados do usuário:", adminSettingsCurrentUser);

            if (!adminSettingsCurrentUser || (adminSettingsCurrentUser.oab !== "00001SP" && adminSettingsCurrentUser.username !== "admin")) {
                alert("Acesso negado. Esta página é reservada para administradores.");
                window.location.href = 'dashboard.html'; // Redireciona não-admins para o dashboard
                return;
            }
            populateAdminSettingsData();
        } else {
            console.error("[AdminSettings] Token inválido ou erro ao buscar usuário. Status:", response.status);
            adminSettingsLogout();
            return;
        }
    } catch (error) {
        console.error('[AdminSettings] Erro crítico ao buscar dados do admin:', error);
        adminSettingsLogout();
        return;
    }

    // Adicionar listener para o botão de logout da página
    const logoutButton = document.getElementById('logout-button-admin-settings');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja sair?')) {
                adminSettingsLogout();
            }
        });
    } else {
        console.warn("[AdminSettings] Botão de logout 'logout-button-admin-settings' não encontrado.");
    }

    // Listeners para os formulários
    const updateContactForm = document.getElementById('update-contact-form');
    if (updateContactForm) {
        updateContactForm.addEventListener('submit', handleUpdateContact);
    } else {
        console.warn("[AdminSettings] Formulário 'update-contact-form' não encontrado.");
    }

    const updatePasswordForm = document.getElementById('update-password-form');
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', handleUpdatePassword);
    } else {
        console.warn("[AdminSettings] Formulário 'update-password-form' não encontrado.");
    }
    console.log("[AdminSettings] Página inicializada, dados populados (se admin) e listeners de formulário configurados.");
}

// --- Funções de Feedback ---
function showFieldError(elementId, message, errorSuffix = '-error') {
    const field = document.getElementById(elementId);
    const errorDiv = document.getElementById(`${elementId}${errorSuffix}`); // Consistente com o HTML
    if (field) field.classList.add('is-invalid');
    if (errorDiv) { errorDiv.textContent = message; errorDiv.style.display = 'block'; }
}

function clearFieldError(elementId, errorSuffix = '-error') {
    const field = document.getElementById(elementId);
    const errorDiv = document.getElementById(`${elementId}${errorSuffix}`);
    if (field) field.classList.remove('is-invalid');
    if (errorDiv) { errorDiv.textContent = ''; errorDiv.style.display = 'none'; }
}

function displayFormFeedback(formElementId, message, isError = true) {
    const feedbackDivId = `${formElementId.replace('-form', '')}-feedback`; // ex: update-contact-feedback
    const feedbackDiv = document.getElementById(feedbackDivId);
    if (feedbackDiv) {
        feedbackDiv.textContent = message;
        feedbackDiv.className = `mt-2 alert ${isError ? 'alert-danger' : 'alert-success'}`;
        feedbackDiv.style.display = 'block';
        // Limpar após alguns segundos
        setTimeout(() => {
            feedbackDiv.textContent = '';
            feedbackDiv.style.display = 'none';
        }, 5000);
    } else {
        console.warn(`[AdminSettings] Div de feedback '${feedbackDivId}' não encontrado.`);
        alert(message); // Fallback para alert
    }
}


// --- Manipuladores de Formulário ---
async function handleUpdateContact(event) {
    event.preventDefault();
    console.log("[AdminSettings] Tentando atualizar contato...");
    const emailInput = document.getElementById('admin-email');
    const telegramInput = document.getElementById('admin-telegram');
    const feedbackDivId = 'update-contact-feedback'; // ID da div de feedback para este form

    clearFieldError('admin-email');
    clearFieldError('admin-telegram');
    document.getElementById(feedbackDivId).style.display = 'none';


    const email = emailInput.value.trim();
    let telegramId = telegramInput.value.trim();

    if (!email) {
        showFieldError('admin-email', "Email é obrigatório.");
        return;
    }
    // Validação de formato de email básica (mais robusta no backend)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showFieldError('admin-email', "Formato de email inválido.");
        return;
    }

    if (telegramId && !(/^(@[a-zA-Z0-9_]{3,31}|-?\d+)$/.test(telegramId))) {
        showFieldError('admin-telegram', "ID do Telegram inválido. Use @username ou ID numérico.");
        return;
    }
    if (telegramId === "") telegramId = null; // Enviar null se o campo for limpo

    const payload = { email: email };
    // Adiciona telegram_id ao payload apenas se foi modificado ou limpo
    // para evitar enviar null desnecessariamente se não mudou de um valor já null.
    if (telegramId !== adminSettingsCurrentUser.telegram_id) {
        payload.telegram_id = telegramId;
    }


    try {
        const response = await fetch(`${API_BASE_URL_ADMIN_SETTINGS}/auth/users/me/settings`, {
            method: 'PUT',
            headers: adminSettingsGetAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();
        if (response.ok) {
            adminSettingsCurrentUser = responseData; // Atualiza o usuário local
            populateAdminSettingsData(); // Repopula os campos com dados atualizados
            displayFormFeedback('update-contact-form', "Contato atualizado com sucesso!", false);
        } else {
            console.error("[AdminSettings] Erro ao atualizar contato:", responseData);
            let errorMessage = responseData.detail || "Erro desconhecido ao atualizar contato.";
            if (responseData.detail && typeof responseData.detail === 'string' && responseData.detail.includes("email")) {
                 showFieldError('admin-email', responseData.detail);
            } else if (responseData.detail && typeof responseData.detail === 'string' && responseData.detail.includes("Telegram")) {
                 showFieldError('admin-telegram', responseData.detail);
            }
            displayFormFeedback('update-contact-form', errorMessage, true);
        }
    } catch (error) {
        console.error('[AdminSettings] Exceção ao atualizar contato:', error);
        displayFormFeedback('update-contact-form', "Erro de rede ou servidor ao atualizar contato.", true);
    }
}

async function handleUpdatePassword(event) {
    event.preventDefault();
    console.log("[AdminSettings] Tentando atualizar senha...");
    const currentPasswordEl = document.getElementById('admin-current-password');
    const newPasswordEl = document.getElementById('admin-new-password');
    const confirmPasswordEl = document.getElementById('admin-confirm-password');
    const feedbackDivId = 'update-password-feedback';

    clearFieldError('admin-current-password');
    clearFieldError('admin-new-password');
    clearFieldError('admin-confirm-password');
    document.getElementById(feedbackDivId).style.display = 'none';

    const currentPassword = currentPasswordEl.value;
    const newPassword = newPasswordEl.value;
    const confirmPassword = confirmPasswordEl.value;

    let hasError = false;
    if (!currentPassword) { showFieldError('admin-current-password', "Senha atual é obrigatória."); hasError = true; }
    if (!newPassword) { showFieldError('admin-new-password', "Nova senha é obrigatória."); hasError = true; }
    else if (newPassword.length < 6) { showFieldError('admin-new-password', "Nova senha deve ter pelo menos 6 caracteres."); hasError = true; }
    if (!confirmPassword) { showFieldError('admin-confirm-password', "Confirmação da nova senha é obrigatória."); hasError = true; }
    else if (newPassword && newPassword !== confirmPassword) { showFieldError('admin-confirm-password', "As novas senhas não coincidem."); hasError = true; }
    if (newPassword && newPassword === currentPassword) { showFieldError('admin-new-password', "Nova senha não pode ser igual à senha atual."); hasError = true; }

    if (hasError) return;

    const payload = {
        current_password: currentPassword,
        new_password: newPassword
    };

    try {
        const response = await fetch(`${API_BASE_URL_ADMIN_SETTINGS}/auth/users/me/settings`, {
            method: 'PUT',
            headers: adminSettingsGetAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const responseData = await response.json();
        if (response.ok) {
            displayFormFeedback('update-password-form',"Senha alterada com sucesso! Você será desconectado.", false);
            // Limpar campos de senha após sucesso
            currentPasswordEl.value = '';
            newPasswordEl.value = '';
            confirmPasswordEl.value = '';
            setTimeout(() => {
                adminSettingsLogout(); // Força logout e redireciona para login
            }, 3000);
        } else {
            console.error("[AdminSettings] Erro ao atualizar senha:", responseData);
            let errorMessage = responseData.detail || "Erro desconhecido ao atualizar senha.";
             if (responseData.detail && typeof responseData.detail === 'string' && responseData.detail.toLowerCase().includes("senha atual incorreta")) {
                 showFieldError('admin-current-password', responseData.detail);
            } else if (responseData.detail && typeof responseData.detail === 'string' && responseData.detail.toLowerCase().includes("nova senha")) {
                 showFieldError('admin-new-password', responseData.detail);
            }
            displayFormFeedback('update-password-form', errorMessage, true);
        }
    } catch (error) {
        console.error('[AdminSettings] Exceção ao atualizar senha:', error);
        displayFormFeedback('update-password-form', "Erro de rede ou servidor ao atualizar senha.", true);
    }
}


document.addEventListener('DOMContentLoaded', initializeAdminSettingsPage);
