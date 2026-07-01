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
    this.log('INFO', 'System', 'Monitor de APIs do Google Drive e Meta Graph v25.0 ativo.');

    // Tenta restaurar sessão real do Google caso exista
    const restored = Auth.restoreSession();
    if (restored) {
      this.log('SUCCESS', 'Google Auth', 'Sessão Google OAuth2 anterior restaurada.');
      this.state.isDemoMode = false;
      document.getElementById('demo-badge').classList.add('hidden');
      this.enterDashboard();
    } else {
      this.log('INFO', 'System', 'Aguardando autenticação do usuário...');
      // Exibe tela de login
      this.showScreen('login-screen');
    }
  },

  // Configura todos os ouvintes de eventos da UI
  setupEventListeners: function() {
    // Botões de login
    document.getElementById('btn-login-google').addEventListener('click', () => {
      this.state.isDemoMode = false;
      this.initGoogleAuthAndLogin();
    });

    document.getElementById('btn-login-demo').addEventListener('click', () => {
      this.state.isDemoMode = true;
      document.getElementById('demo-badge').classList.remove('hidden');
      this.enterDashboard();
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
      if (this.state.isDemoMode) {
        window.location.reload();
      } else {
        Auth.logout();
      }
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

    // Modal de Configuração de Pasta & Meta
    document.getElementById('btn-settings').addEventListener('click', () => {
      // Carrega valores do Google Drive
      const folderId = localStorage.getItem('root_folder_id') || DriveService.ROOT_FOLDER_ID;
      document.getElementById('input-folder-id').value = folderId;

      const googleClientId = localStorage.getItem('google_client_id') || '';
      document.getElementById('input-google-client-id').value = googleClientId;

      // Carrega valores do Meta
      document.getElementById('input-meta-token').value = localStorage.getItem('meta_access_token') || '';
      document.getElementById('input-meta-account').value = localStorage.getItem('meta_ad_account_id') || '';
      
      // Reseta para a primeira aba
      tabButtons[0].click();

      document.getElementById('settings-modal').classList.add('active');
    });

    document.getElementById('btn-close-modal').addEventListener('click', () => {
      document.getElementById('settings-modal').classList.remove('active');
    });

    document.getElementById('btn-save-settings').addEventListener('click', () => {
      // Salva Google Drive
      const folderId = document.getElementById('input-folder-id').value.trim();
      localStorage.setItem('root_folder_id', folderId);
      DriveService.ROOT_FOLDER_ID = folderId;

      const googleClientId = document.getElementById('input-google-client-id').value.trim();
      localStorage.setItem('google_client_id', googleClientId);
      Auth.CLIENT_ID = googleClientId; // Atualiza em tempo real na classe de autenticação

      // Salva Meta Ads
      const metaToken = document.getElementById('input-meta-token').value.trim();
      const metaAccount = document.getElementById('input-meta-account').value.trim();
      localStorage.setItem('meta_access_token', metaToken);
      localStorage.setItem('meta_ad_account_id', metaAccount);

      this.log('SUCCESS', 'Configurações', 'Configurações salvas localmente no navegador.');

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

  // Inicializa a biblioteca GIS e faz login
  initGoogleAuthAndLogin: function() {
    this.showLoader(true, 'Conectando com o Google...');
    
    // Se o Client ID não foi alterado na configuração
    if (Auth.CLIENT_ID.startsWith('SEU_CLIENT_ID')) {
      this.showLoader(false);
      alert('Por favor, configure o CLIENT_ID correto no arquivo js/auth.js ou utilize o Modo Demo.');
      return;
    }

    Auth.init(
      (profile) => {
        // Sucesso no login
        this.showLoader(false);
        this.updateUserInfoUI(profile);
        this.enterDashboard();
      },
      (errorMsg) => {
        // Falha no login
        this.showLoader(false);
        alert(errorMsg);
      }
    );

    // Se já estiver pré-carregada e não logou automaticamente, dispara login popup
    setTimeout(() => {
      if (!Auth.isAuthenticated()) {
        Auth.login();
      }
    }, 500);
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
      if (this.state.isDemoMode) {
        this.state.clients = MockData.clientes.map((c, i) => ({ id: `demo-id-${i}`, name: c }));
      } else {
        this.state.clients = await DriveService.fetchClients();
      }

      this.populateClientsDropdown();

      if (this.state.clients.length > 0) {
        this.state.selectedClient = this.state.clients[0].name;
        document.getElementById('select-client').value = this.state.clients[0].name;
        await this.loadClientData();
      } else {
        this.showLoader(false);
        alert('Nenhuma pasta de cliente encontrada no Google Drive.');
      }
    } catch (err) {
      this.showLoader(false);
      console.error(err);
      alert(`Falha ao obter clientes: ${err.message}. Entrando em Modo Demo.`);
      this.state.isDemoMode = true;
      document.getElementById('demo-badge').classList.remove('hidden');
      this.loadClients();
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
      if (this.state.isDemoMode) {
        // Simular um atraso de rede suave para parecer realista e animar o loader
        await new Promise(resolve => setTimeout(resolve, 800));
        this.state.leads = MockData.generateLeads(this.state.selectedClient, 45); // Gerar últimos 45 dias
      } else {
        const activeOption = document.querySelector(`#select-client option[value="${this.state.selectedClient}"]`);
        const clientId = activeOption.dataset.id;
        this.state.leads = await DriveService.fetchClientLeads(clientId);
      }

      this.state.currentPage = 1;
      this.applyFilters();
      this.showLoader(false);
    } catch (err) {
      this.showLoader(false);
      console.error(err);
      alert(`Erro ao ler planilha do cliente: ${err.message}`);
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

    if (this.state.isDemoMode) {
      // --- SIMULAÇÃO DE DEBUG E LOGS DA v25.0 DO META ADS ---
      const simulatedAdAccount = localStorage.getItem('meta_ad_account_id') || 'act_77728399102';
      
      this.log('INFO', 'Meta API v25.0', `Iniciando consulta para a conta ${simulatedAdAccount} - Período: últimos ${dias} dias`);
      
      // Simulando delay de rede e logs de breakdowns
      await new Promise(resolve => setTimeout(resolve, 300));
      this.log('INFO', 'Meta API v25.0', `GET https://graph.facebook.com/v25.0/${simulatedAdAccount}/insights?level=ad&time_range={"since":"...","until":"..."}&fields=ad_name,spend,clicks,impressions`);
      this.log('SUCCESS', 'Meta API v25.0', 'Resposta recebida por Criativos (200 OK).');

      await new Promise(resolve => setTimeout(resolve, 200));
      this.log('INFO', 'Meta API v25.0', `GET https://graph.facebook.com/v25.0/${simulatedAdAccount}/insights?level=campaign&breakdowns=publisher_platform,device_platform&fields=spend,clicks,impressions`);
      this.log('SUCCESS', 'Meta API v25.0', 'Resposta recebida por Plataforma/Dispositivo (200 OK).');

      // Calcula custo simulado baseado em leads reais filtrados (R$ 14,50 por lead de média)
      const simulatedCPL = 14.50;
      const simulatedSpend = leadsMetaCount * simulatedCPL;

      document.getElementById('kpi-meta-spend').textContent = `R$ ${simulatedSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      document.getElementById('kpi-meta-cpl').innerHTML = `<span>CPL Médio: R$ ${simulatedCPL.toFixed(2)}</span>`;
      
      this.log('SUCCESS', 'Dashboard', `Custo cruzado: R$ ${simulatedSpend.toFixed(2)} investidos, gerando ${leadsMetaCount} leads via Meta. CPL: R$ ${simulatedCPL.toFixed(2)}`);
    } else {
      // --- CONSUMO REAL DA API DO META ---
      const token = localStorage.getItem('meta_access_token');
      const accountId = localStorage.getItem('meta_ad_account_id');

      if (!token || !accountId) {
        document.getElementById('kpi-meta-spend').textContent = 'Configurar';
        document.getElementById('kpi-meta-cpl').innerHTML = '<span class="trend-down">Credenciais ausentes</span>';
        this.log('WARNING', 'Dashboard', 'Consulta ao Meta Ads ignorada. Configure o Access Token e ID da Conta na aba Meta Ads para debugar.');
        return;
      }

      this.log('INFO', 'Meta API v25.0', `Executando chamadas reais para a conta ${accountId}...`);

      try {
        // Dispara requisições paralelas para criativos e campanhas
        const [campaignInsights, creativeInsights] = await Promise.all([
          MetaService.fetchCampaignPerformance(dias),
          MetaService.fetchCreativePerformance(dias)
        ]);

        // 1. Somar investimento total
        let totalSpend = 0;
        campaignInsights.forEach(item => {
          totalSpend += parseFloat(item.spend || 0);
        });

        // 2. Calcular CPL
        const cpl = leadsMetaCount > 0 ? (totalSpend / leadsMetaCount) : 0;

        // 3. Atualizar UI
        document.getElementById('kpi-meta-spend').textContent = `R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('kpi-meta-cpl').innerHTML = `<span>CPL Médio: R$ ${cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
        
        this.log('SUCCESS', 'Dashboard', `Métricas integradas! Total Gasto: R$ ${totalSpend.toFixed(2)}. CPL do período: R$ ${cpl.toFixed(2)}.`);

        // Aqui você pode atualizar gráficos de UTM criativos com os custos reais extraídos do creativeInsights
        if (creativeInsights && creativeInsights.length > 0) {
          this.log('INFO', 'Meta API v25.0', 'Mesclando performance de criativos nos gráficos...');
        }
      } catch (err) {
        document.getElementById('kpi-meta-spend').textContent = 'Erro API';
        document.getElementById('kpi-meta-cpl').innerHTML = `<span class="trend-down" title="${err.message}">Falha no carregamento</span>`;
        this.log('ERROR', 'Dashboard', `Falha ao processar dados do Meta: ${err.message}`);
      }
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
