// Orquestrador Principal da Aplicação
const App = {
  // Estado Global do Dashboard
  state: {
    isDemoMode: true, // Inicia em modo de demonstração por padrão para visualização imediata
    clients: [],
    selectedClient: '',
    leads: [],
    filteredLeads: [],
    dateFilter: '30', // Padrão: Últimos 30 dias
    searchQuery: '',
    currentPage: 1,
    itemsPerPage: 10,
    activeUtmTab: 'creative'
  },
  logCount: 0,

  // Inicializa o Dashboard
  init: function() {
    this.setupEventListeners();
    ChartsManager.init();

    this.log('INFO', 'System', 'Dashboard de Leads carregado com sucesso.');
    this.log('INFO', 'System', 'Monitor de APIs do Google Drive e Meta Graph v25.0 ativo na VPS.');

    // Tenta restaurar sessão real do painel caso exista
    const savedToken = sessionStorage.getItem('session_token');
    if (savedToken) {
      this.log('SUCCESS', 'Auth', 'Sessão anterior restaurada na VPS.');
      this.state.isDemoMode = false;
      document.getElementById('demo-badge').classList.add('hidden');
      this.enterDashboard();
    } else {
      this.log('INFO', 'System', 'Aguardando login do usuário...');
      // Exibe tela de login
      this.showScreen('login-screen');
    }
  },

  // Configura todos os ouvintes de eventos da UI
  setupEventListeners: function() {
    // Botão de Login (Usuário/Senha na VPS)
    document.getElementById('btn-login-submit').addEventListener('click', async () => {
      const user = document.getElementById('input-username').value.trim();
      const pass = document.getElementById('input-password').value.trim();

      if (!user || !pass) {
        alert('Por favor, preencha o usuário e a senha.');
        return;
      }

      this.showLoader(true, 'Verificando credenciais na VPS...');
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user, password: pass })
        });
        
        const data = await response.json();
        this.showLoader(false);

        if (response.ok && data.success) {
          this.log('SUCCESS', 'Auth', `Login efetuado com sucesso como '${user}'.`);
          this.state.isDemoMode = false;
          sessionStorage.setItem('session_token', data.token);
          document.getElementById('demo-badge').classList.add('hidden');
          this.enterDashboard();
        } else {
          this.log('ERROR', 'Auth', `Tentativa de login falhou para '${user}': ${data.error}`);
          alert(data.error || 'Credenciais inválidas.');
        }
      } catch (err) {
        this.showLoader(false);
        this.log('ERROR', 'Auth', `Falha de conexão com a VPS: ${err.message}`);
        alert('Não foi possível conectar ao servidor. Verifique se a aplicação Node.js está rodando.');
      }
    });

    document.getElementById('btn-login-demo').addEventListener('click', () => {
      this.state.isDemoMode = true;
      this.log('INFO', 'Auth', 'Acessando em Modo Demo (Dados Simulados).');
      document.getElementById('demo-badge').classList.remove('hidden');
      this.enterDashboard();
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
      this.log('INFO', 'Auth', 'Sessão encerrada pelo usuário.');
      sessionStorage.removeItem('session_token');
      window.location.reload();
    });

    // Seletor de Cliente
    document.getElementById('select-client').addEventListener('change', (e) => {
      this.state.selectedClient = e.target.value;
      this.loadClientData();
    });

    // Filtros de Período
    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        periodButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.state.dateFilter = e.target.dataset.period;
        this.applyFilters();
      });
    });

    // Busca na tabela
    document.getElementById('table-search').addEventListener('input', (e) => {
      this.state.searchQuery = e.target.value.toLowerCase();
      this.state.currentPage = 1;
      this.applyFilters();
    });

    // Seleção de Tipo de UTM no Gráfico
    const utmButtons = document.querySelectorAll('.utm-btn');
    utmButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        utmButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.state.activeUtmTab = e.target.dataset.type;
        ChartsManager.updateUtmRanking(this.state.filteredLeads, this.state.activeUtmTab);
      });
    });

    // Paginação
    document.getElementById('btn-prev-page').addEventListener('click', () => {
      if (this.state.currentPage > 1) {
        this.state.currentPage--;
        this.renderTable();
      }
    });

    document.getElementById('btn-next-page').addEventListener('click', () => {
      const totalPages = Math.ceil(this.state.filteredLeads.length / this.state.itemsPerPage);
      if (this.state.currentPage < totalPages) {
        this.state.currentPage++;
        this.renderTable();
      }
    });

    // Exportação CSV
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      this.exportToCSV();
    });

    // Abas do Modal de Configurações
    const tabButtons = document.querySelectorAll('.modal-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabButtons.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
        
        e.target.classList.add('active');
        const tabId = e.target.dataset.tab;
        document.getElementById(tabId).classList.add('active');
      });
    });

    // Modal de Controle VPS & Logs
    document.getElementById('btn-settings').addEventListener('click', () => {
      // Reseta para a primeira aba
      tabButtons[0].click();
      document.getElementById('settings-modal').classList.add('active');
    });

    document.getElementById('btn-close-modal').addEventListener('click', () => {
      document.getElementById('settings-modal').classList.remove('active');
    });

    document.getElementById('btn-reload-dashboard').addEventListener('click', () => {
      this.log('INFO', 'System', 'Recarregando dados do servidor VPS...');
      document.getElementById('settings-modal').classList.remove('active');
      this.loadClients();
    });

    // Limpar logs
    document.getElementById('btn-clear-logs').addEventListener('click', () => {
      document.getElementById('log-console-output').innerHTML = '';
      document.getElementById('log-count').textContent = '0';
      this.logCount = 0;
      this.log('INFO', 'System', 'Console de logs limpo pelo usuário.');
    });
  },

  // Entra na tela do dashboard e carrega os clientes
  enterDashboard: function() {
    this.showScreen('dashboard-screen');
    
    // Se estiver em modo real, atualiza perfil
    if (!this.state.isDemoMode && Auth.userProfile) {
      this.updateUserInfoUI(Auth.userProfile);
    } else {
      this.updateUserInfoUI({
        name: 'Usuário Demonstrativo',
        email: 'demo@connectagro.com.br',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
      });
    }

    // Carrega ID da pasta raiz do localStorage
    const savedFolderId = localStorage.getItem('root_folder_id');
    if (savedFolderId) {
      DriveService.ROOT_FOLDER_ID = savedFolderId;
    }

    this.loadClients();
  },

  // Atualiza as informações do usuário logado na UI
  updateUserInfoUI: function(profile) {
    document.getElementById('user-avatar').src = profile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';
    document.getElementById('user-name').textContent = profile.name;
    document.getElementById('user-email').textContent = profile.email;
  },

  // Alterna as telas principais da aplicação
  showScreen: function(screenId) {
    document.querySelectorAll('.app-screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
  },

  // Exibe/oculta o Loader de carregamento
  showLoader: function(show, message = 'Carregando dados...') {
    const loader = document.getElementById('app-loader');
    const msgEl = loader.querySelector('.loader-message');
    if (msgEl) msgEl.textContent = message;
    
    if (show) {
      loader.classList.add('active');
    } else {
      loader.classList.remove('active');
    }
  },

  // Carrega a lista de clientes
  loadClients: async function() {
    this.showLoader(true, 'Carregando lista de clientes...');
    try {
      this.log('INFO', 'System', 'Buscando lista de clientes do Google Drive...');
      
      const response = await fetch(`/api/clients?demo=${this.state.isDemoMode}`);
      if (!response.ok) {
        throw new Error(`[Status ${response.status}] Erro ao buscar clientes.`);
      }
      
      this.state.clients = await response.json();
      this.populateClientsDropdown();

      this.log('SUCCESS', 'System', `Clientes carregados com sucesso: ${this.state.clients.length} encontrados.`);

      if (this.state.clients.length > 0) {
        this.state.selectedClient = this.state.clients[0].name;
        document.getElementById('select-client').value = this.state.clients[0].name;
        await this.loadClientData();
      } else {
        this.showLoader(false);
        this.log('WARNING', 'System', 'Nenhuma pasta de cliente ativa encontrada no Google Drive.');
      }
    } catch (err) {
      this.showLoader(false);
      this.log('ERROR', 'System', `Falha ao obter clientes da VPS: ${err.message}`);
      alert(`Falha ao obter clientes do servidor: ${err.message}`);
    }
  },

  // Popula o menu Dropdown de clientes
  populateClientsDropdown: function() {
    const select = document.getElementById('select-client');
    select.innerHTML = '';
    
    this.state.clients.forEach(client => {
      const option = document.createElement('option');
      option.value = client.name;
      option.dataset.id = client.id;
      option.textContent = client.name;
      select.appendChild(option);
    });
  },

  // Carrega os dados de leads do cliente selecionado
  loadClientData: async function() {
    this.showLoader(true, `Carregando leads de ${this.state.selectedClient}...`);
    try {
      this.log('INFO', 'System', `Buscando leads do cliente '${this.state.selectedClient}' na planilha do Google Drive...`);
      
      const activeOption = document.querySelector(`#select-client option[value="${this.state.selectedClient}"]`);
      const clientId = activeOption ? activeOption.dataset.id : '';
      
      const url = `/api/leads?clientId=${clientId}&clientName=${encodeURIComponent(this.state.selectedClient)}&demo=${this.state.isDemoMode}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `[Status ${response.status}] Falha ao buscar leads.`);
      }
      
      this.state.leads = await response.json();
      this.log('SUCCESS', 'System', `Leads obtidos da planilha. Total de registros: ${this.state.leads.length}.`);

      this.state.currentPage = 1;
      this.applyFilters();
      this.showLoader(false);
    } catch (err) {
      this.showLoader(false);
      this.log('ERROR', 'System', `Erro ao buscar leads: ${err.message}`);
      alert(`Erro ao ler planilha do cliente no servidor: ${err.message}`);
    }
  },

  // Filtra os leads por período e busca
  applyFilters: function() {
    const now = new Date();
    let leadsToFilter = [...this.state.leads];

    // 1. Filtrar por período de tempo
    if (this.state.dateFilter !== 'all') {
      const limitDays = parseInt(this.state.dateFilter);
      const limitDate = new Date();
      limitDate.setDate(now.getDate() - limitDays);

      leadsToFilter = leadsToFilter.filter(lead => {
        if (!lead.date) return false;
        // Normaliza a data para comparar
        const leadDate = new Date(lead.date.replace(' ', 'T'));
        return leadDate >= limitDate;
      });
    }

    // 2. Filtrar por busca textual
    if (this.state.searchQuery) {
      leadsToFilter = leadsToFilter.filter(lead => {
        return (
          (lead.name && lead.name.toLowerCase().includes(this.state.searchQuery)) ||
          (lead.phone && lead.phone.includes(this.state.searchQuery)) ||
          (lead.platform && lead.platform.toLowerCase().includes(this.state.searchQuery)) ||
          (lead.campaign && lead.campaign.toLowerCase().includes(this.state.searchQuery)) ||
          (lead.creative && lead.creative.toLowerCase().includes(this.state.searchQuery))
        );
      });
    }

    this.state.filteredLeads = leadsToFilter;
    this.updateKPIs();
    
    // Atualiza gráficos locais
    ChartsManager.updateCharts(this.state.filteredLeads);
    ChartsManager.updateUtmRanking(this.state.filteredLeads, this.state.activeUtmTab);
    
    // Dispara a consulta ao Meta Ads para obter custos e atualizar a UI
    this.fetchAndMergeMetaAds();

    // Renderiza tabela com os resultados
    this.renderTable();
  },

  // Consulta o Meta Ads v25.0 (ou simula requisições de debug no modo demo) e calcula o Custo por Lead
  fetchAndMergeMetaAds: async function() {
    const dias = this.state.dateFilter === 'all' ? 90 : parseInt(this.state.dateFilter);
    const leadsMetaCount = this.state.filteredLeads.filter(l => 
      l.platform && (l.platform.includes('Meta') || l.platform.includes('Instagram'))
    ).length;

    this.log('INFO', 'System', `Consultando performance do Meta Ads na VPS (Período: ${dias} dias)...`);

    try {
      const url = `/api/meta-insights?days=${dias}&demo=${this.state.isDemoMode}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `[Status ${response.status}] Falha ao ler insights do Meta.`);
      }

      const data = await response.json();

      // 1. Renderiza logs retornados do servidor VPS no console visual do Dashboard
      if (data.logs && data.logs.length > 0) {
        data.logs.forEach(logItem => {
          this.log(logItem.type, logItem.source, logItem.message);
        });
      }

      // 2. Processar investimento total
      let totalSpend = 0;
      
      if (this.state.isDemoMode) {
        // No modo Demo, calcula custo simulado e exibe
        totalSpend = data.spend || (leadsMetaCount * 14.50);
      } else if (data.campaigns) {
        // No modo Real, soma o spend de todas as campanhas retornadas da Marketing API
        data.campaigns.forEach(item => {
          totalSpend += parseFloat(item.spend || 0);
        });
      }

      // 3. Calcular CPL médio
      const cpl = leadsMetaCount > 0 ? (totalSpend / leadsMetaCount) : 0;

      // 4. Atualizar UI
      document.getElementById('kpi-meta-spend').textContent = `R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      document.getElementById('kpi-meta-cpl').innerHTML = `<span>CPL Médio: R$ ${cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
      
      this.log('SUCCESS', 'Dashboard', `Cálculo concluído: R$ ${totalSpend.toFixed(2)} investidos, CPL médio de R$ ${cpl.toFixed(2)}.`);

    } catch (err) {
      document.getElementById('kpi-meta-spend').textContent = 'Erro VPS';
      document.getElementById('kpi-meta-cpl').innerHTML = `<span class="trend-down" title="${err.message}">Falha no carregamento</span>`;
      this.log('ERROR', 'Dashboard', `Falha ao carregar dados do Meta da VPS: ${err.message}`);
    }
  },

  // Calcula e atualiza os cards de KPI
  updateKPIs: function() {
    const count = this.state.filteredLeads.length;
    document.getElementById('kpi-total-leads').textContent = count.toLocaleString('pt-BR');

    // Canal Líder
    const platformCounts = {};
    let leadingPlatform = 'Nenhum';
    let maxPlatformLeads = 0;

    // Dispositivo Líder (para cálculo da taxa de conversão do dispositivo dominante)
    const deviceCounts = {};

    this.state.filteredLeads.forEach(lead => {
      // Plataforma
      if (lead.platform) {
        platformCounts[lead.platform] = (platformCounts[lead.platform] || 0) + 1;
        if (platformCounts[lead.platform] > maxPlatformLeads) {
          maxPlatformLeads = platformCounts[lead.platform];
          leadingPlatform = lead.platform;
        }
      }
      
      // Dispositivo
      if (lead.device) {
        deviceCounts[lead.device] = (deviceCounts[lead.device] || 0) + 1;
      }
    });

    document.getElementById('kpi-top-channel').textContent = leadingPlatform;

    // Taxa de conversão por dispositivo (Mobile %)
    const totalWithDevice = Object.values(deviceCounts).reduce((a, b) => a + b, 0);
    const mobileCount = deviceCounts['Mobile'] || 0;
    const mobilePercentage = totalWithDevice > 0 ? Math.round((mobileCount / totalWithDevice) * 100) : 0;
    
    document.getElementById('kpi-mobile-share').textContent = `${mobilePercentage}%`;

    // Taxa de Crescimento Simples (Fictícia baseada na metade do período vs final)
    let trendHtml = '<i class="trend-icon up">↑</i> +12% vs período anterior';
    if (count === 0) trendHtml = 'Sem dados';
    document.getElementById('kpi-trend').innerHTML = trendHtml;
  },

  // Renderiza a tabela de dados brutos paginada
  renderTable: function() {
    const tbody = document.getElementById('leads-table-body');
    tbody.innerHTML = '';

    const totalLeads = this.state.filteredLeads.length;
    const totalPages = Math.ceil(totalLeads / this.state.itemsPerPage);

    // Desabilitar/habilitar botões de paginação
    document.getElementById('btn-prev-page').disabled = this.state.currentPage === 1;
    document.getElementById('btn-next-page').disabled = this.state.currentPage >= totalPages || totalPages === 0;

    // Mostrar contador
    document.getElementById('page-indicator').textContent = totalPages > 0 
      ? `Página ${this.state.currentPage} de ${totalPages}` 
      : 'Página 0 de 0';

    document.getElementById('table-counter').textContent = `${totalLeads} leads encontrados`;

    if (totalLeads === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-secondary);">
            Nenhum lead encontrado com os filtros atuais.
          </td>
        </tr>
      `;
      return;
    }

    // Fatia os dados para a página atual
    const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
    const endIndex = Math.min(startIndex + this.state.itemsPerPage, totalLeads);
    const pageLeads = this.state.filteredLeads.slice(startIndex, endIndex);

    pageLeads.forEach(lead => {
      const tr = document.createElement('tr');
      
      // Formata data de forma legível
      let formattedDate = lead.date || '-';
      if (formattedDate.length > 16) {
        formattedDate = formattedDate.substring(0, 16); // Remove segundos
      }

      tr.innerHTML = `
        <td class="td-date">${formattedDate}</td>
        <td class="td-name font-semibold">${lead.name || '-'}</td>
        <td class="td-phone">${lead.phone || '-'}</td>
        <td><span class="badge badge-platform">${lead.platform || '-'}</span></td>
        <td><span class="badge badge-device">${lead.device || '-'}</span></td>
        <td><div class="truncate-text" title="${lead.campaign || ''}">${lead.campaign || '-'}</div></td>
        <td><div class="truncate-text" title="${lead.adset || ''}">${lead.adset || '-'}</div></td>
        <td><div class="truncate-text" title="${lead.creative || ''}">${lead.creative || '-'}</div></td>
        <td><div class="truncate-text" title="${lead.copy || ''}">${lead.copy || '-'}</div></td>
      `;
      tbody.appendChild(tr);
    });
  },

  // Exportar dados atuais em CSV
  exportToCSV: function() {
    if (this.state.filteredLeads.length === 0) {
      alert('Nenhum dado disponível para exportar.');
      return;
    }

    const headers = ['Data', 'Nome', 'Telefone', 'Plataforma', 'Dispositivo', 'Campanha', 'Conjunto', 'Criativo', 'Copy'];
    const rows = this.state.filteredLeads.map(lead => [
      lead.date,
      lead.name,
      lead.phone,
      lead.platform,
      lead.device,
      lead.campaign,
      lead.adset,
      lead.creative,
      lead.copy
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Byte Order Mark para UTF-8 no Excel
    csvContent += headers.join(";") + "\n";
    rows.forEach(row => {
      const sanitizedRow = row.map(val => {
        const clean = (val || '').replace(/"/g, '""');
        return `"${clean}"`;
      });
      csvContent += sanitizedRow.join(";") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `leads_${this.state.selectedClient.toLowerCase().replace(/ /g, '_')}_export.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Central de Logs de Depuração Visual
  log: function(type, source, message) {
    this.logCount = (this.logCount || 0) + 1;
    const countEl = document.getElementById('log-count');
    if (countEl) countEl.textContent = this.logCount;

    const consoleOutput = document.getElementById('log-console-output');
    if (consoleOutput) {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
      
      const logEntry = document.createElement('div');
      logEntry.className = `log-entry ${type.toLowerCase()}`;
      logEntry.innerHTML = `
        <span class="log-time">[${timeStr}]</span>
        <span class="log-source">[${source}]</span>
        <span class="log-message">${message}</span>
      `;
      
      consoleOutput.appendChild(logEntry);
      
      // Limita número máximo de logs na tela a 200 por questões de performance
      if (consoleOutput.children.length > 200) {
        consoleOutput.removeChild(consoleOutput.firstChild);
      }
      
      consoleOutput.scrollTop = consoleOutput.scrollHeight; // Auto-scroll
    }

    // Console do Desenvolvedor (F12)
    if (type === 'ERROR') {
      console.error(`[${source}] ❌ ${message}`);
    } else if (type === 'WARNING') {
      console.warn(`[${source}] ⚠️ ${message}`);
    } else {
      console.log(`[${source}] ℹ️ ${message}`);
    }
  }
};

// Inicialização imediata ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
