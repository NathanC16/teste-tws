// user_settings.js
const API_BASE_URL_USER_SETTINGS = ''; // Usar caminhos relativos
let currentUserForSettingsPage = null;

// Funções de token e headers
function userSettingsGetToken() { return localStorage.getItem('authToken'); }
function userSettingsRemoveToken() { localStorage.removeItem('authToken'); }
function userSettingsGetAuthHeaders(isFormData = false) {
    const token = userSettingsGetToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';
    return headers;
}
function userSettingsLogout() {
    userSettingsRemoveToken();
    currentUserForSettingsPage = null;
    window.location.href = 'login.html';
}

// Função para popular os campos da página com os dados do usuário
function populateUserSettingsData() {
    if (!currentUserForSettingsPage) {
        console.warn("[UserSettings] Tentativa de popular dados sem usuário carregado.");
        return;
    }

    // Campos de display (não editáveis diretamente aqui, exceto nome)
    const userNameInput = document.getElementById('user-name'); // Agora é um input
    const userUsernameDisplay = document.getElementById('user-username-display');
    const userOabDisplay = document.getElementById('user-oab-display');

    // Campos de formulário editáveis
    const emailInput = document.getElementById('user-email');
    const telegramInput = document.getElementById('user-telegram');

    if (userNameInput) userNameInput.value = currentUserForSettingsPage.name || ''; // Popular input de nome
    if (userUsernameDisplay) userUsernameDisplay.textContent = currentUserForSettingsPage.username || '-';
    if (userOabDisplay) userOabDisplay.textContent = currentUserForSettingsPage.oab || '-';
    if (emailInput) emailInput.value = currentUserForSettingsPage.email || '';
    if (telegramInput) telegramInput.value = currentUserForSettingsPage.telegram_id || '';

    // Garantir que o link "Minhas Configurações" na navbar desta página esteja ativo
    const userSettingsNavItem = document.getElementById('user-settings-nav-item');
    if (userSettingsNavItem) {
        // userSettingsNavItem.style.display = 'list-item'; // Já deve estar visível pelo HTML
        const navLink = userSettingsNavItem.querySelector('.nav-link');
        if (navLink) {
            navLink.classList.add('active');
            navLink.setAttribute('aria-current', 'page');
        }

        // Desativar o link "active" de outros itens da navbar se houver
        const parentNav = userSettingsNavItem.closest('.navbar-nav');
        if (parentNav) {
            const otherLinks = parentNav.querySelectorAll('li:not(#user-settings-nav-item) .nav-link.active');
            otherLinks.forEach(link => {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            });
        }
    } else {
        console.warn("[UserSettings] Elemento da navbar 'user-settings-nav-item' não encontrado.");
    }
}

async function initializeUserSettingsPage() {
    console.log("[UserSettings] Inicializando página de configurações do usuário...");
    const token = userSettingsGetToken();
    if (!token) {
        console.log("[UserSettings] Nenhum token. Redirecionando para login.");
        userSettingsLogout(); // Redireciona para login
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL_USER_SETTINGS}/auth/users/me`, { headers: userSettingsGetAuthHeaders() });
        if (response.ok) {
            currentUserForSettingsPage = await response.json();
            console.log("[UserSettings] Dados do usuário:", currentUserForSettingsPage);

            // Não há mais verificação de admin aqui, qualquer usuário logado pode ver seus dados
            if (!currentUserForSettingsPage) {
                 // Isso não deveria acontecer se o token for válido e /auth/users/me funcionar
                alert("Erro ao carregar dados do usuário.");
                userSettingsLogout();
                return;
            }
            populateUserSettingsData();
        } else {
            console.error("[UserSettings] Token inválido ou erro ao buscar usuário. Status:", response.status);
            userSettingsLogout();
            return;
        }
    } catch (error) {
        console.error('[UserSettings] Erro crítico ao buscar dados do usuário:', error);
        userSettingsLogout();
        return;
    }

    // Adicionar listener para o botão de logout da página
    const logoutButton = document.getElementById('logout-button-user-settings'); // ID Atualizado
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja sair?')) {
                userSettingsLogout();
            }
        });
    } else {
        console.warn("[UserSettings] Botão de logout 'logout-button-user-settings' não encontrado.");
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
    console.log("[UserSettings] Tentando atualizar perfil/contato...");
    const nameInput = document.getElementById('user-name'); // Novo campo nome
    const emailInput = document.getElementById('user-email');
    const telegramInput = document.getElementById('user-telegram');
    // O ID da div de feedback no HTML é 'update-profile-feedback'
    const feedbackDivId = 'update-profile-feedback';

    clearFieldError('user-name'); // Limpar erro do nome
    clearFieldError('user-email');
    clearFieldError('user-telegram');
    const feedbackElement = document.getElementById(feedbackDivId);
    if(feedbackElement) feedbackElement.style.display = 'none';

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    let telegramId = telegramInput.value.trim();

    if (!name) { // Validação do nome
        showFieldError('user-name', "Nome é obrigatório.");
        return;
    }
    if (!email) {
        showFieldError('user-email', "Email é obrigatório.");
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showFieldError('user-email', "Formato de email inválido.");
        return;
    }
    if (telegramId && !(/^(@[a-zA-Z0-9_]{3,31}|-?\d+)$/.test(telegramId))) {
        showFieldError('user-telegram', "ID do Telegram inválido. Use @username ou ID numérico.");
        return;
    }
    if (telegramId === "") telegramId = null;

    const payload = { name: name, email: email };
    // Adiciona telegram_id apenas se foi alterado em relação ao valor atual
    if (telegramId !== currentUserForSettingsPage.telegram_id) {
        payload.telegram_id = telegramId;
    }
    // Se o campo não foi alterado, não precisa enviar no payload para telegram_id
    // (o backend já trata Optional). Mas para garantir que o None seja enviado se limpo:
    if (telegramId === null && currentUserForSettingsPage.telegram_id !== null) {
         payload.telegram_id = null; // Garante que a limpeza seja enviada
    }


    try {
        const response = await fetch(`${API_BASE_URL_USER_SETTINGS}/auth/users/me/settings`, {
            method: 'PUT',
            headers: adminSettingsGetAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();
        if (response.ok) {
            currentUserForSettingsPage = responseData; // Atualiza o usuário local
            populateUserSettingsData(); // Repopula os campos com dados atualizados
            displayFormFeedback('update-profile-form', "Perfil atualizado com sucesso!", false); // ID do formulário corrigido
        } else {
            console.error("[UserSettings] Erro ao atualizar perfil:", responseData);
            let errorMessage = responseData.detail || "Erro desconhecido ao atualizar perfil.";
            // Tentar direcionar o erro para o campo correto se possível
            if (typeof responseData.detail === 'string') {
                if (responseData.detail.toLowerCase().includes("nome")) {
                    showFieldError('user-name', responseData.detail);
                } else if (responseData.detail.toLowerCase().includes("email")) {
                    showFieldError('user-email', responseData.detail);
                } else if (responseData.detail.toLowerCase().includes("telegram")) {
                    showFieldError('user-telegram', responseData.detail);
                }
            }
            displayFormFeedback('update-profile-form', errorMessage, true); // ID do formulário corrigido
        }
    } catch (error) {
        console.error('[UserSettings] Exceção ao atualizar perfil:', error);
        displayFormFeedback('update-profile-form', "Erro de rede ou servidor ao atualizar perfil.", true);  // ID do formulário corrigido
    }
}

async function handleUpdatePassword(event) {
    event.preventDefault();
    console.log("[UserSettings] Tentando atualizar senha...");
    const currentPasswordEl = document.getElementById('user-current-password'); // ID Atualizado
    const newPasswordEl = document.getElementById('user-new-password');       // ID Atualizado
    const confirmPasswordEl = document.getElementById('user-confirm-password'); // ID Atualizado
    const feedbackDivId = 'update-password-feedback'; // ID da div de feedback para este form

    clearFieldError('user-current-password'); // ID Atualizado
    clearFieldError('user-new-password');     // ID Atualizado
    clearFieldError('user-confirm-password'); // ID Atualizado
    const feedbackElement = document.getElementById(feedbackDivId);
    if(feedbackElement) feedbackElement.style.display = 'none';

    const currentPassword = currentPasswordEl.value;
    const newPassword = newPasswordEl.value;
    const confirmPassword = confirmPasswordEl.value;

    let hasError = false;
    if (!currentPassword) { showFieldError('user-current-password', "Senha atual é obrigatória."); hasError = true; }
    if (!newPassword) { showFieldError('user-new-password', "Nova senha é obrigatória."); hasError = true; }
    else if (newPassword.length < 6) { showFieldError('user-new-password', "Nova senha deve ter pelo menos 6 caracteres."); hasError = true; }
    if (!confirmPassword) { showFieldError('user-confirm-password', "Confirmação da nova senha é obrigatória."); hasError = true; }
    else if (newPassword && newPassword !== confirmPassword) { showFieldError('user-confirm-password', "As novas senhas não coincidem."); hasError = true; }
    if (newPassword && newPassword === currentPassword) { showFieldError('user-new-password', "Nova senha não pode ser igual à senha atual."); hasError = true; }

    if (hasError) return;

    const payload = {
        current_password: currentPassword,
        new_password: newPassword
    };

    try {
        const response = await fetch(`${API_BASE_URL_USER_SETTINGS}/auth/users/me/settings`, {
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
