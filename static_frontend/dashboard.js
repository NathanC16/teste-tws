const API_BASE_URL = ''; // Usaremos caminhos relativos para a API

// Registrar o plugin datalabels globalmente para todos os gráficos
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
} else {
    console.error('[Dashboard Debug] chartjs-plugin-datalabels não foi carregado corretamente.');
}

// --- Token Management & Auth Header (Adaptado de script.js) ---
function saveToken(token) { // Provavelmente não usada diretamente no dashboard.js
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
function logout() {
    removeToken();
    console.log("[Dashboard Debug] Logout chamado. Token removido. Redirecionando para login.html.");
    window.location.href = 'login.html'; // Redirecionamento imediato
}

// --- Elementos do DOM ---
// Cards de Resumo
const totalActiveProcessesEl = document.getElementById('total-active-processes');
const processesNearDeadlineEl = document.getElementById('processes-near-deadline');
const totalLawyersEl = document.getElementById('total-lawyers');
const totalClientsEl = document.getElementById('total-clients');

// Alertas de Prazos
const deadlineAlertsListEl = document.getElementById('deadline-alerts-list');

// Tabela de Processos
const processesTableBodyEl = document.getElementById('processes-table-body');

// Selects para Filtros (serão usados depois, mas bom ter a referência)
const filterStatusEl = document.getElementById('filter-status');
const filterLawyerEl = document.getElementById('filter-lawyer');
const filterClientEl = document.getElementById('filter-client');
const filterFatalDeadlineDeEl = document.getElementById('filter-fatal-deadline-de'); // Novo
const filterFatalDeadlineAteEl = document.getElementById('filter-fatal-deadline-ate'); // Novo
const applyFiltersBtn = document.getElementById('apply-filters-btn');

// Canvas para Gráficos
const statusChartCanvas = document.getElementById('status-chart');
const lawyerChartCanvas = document.getElementById('lawyer-chart');
const actionTypeChartCanvas = document.getElementById('action-type-chart');


// --- Estado da Aplicação (Armazenar dados buscados) ---
let allProcesses = [];
let allLawyers = [];
let allClients = [];
const lawyerMap = {}; // Para mapear ID -> Nome
const clientMap = {}; // Para mapear ID -> Nome

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
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); // Adicionado timeZone: 'UTC' para consistência
                                                                    // na formatação, já que a data foi criada
                                                                    // com componentes que implicitamente são locais
                                                                    // mas representam uma data "pura" sem hora.
                                                                    // Ou, se quiser forçar o fuso do usuário, pode omitir timeZone.
                                                                    // Para datas "puras" (sem hora), 'UTC' na formatação
                                                                    // garante que a data não "pule" por causa do fuso do navegador.
    } else {
        // Se a string de data não estiver no formato esperado, retorna a string original ou um aviso.
        // Ou tenta uma conversão direta, mas pode ser arriscado.
        console.warn(`Formato de data inesperado: ${dateString}. Tentando conversão direta.`);
        const date = new Date(dateString); // Tentativa de fallback
        // Verifica se a data é válida após a tentativa de fallback
        if (isNaN(date.getTime())) {
            return 'Data Inválida';
        }
        return date.toLocaleDateString('pt-BR'); // Formatação padrão se o fallback funcionar
    }
}

// Função para converter data de "dd/mm/aaaa" para "yyyy-mm-dd" (ISO)
// Retorna null se o formato for inválido ou a data não for válida.
function parseDisplayDateToISO(dateString_ddmmyyyy) {
    if (!dateString_ddmmyyyy || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateString_ddmmyyyy)) {
        return null;
    }
    const parts = dateString_ddmmyyyy.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexado em JavaScript
        const year = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        // Verifica se o JS Date object corresponde aos componentes (evita datas como 31/02)
        if (dateObj.getFullYear() === year && dateObj.getMonth() === month && dateObj.getDate() === day) {
            // Retorna no formato YYYY-MM-DD
            return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }
    return null; // Formato inválido ou data inválida
}

// Funções de feedback de validação para o dashboard (semelhantes às de script.js)
// Usam um sufixo de ID de erro para maior flexibilidade, embora o padrão seja '-error'
function showFieldErrorDashboard(fieldId, message, errorSuffix = '-error') {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}${errorSuffix}`);
    if (field) field.classList.add('is-invalid');
    if (errorDiv) { errorDiv.textContent = message; errorDiv.style.display = 'block'; }
}

function clearFieldErrorDashboard(fieldId, errorSuffix = '-error') {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}${errorSuffix}`);
    if (field) field.classList.remove('is-invalid');
    if (errorDiv) { errorDiv.textContent = ''; errorDiv.style.display = 'none'; }
}

// --- Funções de Busca de Dados ---
async function fetchData(url) {
    console.log(`[Dashboard Debug] Tentando buscar dados de: ${url}`);
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, { headers: getAuthHeaders() }); // Adicionado headers
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.error(`[Dashboard Debug] Erro ${response.status} (Autenticação/Autorização) ao buscar ${url}.`);
                // Não chamar logout() diretamente aqui para evitar múltiplos alertas/redirecionamentos.
                // O erro será lançado e tratado no chamador (ex: fetchAllData).
            }
            throw new Error(`Erro HTTP: ${response.status} ao buscar ${url}`);
        }
        const data = await response.json();
        console.log(`[Dashboard Debug] Dados recebidos com sucesso de ${url}:`, data);
        return data;
    } catch (error) {
        console.error(`[Dashboard Debug] Erro final em fetchData para ${url}:`, error);
        // Relançar o erro para que possa ser tratado por quem chamou, especialmente se for um erro de autenticação.
        throw error;
    }
}

async function fetchAllData() {
    console.log('[Dashboard Debug] Iniciando fetchAllData...');
    try {
        const processesPromise = fetchData('/processes/');
        const lawyersPromise = fetchData('/lawyers/');
        const clientsPromise = fetchData('/clients/');

        // Espera todas as promises resolverem
        [allProcesses, allLawyers, allClients] = await Promise.all([processesPromise, lawyersPromise, clientsPromise]);
        console.log('[Dashboard Debug] Dados brutos recebidos de Promise.all:', { processes: allProcesses, lawyers: allLawyers, clients: allClients });
    } catch (error) {
        console.error('[Dashboard Debug] Erro durante Promise.all em fetchAllData. Provável erro de autenticação ou rede.', error);
        logout(); // Se qualquer uma das chamadas principais falhar (ex: 401), faz logout.
        return; // Interrompe a execução adicional de fetchAllData
    }

    // Criar mapas para fácil acesso a nomes
    allLawyers.forEach(lawyer => lawyerMap[lawyer.id] = lawyer.name);
    allClients.forEach(client => clientMap[client.id] = client.name);
    console.log('[Dashboard Debug] Mapas populados:', { lawyerMap, clientMap });

    // Popular selects de advogados e clientes para filtros
    populateFilterOptions(filterLawyerEl, allLawyers, 'Todos os Advogados');
    populateFilterOptions(filterClientEl, allClients, 'Todos os Clientes');

    // Após buscar todos os dados, renderiza os componentes do dashboard
    console.log('[Dashboard Debug] Chamando renderSummaryCards...');
    renderSummaryCards();
    console.log('[Dashboard Debug] Chamando renderProcessTable com processos:', allProcesses);
    renderProcessTable(allProcesses); // Renderiza a tabela com todos os processos inicialmente
    console.log('[Dashboard Debug] Chamando renderDeadlineAlerts...');
    renderDeadlineAlerts();
    console.log('[Dashboard Debug] Chamando renderCharts...');
    renderCharts();
    console.log('[Dashboard Debug] fetchAllData concluído.');
}

function populateFilterOptions(selectElement, items, defaultOptionText) {
    selectElement.innerHTML = `<option selected value="">${defaultOptionText}</option>`;
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        selectElement.appendChild(option);
    });
}


// --- Funções de Renderização ---

function renderSummaryCards() {
    console.log('[Dashboard Debug] Iniciando renderSummaryCards...');
    const activeProcesses = allProcesses.filter(p => p.status && p.status.toLowerCase() === 'ativo').length;
    totalActiveProcessesEl.textContent = activeProcesses;

    const today = new Date();
    today.setHours(0,0,0,0); // Normalizar para o início do dia
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const nearDeadlineCount = allProcesses.filter(p => {
        if (!p.fatal_deadline) return false;
        const deadlineDate = new Date(p.fatal_deadline);
        deadlineDate.setDate(deadlineDate.getDate() + 1); // Ajuste de timezone/UTC
        deadlineDate.setHours(0,0,0,0);
        return deadlineDate >= today && deadlineDate <= sevenDaysFromNow;
    }).length;
    processesNearDeadlineEl.textContent = nearDeadlineCount;

    totalLawyersEl.textContent = allLawyers.length;
    totalClientsEl.textContent = allClients.length;
}

function renderProcessTable(processesToRender) {
    console.log('[Dashboard Debug] Iniciando renderProcessTable...');
    processesTableBodyEl.innerHTML = ''; // Limpar tabela

    if (processesToRender.length === 0) {
        processesTableBodyEl.innerHTML = '<tr><td colspan="8" class="text-center">Nenhum processo encontrado.</td></tr>';
        return;
    }

    processesToRender.forEach(process => {
        const row = processesTableBodyEl.insertRow();
        row.insertCell().textContent = process.process_number || 'N/A';
        row.insertCell().textContent = clientMap[process.client_id] || 'N/A';
        row.insertCell().textContent = lawyerMap[process.lawyer_id] || 'N/A';
        row.insertCell().textContent = formatDate(process.entry_date);
        row.insertCell().textContent = formatDate(process.delivery_deadline);
        row.insertCell().textContent = formatDate(process.fatal_deadline);
        row.insertCell().textContent = process.status || 'N/A';
        row.insertCell().textContent = process.action_type || 'N/A';
    });
}

function renderDeadlineAlerts() {
    console.log('[Dashboard Debug] Iniciando renderDeadlineAlerts...');
    deadlineAlertsListEl.innerHTML = ''; // Limpar alertas antigos

    const today = new Date();
    today.setHours(0,0,0,0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const criticalProcesses = allProcesses.filter(p => {
        if (!p.fatal_deadline) return false;
        const deadlineDate = new Date(p.fatal_deadline);
        deadlineDate.setDate(deadlineDate.getDate() + 1); // Ajuste de timezone/UTC
        deadlineDate.setHours(0,0,0,0);
        return deadlineDate >= today && deadlineDate <= sevenDaysFromNow;
    }).sort((a,b) => new Date(a.fatal_deadline) - new Date(b.fatal_deadline)); // Ordenar por data

    if (criticalProcesses.length === 0) {
        deadlineAlertsListEl.innerHTML = '<p class="text-muted">Nenhum prazo crítico nos próximos 7 dias.</p>';
        return;
    }

    criticalProcesses.forEach(process => {
        const deadlineDate = new Date(process.fatal_deadline);
        deadlineDate.setDate(deadlineDate.getDate() + 1); // Ajuste de timezone/UTC
        deadlineDate.setHours(0,0,0,0);

        let alertClass = 'list-group-item-warning'; // Padrão para próximos 7 dias
        if (deadlineDate.getTime() === today.getTime()) {
            alertClass = 'list-group-item-danger'; // Vence hoje
        }

        const listItem = document.createElement('a');
        listItem.href = "#"; // Poderia linkar para detalhes do processo no futuro
        listItem.className = `list-group-item list-group-item-action ${alertClass}`;
        listItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">Proc: ${process.process_number} (Cliente: ${clientMap[process.client_id] || 'N/A'})</h5>
                <small>Prazo Fatal: ${formatDate(process.fatal_deadline)}</small>
            </div>
            <p class="mb-1">Advogado: ${lawyerMap[process.lawyer_id] || 'N/A'}. Tipo: ${process.action_type || 'N/A'}</p>
        `;
        deadlineAlertsListEl.appendChild(listItem);
    });
}

// --- Lógica de Filtros ---
async function filterProcesses(status, lawyerId, clientId) {
    // Obter e parsear as datas de prazo fatal dos inputs
    const fatalDeadlineDeStr = filterFatalDeadlineDeEl ? filterFatalDeadlineDeEl.value.trim() : "";
    const fatalDeadlineAteStr = filterFatalDeadlineAteEl ? filterFatalDeadlineAteEl.value.trim() : "";

    // A validação de formato e de "De" vs "Até" já foi feita no listener do botão.
    // Aqui, apenas convertemos para ISO para a query.
    const fatalDeadlineDeISO = parseDisplayDateToISO(fatalDeadlineDeStr);
    const fatalDeadlineAteISO = parseDisplayDateToISO(fatalDeadlineAteStr);

    console.log(`[Dashboard Debug] Filtrando processos com: status=${status}, lawyerId=${lawyerId}, clientId=${clientId}, fatalDeadlineDe=${fatalDeadlineDeStr} (ISO: ${fatalDeadlineDeISO}), fatalDeadlineAte=${fatalDeadlineAteStr} (ISO: ${fatalDeadlineAteISO})`);

    let queryString = '/processes/?';
    const params = [];

    if (status) {
        params.push(`status=${encodeURIComponent(status)}`);
    }
    if (lawyerId) {
        params.push(`lawyer_id=${encodeURIComponent(lawyerId)}`);
    }
    if (clientId) {
        params.push(`client_id=${encodeURIComponent(clientId)}`);
    }
    if (fatalDeadlineDeISO) { // Usar valor parseado e validado
        params.push(`fatal_deadline_de=${encodeURIComponent(fatalDeadlineDeISO)}`);
    }
    if (fatalDeadlineAteISO) { // Usar valor parseado e validado
        params.push(`fatal_deadline_ate=${encodeURIComponent(fatalDeadlineAteISO)}`);
    }

    queryString += params.join('&');
    console.log(`[Dashboard Debug] Query string para filtro: ${queryString}`);

    // Mostra um feedback de carregamento na tabela
    processesTableBodyEl.innerHTML = '<tr><td colspan="8" class="text-center">Filtrando processos...</td></tr>';

    try {
        const filteredProcesses = await fetchData(queryString);
        renderProcessTable(filteredProcesses);
    } catch (error) {
        console.error('Erro ao filtrar processos:', error);
        processesTableBodyEl.innerHTML = '<tr><td colspan="8" class="text-center">Erro ao aplicar filtros.</td></tr>';
    }
}

// --- Lógica de Gráficos ---
let statusChartInstance = null;
let lawyerChartInstance = null;
let actionTypeChartInstance = null;

function processDataForStatusChart(processes) {
    const statusCounts = {};
    processes.forEach(p => {
        const status = p.status || 'Não definido';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    return {
        labels: Object.keys(statusCounts),
        data: Object.values(statusCounts),
    };
}

function processDataForLawyerChart(processes, lawyersMap) {
    const lawyerCounts = {};
    processes.forEach(p => {
        const lawyerName = lawyersMap[p.lawyer_id] || 'Não atribuído';
        lawyerCounts[lawyerName] = (lawyerCounts[lawyerName] || 0) + 1;
    });
    return {
        labels: Object.keys(lawyerCounts),
        data: Object.values(lawyerCounts),
    };
}

function processDataForActionTypeChart(processes) {
    const actionTypeCounts = {};
    processes.forEach(p => {
        const actionType = p.action_type || 'Não definido';
        actionTypeCounts[actionType] = (actionTypeCounts[actionType] || 0) + 1;
    });
    return {
        labels: Object.keys(actionTypeCounts),
        data: Object.values(actionTypeCounts),
    };
}

function createChart(canvasElement, existingChartInstance, chartType, data, options) {
    if (existingChartInstance) {
        existingChartInstance.destroy(); // Destruir gráfico anterior para evitar sobreposição
    }
    return new Chart(canvasElement, {
        type: chartType,
        data: data,
        options: options || {}
    });
}

// Funções de renderização específicas para cada gráfico
function renderStatusChart() {
    if (!allProcesses.length && !statusChartInstance) return; // Evita renderizar se não há dados e gráfico não existe
    console.log('[Dashboard Debug] Renderizando/Atualizando Status Chart...');
    const statusData = processDataForStatusChart(allProcesses);
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(tooltipItem) {
                        const dataset = tooltipItem.dataset;
                        const currentValue = dataset.data[tooltipItem.dataIndex];
                        const total = dataset.data.reduce((acc, value) => acc + value, 0);
                        const percentage = ((currentValue / total) * 100).toFixed(2);
                        return `${tooltipItem.label}: ${currentValue} (${percentage}%)`;
                    }
                }
            },
            datalabels: {
                formatter: (value, ctx) => {
                    let sum = 0;
                    let dataArr = ctx.chart.data.datasets[0].data;
                    dataArr.map(data => { sum += data; });
                    if (sum === 0) return '0.0%'; // Evita divisão por zero se não houver dados
                    let percentage = ((value * 100) / sum).toFixed(1) + "%";
                    return percentage;
                },
                color: '#fff',
            }
        }
    };
    statusChartInstance = createChart(statusChartCanvas, statusChartInstance, 'pie', {
        labels: statusData.labels,
        datasets: [{
            label: 'Processos por Status',
            data: statusData.data,
            backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d', '#adb5bd'],
        }]
    }, options);
}

function renderLawyerChart() {
    if (!allProcesses.length && !lawyerChartInstance) return;
    console.log('[Dashboard Debug] Renderizando/Atualizando Lawyer Chart...');
    const lawyerData = processDataForLawyerChart(allProcesses, lawyerMap);
    const options = {
        indexAxis: 'y', // Define como gráfico de barras horizontais
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { // O eixo de valores agora é X
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                }
            }
        },
        plugins: {
            datalabels: {
                anchor: 'end',
                align: 'right',
                offset: -4, // Ajusta para dentro da barra
                color: '#fff', // Cor do texto do datalabel
                formatter: (value, ctx) => value
            }
        }
    };
    lawyerChartInstance = createChart(lawyerChartCanvas, lawyerChartInstance, 'bar', {
        labels: lawyerData.labels,
        datasets: [{
            label: 'Nº de Processos por Advogado',
            data: lawyerData.data,
            backgroundColor: '#0d6efd',
        }]
    }, options);
}

function renderActionTypeChart() {
    if (!allProcesses.length && !actionTypeChartInstance) return;
    console.log('[Dashboard Debug] Renderizando/Atualizando Action Type Chart...');
    const actionTypeData = processDataForActionTypeChart(allProcesses);
    const options = {
        indexAxis: 'y', // Define como gráfico de barras horizontais
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { // O eixo de valores agora é X
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                }
            }
        },
        plugins: {
            datalabels: {
                anchor: 'end',
                align: 'right',
                offset: -4, // Ajusta para dentro da barra
                color: '#fff', // Cor do texto do datalabel
                formatter: (value, ctx) => value
            }
        }
    };
    actionTypeChartInstance = createChart(actionTypeChartCanvas, actionTypeChartInstance, 'bar', {
        labels: actionTypeData.labels,
        datasets: [{
            label: 'Nº de Processos por Tipo de Ação',
            data: actionTypeData.data,
            backgroundColor: '#198754',
        }]
    }, options);
}

function renderCharts() { // Chamada principal modificada
    console.log('[Dashboard Debug] Iniciando renderCharts (principal) - renderizando gráfico de status...');
    renderStatusChart(); // Renderiza o gráfico da aba ativa (status) imediatamente
    // Os outros gráficos serão renderizados quando suas abas forem mostradas pela primeira vez
}

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Dashboard Debug] DOMContentLoaded - Verificando token...');
    if (!getToken()) {
        console.log('[Dashboard Debug] Nenhum token encontrado. Redirecionando para login.html.');
        window.location.href = 'login.html';
        return; // Impede a execução de fetchAllData se não houver token
    }

    console.log('[Dashboard Debug] Token encontrado. Chamando fetchAllData...');
    fetchAllData();

    if(applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            // Limpar erros de validação de data anteriores
            clearFieldErrorDashboard('filter-fatal-deadline-de');
            clearFieldErrorDashboard('filter-fatal-deadline-ate');

            const status = filterStatusEl.value;
            const lawyerId = filterLawyerEl.value;
            const clientId = filterClientEl.value;

            const fatalDeadlineDeStr = filterFatalDeadlineDeEl.value.trim();
            const fatalDeadlineAteStr = filterFatalDeadlineAteEl.value.trim();
            let hasDateError = false;

            let fatalDeadlineDeISO = null;
            if (fatalDeadlineDeStr) {
                fatalDeadlineDeISO = parseDisplayDateToISO(fatalDeadlineDeStr);
                if (!fatalDeadlineDeISO) {
                    showFieldErrorDashboard('filter-fatal-deadline-de', 'Formato inválido (dd/mm/aaaa).');
                    hasDateError = true;
                }
            }

            let fatalDeadlineAteISO = null;
            if (fatalDeadlineAteStr) {
                fatalDeadlineAteISO = parseDisplayDateToISO(fatalDeadlineAteStr);
                if (!fatalDeadlineAteISO) {
                    showFieldErrorDashboard('filter-fatal-deadline-ate', 'Formato inválido (dd/mm/aaaa).');
                    hasDateError = true;
                }
            }

            // Validação de precedência apenas se ambas as datas foram parseadas corretamente
            if (fatalDeadlineDeISO && fatalDeadlineAteISO && new Date(fatalDeadlineAteISO) < new Date(fatalDeadlineDeISO)) {
                showFieldErrorDashboard('filter-fatal-deadline-ate', 'Data "Até" deve ser posterior ou igual à data "De".');
                hasDateError = true;
            }

            if (hasDateError) {
                return; // Não prosseguir com o filtro se houver erro de data
            }

            filterProcesses(status, lawyerId, clientId); // filterProcesses pegará os valores dos inputs de data e os parseará
        });
    } else {
        console.warn("[Dashboard Debug] Botão apply-filters-btn não encontrado.");
    }

    const logoutButtonDashboard = document.getElementById('logout-button-dashboard');
    if (logoutButtonDashboard) {
        logoutButtonDashboard.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja sair?')) { // Adiciona uma confirmação
                logout();
            }
        });
    } else {
        console.warn("[Dashboard Debug] Botão logout-button-dashboard não encontrado.");
    }

    // Listeners para abas de gráficos para renderizar sob demanda
    const lawyerChartTabButton = document.getElementById('lawyer-chart-tab-button');
    if (lawyerChartTabButton) {
        lawyerChartTabButton.addEventListener('shown.bs.tab', function (event) {
            console.log('[Dashboard Debug] Aba do gráfico de Advogados mostrada.');
            renderLawyerChart();
        });
    } else {
        console.warn("[Dashboard Debug] Botão da aba do gráfico de Advogados (lawyer-chart-tab-button) não encontrado.");
    }

    const actionTypeChartTabButton = document.getElementById('action-type-chart-tab-button');
    if (actionTypeChartTabButton) {
        actionTypeChartTabButton.addEventListener('shown.bs.tab', function (event) {
            console.log('[Dashboard Debug] Aba do gráfico de Tipo de Ação mostrada.');
            renderActionTypeChart();
        });
    } else {
        console.warn("[Dashboard Debug] Botão da aba do gráfico de Tipos de Ação (action-type-chart-tab-button) não encontrado.");
    }

    // --- Lógica de Pesquisa para a Tabela de Processos do Dashboard ---
    function setupDashboardTableSearch(inputId, tableBodyId) {
        const searchInput = document.getElementById(inputId);
        const tableBody = document.getElementById(tableBodyId);

        if (!searchInput) {
            console.warn(`[Dashboard Debug] Elemento de input de busca da tabela não encontrado: ${inputId}`);
            return;
        }
        if (!tableBody) {
            console.warn(`[Dashboard Debug] Corpo da tabela não encontrado: ${tableBodyId}`);
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

    // Função para configurar o clique no ícone de busca para focar no input (específico do Dashboard)
    function setupDashboardSearchIconClick(iconId, inputId) {
        const iconElement = document.getElementById(iconId);
        const inputElement = document.getElementById(inputId);

        if (iconElement && inputElement) {
            iconElement.addEventListener('click', function() {
                inputElement.focus();
            });
        } else {
            if (!iconElement) console.warn(`[Dashboard Debug] Elemento do ícone de busca da tabela não encontrado: ${iconId}`);
            if (!inputElement) console.warn(`[Dashboard Debug] Elemento de input de busca da tabela não encontrado: ${inputId}`);
        }
    }

    // Configurar a pesquisa para a tabela de processos no dashboard
    setupDashboardTableSearch('search-dashboard-processes', 'processes-table-body');
    setupDashboardSearchIconClick('search-dashboard-processes-icon', 'search-dashboard-processes');

});
