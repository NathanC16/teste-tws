const API_BASE_URL = ''; // Usaremos caminhos relativos para a API

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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Adiciona 1 dia porque o input date e o new Date() podem ter problemas com timezone/UTC
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('pt-BR');
}

// --- Funções de Busca de Dados ---
async function fetchData(url) {
    try {
        const response = await fetch(`${API_BASE_URL}${url}`);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} ao buscar ${url}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Falha ao buscar dados de ${url}:`, error);
        return []; // Retorna array vazio em caso de erro para não quebrar outras partes
    }
}

async function fetchAllData() {
    const processesPromise = fetchData('/processes/');
    const lawyersPromise = fetchData('/lawyers/');
    const clientsPromise = fetchData('/clients/');

    // Espera todas as promises resolverem
    [allProcesses, allLawyers, allClients] = await Promise.all([processesPromise, lawyersPromise, clientsPromise]);

    // Criar mapas para fácil acesso a nomes
    allLawyers.forEach(lawyer => lawyerMap[lawyer.id] = lawyer.name);
    allClients.forEach(client => clientMap[client.id] = client.name);

    // Popular selects de advogados e clientes para filtros
    populateFilterOptions(filterLawyerEl, allLawyers, 'Todos os Advogados');
    populateFilterOptions(filterClientEl, allClients, 'Todos os Clientes');

    // Após buscar todos os dados, renderiza os componentes do dashboard
    renderSummaryCards();
    renderProcessTable(allProcesses); // Renderiza a tabela com todos os processos inicialmente
    renderDeadlineAlerts();
    renderCharts(); // Adicionar esta chamada
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

    queryString += params.join('&');

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

function renderCharts() {
    if (!allProcesses.length) return; // Não renderizar se não houver dados

    // Gráfico de Status
    const statusData = processDataForStatusChart(allProcesses);
    statusChartInstance = createChart(statusChartCanvas, statusChartInstance, 'pie', {
        labels: statusData.labels,
        datasets: [{
            label: 'Processos por Status',
            data: statusData.data,
            backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d', '#adb5bd'], // Cores Bootstrap
        }]
    }, { responsive: true, maintainAspectRatio: false });

    // Gráfico de Advogados
    const lawyerData = processDataForLawyerChart(allProcesses, lawyerMap);
    lawyerChartInstance = createChart(lawyerChartCanvas, lawyerChartInstance, 'bar', {
        labels: lawyerData.labels,
        datasets: [{
            label: 'Nº de Processos por Advogado',
            data: lawyerData.data,
            backgroundColor: '#0d6efd',
        }]
    }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } });

    // Gráfico de Tipos de Ação
    const actionTypeData = processDataForActionTypeChart(allProcesses);
    actionTypeChartInstance = createChart(actionTypeChartCanvas, actionTypeChartInstance, 'bar', { // Pode ser 'pie' também
        labels: actionTypeData.labels,
        datasets: [{
            label: 'Nº de Processos por Tipo de Ação',
            data: actionTypeData.data,
            backgroundColor: '#198754',
        }]
    }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } });
}

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    fetchAllData();

    applyFiltersBtn.addEventListener('click', () => {
        const status = filterStatusEl.value;
        const lawyerId = filterLawyerEl.value;
        const clientId = filterClientEl.value;
        filterProcesses(status, lawyerId, clientId);
    });
});
