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
    startDate: null,
    endDate: null,
    searchQuery: '',
    currentPage: 1,
    itemsPerPage: 10,
    activeUtmTab: 'creative',
    metaAccounts: [],
    filteredMetaAccounts: [],
    mappedMetaAccount: null,
    
    // Novas chaves para a Auditoria Meta Ads
    metaData: null,
    explorerLevel: 'campaign', // campaign, adset, creative
    explorerSearch: '',
    selectedMetaCampaignId: null,
    selectedMetaAdsetId: null,
    selectedMetaAdId: null
  },
  logCount: 0,

  // Inicializa o Dashboard
  init: function() {
    this.setupEventListeners();
    this.updateDateRange('30');
    ChartsManager.init();

    this.log('INFO', 'System', 'Dashboard de Leads carregado com sucesso.');
    this.log('INFO', 'System', 'Monitor de APIs do Google Drive e Meta Graph v25.0 ativo na VPS.');

    // Captura retornos de autenticação do Google via URL params
    const urlParams = new URLSearchParams(window.location.search);
    const googleStatus = urlParams.get('google_status');
    const googleError = urlParams.get('google_error');

    if (googleStatus) {
      this.log('SUCCESS', 'Google Auth', 'Conexão com o Google Drive autorizada com sucesso na VPS!');
      alert('Google Drive conectado com sucesso!');
      // Limpa a URL para deixar limpa
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (googleError) {
      this.log('ERROR', 'Google Auth', `Falha ao autorizar Google Drive: ${googleError}`);
      alert(`Falha ao conectar com o Google Drive: ${googleError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Captura retornos de autenticação do Meta via URL params
    const metaStatus = urlParams.get('meta_status');
    const metaError = urlParams.get('meta_error');
    const metaClient = urlParams.get('clientName');

    if (metaStatus === 'success') {
      this.log('SUCCESS', 'Meta Auth', `Conexão com o Facebook autorizada para o cliente '${metaClient}'!`);
      alert(`Facebook conectado com sucesso para o cliente '${metaClient}'!`);
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Auto-seleciona o cliente e abre o modal de contas
      this.state.selectedClient = metaClient;
      const clientSelect = document.getElementById('client-select');
      if (clientSelect) {
        clientSelect.value = metaClient;
      }
      
      // Garante que o dashboard real esteja sendo exibido se houver token de sessão
      const savedToken = sessionStorage.getItem('session_token');
      if (savedToken) {
        this.state.isDemoMode = false;
        document.getElementById('demo-badge').classList.add('hidden');
        this.enterDashboard();
      } else {
        // Se não logado no painel, abre a tela do painel direto (ou deixa carregar)
        this.enterDashboard();
      }
      
      // Carrega os dados do cliente e abre o modal de contas
      this.loadClientData().then(() => {
        this.openMetaAccountsModal();
      });
    } else if (metaError) {
      this.log('ERROR', 'Meta Auth', `Falha ao autorizar Facebook: ${metaError}`);
      alert(`Falha ao conectar com o Facebook: ${metaError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

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
        
        this.showLoader(false);

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            this.log('SUCCESS', 'Auth', `Login efetuado com sucesso como '${user}'.`);
            this.state.isDemoMode = false;
            sessionStorage.setItem('session_token', data.token);
            document.getElementById('demo-badge').classList.add('hidden');
            this.enterDashboard();
          } else {
            this.log('ERROR', 'Auth', `Tentativa de login falhou para '${user}': ${data.error}`);
            alert(data.error || 'Credenciais inválidas.');
          }
        } else {
          this.log('ERROR', 'Auth', `Servidor retornou erro HTTP: ${response.status}`);
          alert(`Erro de conexão com o servidor (Código ${response.status}).\n\nIsso ocorre se a porta da aplicação no Easypanel não estiver configurada para 3000, ou se o deploy ainda não foi atualizado.`);
        }
      } catch (err) {
        this.showLoader(false);
        this.log('ERROR', 'Auth', `Falha de rede/parse: ${err.message}`);
        alert(`Erro de conexão: ${err.message}\n\nVerifique se o seu deploy da aplicação Node.js está ativo no Easypanel.`);
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

    // Novo Controle de Filtros de Período (Estilo Google Ads)
    const trigger = document.getElementById('date-picker-trigger');
    const dropdown = document.getElementById('date-picker-dropdown');
    
    if (trigger && dropdown) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
      });

      // Fechar ao clicar fora
      document.addEventListener('click', (e) => {
        if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
    }

    // Clique nas opções predefinidas do dropdown
    const optButtons = document.querySelectorAll('.picker-opt-btn');
    optButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const range = e.target.dataset.range;
        if (range === 'custom') {
          this.state.dateFilter = 'custom';
          this.updateDateUI();
          // Não fecha o dropdown para deixar preencher as datas
        } else {
          this.updateDateRange(range);
          if (dropdown) dropdown.classList.add('hidden');
          this.applyFilters();
        }
      });
    });

    // Botão de Aplicar no Filtro Personalizado
    const btnApplyCustom = document.getElementById('btn-apply-custom-date');
    if (btnApplyCustom) {
      btnApplyCustom.addEventListener('click', () => {
        const startVal = document.getElementById('custom-start-date').value;
        const endVal = document.getElementById('custom-end-date').value;
        
        if (!startVal || !endVal) {
          alert('Por favor, selecione ambas as datas de início e fim.');
          return;
        }

        // Adiciona timezone seguro interpretando como data local
        const startD = new Date(startVal + 'T00:00:00');
        const endD = new Date(endVal + 'T23:59:59');

        if (startD > endD) {
          alert('A data de início não pode ser maior que a data de fim.');
          return;
        }

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        if (endD > todayEnd) {
          alert('A data final não pode ser posterior a hoje.');
          return;
        }

        this.updateDateRange('custom', startVal, endVal);
        if (dropdown) dropdown.classList.add('hidden');
        this.applyFilters();
      });
    }

    // Setas para navegação proporcional
    const btnPrev = document.getElementById('btn-date-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        this.shiftDateRange('prev');
      });
    }

    const btnNext = document.getElementById('btn-date-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.shiftDateRange('next');
      });
    }

    // Busca na tabela de Criativos (com debounce de 250ms)
    let creativeSearchDebounce;
    const creativeSearchEl = document.getElementById('creative-table-search');
    if (creativeSearchEl) {
      creativeSearchEl.addEventListener('input', (e) => {
        clearTimeout(creativeSearchDebounce);
        creativeSearchDebounce = setTimeout(() => {
          this.state.creativeSearchQuery = e.target.value.toLowerCase().trim();
          this.renderCreativePerformanceTable();
        }, 250);
      });
    }

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

    // Exportação CSV de Criativos
    const btnExportCreativeCsv = document.getElementById('btn-export-creative-csv');
    if (btnExportCreativeCsv) {
      btnExportCreativeCsv.addEventListener('click', () => {
        this.exportCreativesToCSV();
      });
    }

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
      this.checkGoogleStatus(); // Busca status dinâmico do Google na VPS
    });

    document.getElementById('btn-close-modal').addEventListener('click', () => {
      document.getElementById('settings-modal').classList.remove('active');
    });

    document.getElementById('btn-reload-dashboard').addEventListener('click', () => {
      this.log('INFO', 'System', 'Recarregando dados do servidor VPS...');
      document.getElementById('settings-modal').classList.remove('active');
      this.loadClients();
    });

    // Controle do Botão Conectar/Desconectar Google Drive
    document.getElementById('btn-google-toggle-connect').addEventListener('click', async () => {
      const btn = document.getElementById('btn-google-toggle-connect');
      if (btn.dataset.action === 'connect') {
        this.log('INFO', 'Google Auth', 'Iniciando redirecionamento para consentimento do Google OAuth2...');
        window.location.href = '/api/google/auth';
      } else if (btn.dataset.action === 'disconnect') {
        if (!confirm('Deseja realmente desconectar a sua conta do Google Drive da VPS?')) return;
        
        this.showLoader(true, 'Desconectando Google Drive...');
        try {
          const response = await fetch('/api/google/disconnect', { method: 'POST' });
          if (response.ok) {
            this.log('WARNING', 'Google Auth', 'Conexão com o Google Drive revogada pelo usuário.');
            alert('Google Drive desconectado com sucesso.');
            await this.checkGoogleStatus();
          } else {
            alert('Erro ao desconectar conta do Google.');
          }
        } catch (err) {
          alert('Erro ao conectar ao servidor: ' + err.message);
        } finally {
          this.showLoader(false);
        }
      }
    });

    // Limpar logs
    document.getElementById('btn-clear-logs').addEventListener('click', () => {
      document.getElementById('log-console-output').innerHTML = '';
      document.getElementById('log-count').textContent = '0';
      this.logCount = 0;
      this.log('INFO', 'System', 'Console de logs limpo pelo usuário.');
    });

    // --- OUVINTES DO MODAL DE ESCOLHA DE CONTA META ADS ---
    document.getElementById('btn-vincular-meta').addEventListener('click', () => {
      this.openMetaAccountsModal();
    });

    // Ouvinte para fazer login via Meta OAuth
    document.getElementById('btn-facebook-oauth').addEventListener('click', () => {
      const clientName = this.state.selectedClient;
      if (!clientName) {
        alert('Selecione um cliente primeiro!');
        return;
      }
      this.log('INFO', 'Meta Auth', `Redirecionando para login do Facebook para o cliente: ${clientName}...`);
      window.location.href = `/api/meta/auth?clientName=${encodeURIComponent(clientName)}`;
    });

    const closeAccountsModal = () => {
      document.getElementById('meta-accounts-modal').classList.remove('active');
    };
    
    document.getElementById('btn-close-accounts-modal').addEventListener('click', closeAccountsModal);
    document.getElementById('btn-cancel-accounts').addEventListener('click', closeAccountsModal);

    // Filtro de Busca Reativo no Modal de Contas
    document.getElementById('input-search-accounts').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        this.state.filteredMetaAccounts = [...this.state.metaAccounts];
      } else {
        this.state.filteredMetaAccounts = this.state.metaAccounts.filter(acc => 
          acc.name.toLowerCase().includes(query) || acc.id.includes(query) || (acc.instagram && acc.instagram.toLowerCase().includes(query))
        );
      }
      this.renderMetaAccountsGrid();
    });

    // --- OUVINTES DO EXPLORER DA AUDITORIA META ADS ---
    const explorerTabs = document.querySelectorAll('.explorer-tab-btn');
    explorerTabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        explorerTabs.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.state.explorerLevel = e.target.dataset.level;
        this.renderExplorerTable();
      });
    });

    document.getElementById('explorer-search-input').addEventListener('input', (e) => {
      this.state.explorerSearch = e.target.value.toLowerCase().trim();
      this.renderExplorerTable();
    });

    document.getElementById('btn-clear-meta-filters').addEventListener('click', () => {
      this.clearMetaFilters();
    });
  },

  // Entra na tela do dashboard e carrega os clientes
  enterDashboard: function() {
    this.showScreen('dashboard-screen');
    
    // Configura link do atalho agro.html dinamicamente
    const btnGotoAgro = document.getElementById('btn-goto-agro');
    if (btnGotoAgro) {
      btnGotoAgro.href = `/agro.html${this.state.isDemoMode ? '?demo=true' : ''}`;
    }
    
    // Se estiver em modo real, exibe o perfil do Administrador da VPS
    if (!this.state.isDemoMode) {
      this.updateUserInfoUI({
        name: 'Administrador VPS',
        email: 'admin@connectagro.com.br',
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
      });
    } else {
      this.updateUserInfoUI({
        name: 'Usuário Demonstrativo',
        email: 'demo@connectagro.com.br',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
      });
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
      
      // Se der erro 500 (Drive desconectado ou não autorizado)
      if (response.status === 500) {
        this.state.clients = [];
        this.populateClientsDropdown();
        this.showLoader(false);
        this.log('WARNING', 'System', 'Integração Google Drive inativa na VPS. Abra as configurações para autenticar via OAuth2.');
        
        // Abre o painel de configurações automaticamente para o usuário conectar
        setTimeout(() => {
          document.getElementById('btn-settings').click();
        }, 600);
        return;
      }

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
      
      const data = await response.json();
      this.state.leads = (data.leads || []).map(lead => {
        // Pré-parse da data para otimização de performance em filtros recorrentes
        lead._parsedDate = window.parseDateSafe(lead.date);
        return lead;
      });
      
      this.log('SUCCESS', 'System', `Leads obtidos da planilha. Total de registros: ${this.state.leads.length}.`);

      // Gerencia o mapeamento do Meta Ads para este cliente
      const banner = document.getElementById('meta-unmapped-banner');
      if (data.mapped) {
        banner.classList.add('hidden');
        this.state.mappedMetaAccount = {
          id: data.meta_ad_account_id,
          name: data.meta_ad_account_name,
          instagram: data.instagram_username
        };
        this.log('INFO', 'System', `Mapeamento Meta Ads ativo: Conta '${data.meta_ad_account_name}' (${data.instagram_username}).`);
      } else if (this.state.isDemoMode) {
        banner.classList.add('hidden');
        this.state.mappedMetaAccount = {
          id: 'act_77728399102',
          name: `${this.state.selectedClient} (Meta Demo)`,
          instagram: `@${this.state.selectedClient.toLowerCase().replace(/\s+/g, '')}`
        };
        this.log('INFO', 'System', `Mapeamento Meta Ads ativo (Modo Demo): Conta '${this.state.selectedClient} (Meta Demo)'.`);
      } else {
        banner.classList.remove('hidden');
        this.state.mappedMetaAccount = null;
        this.log('WARNING', 'System', `Atenção: O cliente '${this.state.selectedClient}' não possui conta do Meta Ads associada.`);
      }

      this.state.currentPage = 1;
      this.applyFilters();
      this.showLoader(false);
    } catch (err) {
      this.showLoader(false);
      this.log('ERROR', 'System', `Erro ao buscar leads: ${err.message}`);
      alert(`Erro ao ler planilha do cliente no servidor: ${err.message}`);
    }
  },

  // Helper methods for dates
  formatDateShort: function(date) {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  },

  formatDateFull: function(date) {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  },

  formatDateInput: function(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getLeadsMinMaxDates: function() {
    if (this.state.leads.length === 0) {
      return { min: new Date(), max: new Date() };
    }
    let min = null;
    let max = null;
    this.state.leads.forEach(lead => {
      const date = lead._parsedDate;
      if (date) {
        if (!min || date < min) min = date;
        if (!max || date > max) max = date;
      }
    });
    return { min: min || new Date(), max: max || new Date() };
  },

  updateDateRange: function(type, customStart = null, customEnd = null) {
    const startOfDay = (d) => {
      const nd = new Date(d);
      nd.setHours(0, 0, 0, 0);
      return nd;
    };
    const endOfDay = (d) => {
      const nd = new Date(d);
      nd.setHours(23, 59, 59, 999);
      return nd;
    };

    this.state.dateFilter = type;

    if (type === 'max' || type === 'all') {
      this.state.startDate = null;
      this.state.endDate = null;
    } else if (type === 'custom') {
      if (customStart && customEnd) {
        // Usa string parsing seguro com timezone local (evita shift GMT)
        this.state.startDate = startOfDay(new Date(customStart + 'T00:00:00'));
        this.state.endDate = endOfDay(new Date(customEnd + 'T23:59:59'));
      }
    } else {
      const now = new Date();
      if (type === 'today' || type === 'hoje') {
        this.state.startDate = startOfDay(now);
        this.state.endDate = endOfDay(now);
      } else if (type === 'yesterday' || type === 'ontem') {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        this.state.startDate = startOfDay(yesterday);
        this.state.endDate = endOfDay(yesterday);
      } else {
        const days = parseInt(type);
        if (!isNaN(days)) {
          const start = new Date();
          start.setDate(now.getDate() - (days - 1));
          this.state.startDate = startOfDay(start);
          this.state.endDate = endOfDay(now);
        }
      }
    }

    this.updateDateUI();
  },

  shiftDateRange: function(direction) {
    if (!this.state.startDate || !this.state.endDate) return;

    const startMs = this.state.startDate.getTime();
    const endMs = this.state.endDate.getTime();
    const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
    const daysToShift = diffDays + 1;

    const newStart = new Date(this.state.startDate);
    const newEnd = new Date(this.state.endDate);

    if (direction === 'prev') {
      newStart.setDate(newStart.getDate() - daysToShift);
      newEnd.setDate(newEnd.getDate() - daysToShift);
    } else if (direction === 'next') {
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      newStart.setDate(newStart.getDate() + daysToShift);
      newEnd.setDate(newEnd.getDate() + daysToShift);

      if (newEnd > todayEnd) {
        return;
      }
    }

    this.state.startDate = newStart;
    this.state.endDate = newEnd;
    this.state.dateFilter = 'custom';

    this.updateDateUI();
    this.applyFilters();
  },

  updateDateUI: function() {
    const labelEl = document.getElementById('date-display-label');
    if (!labelEl) return;

    const type = this.state.dateFilter;
    if (type === 'max' || type === 'all') {
      labelEl.textContent = 'Máximo (Todo Período)';
    } else if (type === 'today' || type === 'hoje') {
      labelEl.textContent = `Hoje (${this.formatDateFull(this.state.startDate)})`;
    } else if (type === 'yesterday' || type === 'ontem') {
      labelEl.textContent = `Ontem (${this.formatDateFull(this.state.startDate)})`;
    } else if (['3', '5', '7', '15', '30', '90'].includes(type)) {
      labelEl.textContent = `Últimos ${type} dias (${this.formatDateShort(this.state.startDate)} - ${this.formatDateShort(this.state.endDate)})`;
    } else {
      labelEl.textContent = `${this.formatDateFull(this.state.startDate)} - ${this.formatDateFull(this.state.endDate)}`;
    }

    const optButtons = document.querySelectorAll('.picker-opt-btn');
    optButtons.forEach(btn => {
      if (btn.dataset.range === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const customPanel = document.getElementById('custom-date-inputs-container');
    if (customPanel) {
      if (type === 'custom') {
        customPanel.classList.remove('hidden');
        if (this.state.startDate && this.state.endDate) {
          document.getElementById('custom-start-date').value = this.formatDateInput(this.state.startDate);
          document.getElementById('custom-end-date').value = this.formatDateInput(this.state.endDate);
        } else {
          const { min, max } = this.getLeadsMinMaxDates();
          document.getElementById('custom-start-date').value = this.formatDateInput(min);
          document.getElementById('custom-end-date').value = this.formatDateInput(max);
        }
      } else {
        customPanel.classList.add('hidden');
      }
    }

    const prevBtn = document.getElementById('btn-date-prev');
    const nextBtn = document.getElementById('btn-date-next');

    if (prevBtn && nextBtn) {
      if (type === 'max' || type === 'all' || !this.state.startDate || !this.state.endDate) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
      } else {
        prevBtn.disabled = false;

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const diffMs = this.state.endDate.getTime() - this.state.startDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

        const nextEnd = new Date(this.state.endDate);
        nextEnd.setDate(nextEnd.getDate() + diffDays);

        if (nextEnd > todayEnd) {
          nextBtn.disabled = true;
        } else {
          nextBtn.disabled = false;
        }
      }
    }
  },

  // Filtra os leads por período e busca
  applyFilters: function(skipMetaFetch = false) {
    let leadsToFilter = [...this.state.leads];

    // 1. Filtrar por período de tempo (otimizado usando data pré-processada)
    if (this.state.startDate && this.state.endDate) {
      leadsToFilter = leadsToFilter.filter(lead => {
        const leadDate = lead._parsedDate;
        return leadDate && leadDate >= this.state.startDate && leadDate <= this.state.endDate;
      });
    }

    // 2. Filtrar por busca textual
    if (this.state.searchQuery) {
      leadsToFilter = leadsToFilter.filter(lead => {
        return (
          (lead.name && lead.name.toLowerCase().includes(this.state.searchQuery)) ||
          (lead.phone && lead.phone.includes(this.state.searchQuery)) ||
          (lead.phase && lead.phase.toLowerCase().includes(this.state.searchQuery)) ||
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
    
    // Dispara a consulta ao Meta Ads para obter custos e atualizar a UI se não for apenas pesquisa
    if (!skipMetaFetch) {
      this.fetchAndMergeMetaAds();
    }

    // Renderiza a tabela de desempenho de criativos
    this.renderCreativePerformanceTable();
  },

  // Consulta o Meta Ads v25.0 (ou simula requisições de debug no modo demo) e calcula o Custo por Lead
  fetchAndMergeMetaAds: async function() {
    const leadsMetaCount = this.state.leads.filter(l => 
      l.platform && (l.platform.includes('Meta') || l.platform.includes('Instagram'))
    ).length;

    // Se o cliente não possuir conta associada
    if (!this.state.mappedMetaAccount) {
      if (this.state.isDemoMode) {
        this.state.mappedMetaAccount = {
          id: 'act_77728399102',
          name: `${this.state.selectedClient} (Meta Demo)`,
          instagram: `@${this.state.selectedClient.toLowerCase().replace(/\s+/g, '')}`
        };
      } else {
        document.getElementById('kpi-meta-spend').textContent = 'Sem Vínculo';
        document.getElementById('kpi-meta-cpl').innerHTML = '<span>Associe uma conta do FB</span>';
        this.log('WARNING', 'Dashboard', 'Leitura do Meta ignorada: Nenhuma conta vinculada a este cliente.');
        return;
      }
    }

    const accountId = this.state.mappedMetaAccount.id;
    const accountName = this.state.mappedMetaAccount.name;

    this.log('INFO', 'System', `Consultando performance do Meta Ads na VPS para '${accountName}' (ID: ${accountId})...`);

    try {
      let url = `/api/meta-insights?accountId=${accountId}&demo=${this.state.isDemoMode}&clientName=${encodeURIComponent(this.state.selectedClient)}`;
      if (this.state.startDate && this.state.endDate) {
        const formatDate = (date) => date.toISOString().substring(0, 10);
        url += `&startDate=${formatDate(this.state.startDate)}&endDate=${formatDate(this.state.endDate)}`;
      } else {
        url += `&days=90`;
      }
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.logs && errorData.logs.length > 0) {
          errorData.logs.forEach(logItem => {
            this.log(logItem.type, logItem.source, logItem.message);
          });
        }
        throw new Error(errorData.error || `[Status ${response.status}] Falha ao ler insights do Meta.`);
      }

      const data = await response.json();

      // 1. Renderiza logs retornados do servidor VPS no console visual do Dashboard
      if (data.logs && data.logs.length > 0) {
        data.logs.forEach(logItem => {
          this.log(logItem.type, logItem.source, logItem.message);
        });
      }

      // 2. Salva os dados brutos no estado
      this.state.metaData = data;

      // 3. Processar investimento total
      let totalSpend = 0;
      if (data.campaigns) {
        data.campaigns.forEach(item => {
          totalSpend += parseFloat(item.spend || 0);
        });
      }

      // 4. Atualizar UI de todos os cards de topo, tabelas e gráficos
      this.updateKPIs();
      this.renderExplorerTable();
      this.updateMetaAuditCharts();
      this.renderCreativePerformanceTable();

      this.log('SUCCESS', 'Dashboard', `Cálculo concluído para '${accountName}': R$ ${totalSpend.toFixed(2)} investidos.`);

    } catch (err) {
      document.getElementById('kpi-meta-spend').textContent = 'Erro VPS';
      document.getElementById('kpi-meta-cpl').innerHTML = `<span class="trend-down" title="${err.message}">Falha no carregamento</span>`;
      this.log('ERROR', 'Dashboard', `Falha ao carregar dados do Meta da VPS: ${err.message}`);
    }
  },

  // Calcula e atualiza os cards de KPI (Visão Geral sem breakdowns)
  updateKPIs: function() {
    // 1. Filtrar as leads locais apenas por período de data (ignora filtros de explorer como campanha/conjunto para visão geral)
    let globalLeads = [...this.state.leads];
    if (this.state.startDate && this.state.endDate) {
      globalLeads = globalLeads.filter(lead => {
        const leadDate = lead._parsedDate;
        return leadDate && leadDate >= this.state.startDate && leadDate <= this.state.endDate;
      });
    }
    const globalCount = globalLeads.length;

    // 2. Somar dados globais do Meta Ads (todas as campanhas do período, sem breakdowns)
    let totalSpend = 0;
    let totalConversasMeta = 0;
    let totalComprasMeta = 0;

    if (this.state.metaData && this.state.metaData.campaigns) {
      this.state.metaData.campaigns.forEach(c => {
        totalSpend += parseFloat(c.spend || 0);
        totalConversasMeta += parseInt(c.conversas || 0);
        totalComprasMeta += parseInt(c.compras || 0);
      });
    }

    // 3. Atualizar Card 1: Conversas Iniciadas (Meta API onsite_conversion.messaging_conversation_started_7d)
    const card1El = document.getElementById('kpi-total-leads');
    if (card1El) {
      card1El.textContent = this.state.metaData ? totalConversasMeta.toLocaleString('pt-BR') : '...';
    }

    // 4. Atualizar Card 2: Conversas Recebidas (Total da Planilha no período)
    const card2El = document.getElementById('kpi-top-channel');
    if (card2El) {
      card2El.textContent = globalCount.toLocaleString('pt-BR');
    }

    // 5. Atualizar Card 3: Compras (Meta API omni_purchase)
    const card3El = document.getElementById('kpi-mobile-share');
    if (card3El) {
      card3El.textContent = this.state.metaData ? totalComprasMeta.toLocaleString('pt-BR') : '...';
    }

    // 6. Atualizar Card 4: Investimento Meta Ads (Spend total)
    const card4El = document.getElementById('kpi-meta-spend');
    if (card4El) {
      card4El.textContent = `R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Calcular CPL geral (Spend / Leads reais da Planilha)
    const cpl = globalCount > 0 ? (totalSpend / globalCount) : 0;
    const cplEl = document.getElementById('kpi-meta-cpl');
    if (cplEl) {
      cplEl.innerHTML = `<span>CPL Médio: R$ ${cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
    }

    // Subtítulo da tendência da planilha
    const trendEl = document.getElementById('kpi-trend');
    if (trendEl) {
      trendEl.innerHTML = `<span>Total no período selecionado</span>`;
    }
  },

  renderCreativePerformanceTable: function() {
    const tbody = document.getElementById('creative-table-body');
    const counterEl = document.getElementById('creative-table-counter');
    if (!tbody) return;

    let creatives = this.state.metaData ? (this.state.metaData.creatives || []) : [];

    // Filtrar criativos com base na Campanha/Conjunto selecionados no Explorer
    if (this.state.selectedMetaCampaignId) {
      creatives = creatives.filter(c => c.campaign_id === this.state.selectedMetaCampaignId);
    }
    if (this.state.selectedMetaAdsetId) {
      creatives = creatives.filter(c => c.adset_id === this.state.selectedMetaAdsetId);
    }

    // Criar um dicionário de criativos únicos agrupando por nome
    const creativeGroups = {};

    // 1. Agrupar os criativos do Meta Ads
    creatives.forEach(ad => {
      // Limpa nome removendo a tag [VX] para consolidar a performance se houver duplicatas de nome
      const cleanName = ad.ad_name.replace(/\s*\[V\d+\]$/i, '').trim();
      if (!creativeGroups[cleanName]) {
        creativeGroups[cleanName] = {
          name: cleanName,
          metaAds: [],
          spend: 0,
          clicks: 0,
          conversasMeta: 0,
          crmLeads: 0,
          crmConversas: 0,
          crmVendas: 0,
          previewUrl: ''
        };
      }
      creativeGroups[cleanName].metaAds.push(ad);
      creativeGroups[cleanName].spend += parseFloat(ad.spend || 0);
      creativeGroups[cleanName].clicks += parseInt(ad.clicks || 0);
      creativeGroups[cleanName].conversasMeta += parseInt(ad.conversas || 0);
    });

    // 2. Agrupar e cruzar com os dados do CRM da Planilha
    const activePhases = ['Cliente em potencial', 'Proposta enviada', 'Converteu', 'Perdido'];
    
    this.state.filteredLeads.forEach(lead => {
      const creativeCrmName = (lead.creative || '').trim();
      if (!creativeCrmName) return;

      // Matching case-insensitive
      const key = Object.keys(creativeGroups).find(k => k.toLowerCase() === creativeCrmName.toLowerCase());
      
      if (key) {
        creativeGroups[key].crmLeads++;
        if (lead.phase === 'Converteu') {
          creativeGroups[key].crmVendas++;
        }
        if (activePhases.includes(lead.phase)) {
          creativeGroups[key].crmConversas++;
        }
        if (lead.anuncio_preview && !creativeGroups[key].previewUrl) {
          creativeGroups[key].previewUrl = lead.anuncio_preview;
        }
      } else {
        // Se o criativo existe na planilha mas não no Meta Ads
        let campaignMatch = true;
        let adsetMatch = true;
        
        if (this.state.selectedMetaCampaignId) {
          const camp = (this.state.metaData?.campaigns || []).find(c => c.campaign_id === this.state.selectedMetaCampaignId);
          if (camp && lead.campaign) {
            campaignMatch = lead.campaign.toLowerCase() === camp.campaign_name.toLowerCase();
          } else {
            campaignMatch = false;
          }
        }
        if (this.state.selectedMetaAdsetId) {
          const adset = (this.state.metaData?.adsets || []).find(a => a.adset_id === this.state.selectedMetaAdsetId);
          if (adset && lead.adset) {
            adsetMatch = lead.adset.toLowerCase() === adset.adset_name.toLowerCase();
          } else {
            adsetMatch = false;
          }
        }

        if (campaignMatch && adsetMatch) {
          const cleanName = creativeCrmName.replace(/\s*\[V\d+\]$/i, '').trim();
          if (!creativeGroups[cleanName]) {
            creativeGroups[cleanName] = {
              name: cleanName,
              metaAds: [],
              spend: 0,
              clicks: 0,
              conversasMeta: 0,
              crmLeads: 0,
              crmConversas: 0,
              crmVendas: 0,
              previewUrl: lead.anuncio_preview || ''
            };
          }
          creativeGroups[cleanName].crmLeads++;
          if (lead.phase === 'Converteu') {
            creativeGroups[cleanName].crmVendas++;
          }
          if (activePhases.includes(lead.phase)) {
            creativeGroups[cleanName].crmConversas++;
          }
          if (lead.anuncio_preview && !creativeGroups[cleanName].previewUrl) {
            creativeGroups[cleanName].previewUrl = lead.anuncio_preview;
          }
        }
      }
    });

    let creativeList = Object.values(creativeGroups);

    // Filtrar pela busca textual
    const query = this.state.creativeSearchQuery || '';
    if (query) {
      creativeList = creativeList.filter(c => c.name.toLowerCase().includes(query));
    }

    if (counterEl) {
      counterEl.textContent = `${creativeList.length} criativos encontrados`;
    }

    if (creativeList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align: center; padding: 40px; color: var(--text-secondary);">
            Nenhum criativo encontrado com os filtros atuais.
          </td>
        </tr>
      `;
      return;
    }

    // Ordena por investimento decrescente
    creativeList.sort((a, b) => b.spend - a.spend);

    let html = '';
    creativeList.forEach(c => {
      const costPerConvIniciada = c.conversasMeta > 0 ? (c.spend / c.conversasMeta) : 0;
      const costPerConvReal = c.crmConversas > 0 ? (c.spend / c.crmConversas) : 0;
      const cpl = c.crmLeads > 0 ? (c.spend / c.crmLeads) : 0;
      const cac = c.crmVendas > 0 ? (c.spend / c.crmVendas) : 0;

      const formattedSpend = 'R$ ' + c.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formattedCpaMeta = c.conversasMeta > 0 
        ? 'R$ ' + costPerConvIniciada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '-';
      const formattedCpaCrm = c.crmConversas > 0 
        ? 'R$ ' + costPerConvReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '-';
      const formattedCpl = c.crmLeads > 0 
        ? 'R$ ' + cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '-';
      const formattedCac = c.crmVendas > 0 
        ? 'R$ ' + cac.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '-';

      let previewHtml = '-';
      if (c.previewUrl) {
        previewHtml = `
          <a href="${c.previewUrl}" target="_blank" class="btn-preview-link" title="Visualizar anúncio" style="color: var(--primary); display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: rgba(0, 242, 254, 0.1); transition: all 0.2s;">
            <i class="fa-solid fa-eye" style="font-size: 0.85rem;"></i>
          </a>
        `;
      }

      html += `
        <tr>
          <td style="text-align: center; vertical-align: middle; padding: 10px;">${previewHtml}</td>
          <td style="padding: 10px; font-weight: 600; color: #fff;">${c.name}</td>
          <td style="padding: 10px; text-align: right;">${c.clicks.toLocaleString('pt-BR')}</td>
          <td style="padding: 10px; text-align: right; font-weight: 600; color: var(--primary);">${c.conversasMeta.toLocaleString('pt-BR')}</td>
          <td style="padding: 10px; text-align: right; font-weight: 600; color: var(--primary);">${c.crmConversas.toLocaleString('pt-BR')}</td>
          <td style="padding: 10px; text-align: right; font-weight: 600; color: var(--success);">${c.crmLeads.toLocaleString('pt-BR')}</td>
          <td style="padding: 10px; text-align: right; font-weight: 600; color: var(--success);">${c.crmVendas.toLocaleString('pt-BR')}</td>
          <td style="padding: 10px; text-align: right;">${formattedCpaMeta}</td>
          <td style="padding: 10px; text-align: right; font-weight: 600;">${formattedCpaCrm}</td>
          <td style="padding: 10px; text-align: right;">${formattedCpl}</td>
          <td style="padding: 10px; text-align: right; font-weight: 600; color: var(--accent-2);">${formattedCac}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  },

  exportCreativesToCSV: function() {
    let creatives = this.state.metaData ? (this.state.metaData.creatives || []) : [];

    if (this.state.selectedMetaCampaignId) {
      creatives = creatives.filter(c => c.campaign_id === this.state.selectedMetaCampaignId);
    }
    if (this.state.selectedMetaAdsetId) {
      creatives = creatives.filter(c => c.adset_id === this.state.selectedMetaAdsetId);
    }

    const creativeGroups = {};
    creatives.forEach(ad => {
      const cleanName = ad.ad_name.replace(/\s*\[V\d+\]$/i, '').trim();
      if (!creativeGroups[cleanName]) {
        creativeGroups[cleanName] = {
          name: cleanName,
          spend: 0,
          clicks: 0,
          conversasMeta: 0,
          crmLeads: 0,
          crmConversas: 0,
          crmVendas: 0,
          previewUrl: ''
        };
      }
      creativeGroups[cleanName].spend += parseFloat(ad.spend || 0);
      creativeGroups[cleanName].clicks += parseInt(ad.clicks || 0);
      creativeGroups[cleanName].conversasMeta += parseInt(ad.conversas || 0);
    });

    const activePhases = ['Cliente em potencial', 'Proposta enviada', 'Converteu', 'Perdido'];
    this.state.filteredLeads.forEach(lead => {
      const creativeCrmName = (lead.creative || '').trim();
      if (!creativeCrmName) return;

      const key = Object.keys(creativeGroups).find(k => k.toLowerCase() === creativeCrmName.toLowerCase());
      if (key) {
        creativeGroups[key].crmLeads++;
        if (lead.phase === 'Converteu') creativeGroups[key].crmVendas++;
        if (activePhases.includes(lead.phase)) creativeGroups[key].crmConversas++;
        if (lead.anuncio_preview && !creativeGroups[key].previewUrl) {
          creativeGroups[key].previewUrl = lead.anuncio_preview;
        }
      } else {
        let campaignMatch = true;
        let adsetMatch = true;
        
        if (this.state.selectedMetaCampaignId) {
          const camp = (this.state.metaData?.campaigns || []).find(c => c.campaign_id === this.state.selectedMetaCampaignId);
          if (camp && lead.campaign) {
            campaignMatch = lead.campaign.toLowerCase() === camp.campaign_name.toLowerCase();
          } else {
            campaignMatch = false;
          }
        }
        if (this.state.selectedMetaAdsetId) {
          const adset = (this.state.metaData?.adsets || []).find(a => a.adset_id === this.state.selectedMetaAdsetId);
          if (adset && lead.adset) {
            adsetMatch = lead.adset.toLowerCase() === adset.adset_name.toLowerCase();
          } else {
            adsetMatch = false;
          }
        }

        if (campaignMatch && adsetMatch) {
          const cleanName = creativeCrmName.replace(/\s*\[V\d+\]$/i, '').trim();
          if (!creativeGroups[cleanName]) {
            creativeGroups[cleanName] = {
              name: cleanName,
              spend: 0,
              clicks: 0,
              conversasMeta: 0,
              crmLeads: 0,
              crmConversas: 0,
              crmVendas: 0,
              previewUrl: lead.anuncio_preview || ''
            };
          }
          creativeGroups[cleanName].crmLeads++;
          if (lead.phase === 'Converteu') creativeGroups[cleanName].crmVendas++;
          if (activePhases.includes(lead.phase)) creativeGroups[cleanName].crmConversas++;
          if (lead.anuncio_preview && !creativeGroups[cleanName].previewUrl) {
            creativeGroups[cleanName].previewUrl = lead.anuncio_preview;
          }
        }
      }
    });

    let creativeList = Object.values(creativeGroups);
    const query = this.state.creativeSearchQuery || '';
    if (query) {
      creativeList = creativeList.filter(c => c.name.toLowerCase().includes(query));
    }

    if (creativeList.length === 0) {
      alert('Nenhum dado de criativo disponível para exportar.');
      return;
    }

    creativeList.sort((a, b) => b.spend - a.spend);

    const headers = [
      'Criativo', 'Cliques', 'Conversas Iniciadas (Meta)', 'Conversas Reais (Planilha)',
      'Leads (Planilha)', 'Vendas (Planilha)', 'Custo/Conv. Iniciada', 'Custo/Conv. Real',
      'Custo/Lead', 'Custo/Venda', 'Link Preview'
    ];

    const rows = creativeList.map(c => {
      const costPerConvIniciada = c.conversasMeta > 0 ? (c.spend / c.conversasMeta) : 0;
      const costPerConvReal = c.crmConversas > 0 ? (c.spend / c.crmConversas) : 0;
      const cpl = c.crmLeads > 0 ? (c.spend / c.crmLeads) : 0;
      const cac = c.crmVendas > 0 ? (c.spend / c.crmVendas) : 0;

      return [
        c.name,
        c.clicks,
        c.conversasMeta,
        c.crmConversas,
        c.crmLeads,
        c.crmVendas,
        c.conversasMeta > 0 ? costPerConvIniciada.toFixed(2) : '-',
        c.crmConversas > 0 ? costPerConvReal.toFixed(2) : '-',
        c.crmLeads > 0 ? cpl.toFixed(2) : '-',
        c.crmVendas > 0 ? cac.toFixed(2) : '-',
        c.previewUrl || '-'
      ];
    });

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(";") + "\n";
    rows.forEach(row => {
      const sanitizedRow = row.map(val => {
        const clean = String(val || '').replace(/"/g, '""');
        return `"${clean}"`;
      });
      csvContent += sanitizedRow.join(";") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `criativos_${this.state.selectedClient.toLowerCase().replace(/ /g, '_')}_export.csv`;
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
      
      let iconHtml = '';
      if (type === 'ERROR') iconHtml = '<i class="fa-solid fa-circle-xmark" style="color: #ef4444; font-size: 0.8rem; margin-top: 3px;"></i>';
      else if (type === 'WARNING') iconHtml = '<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b; font-size: 0.8rem; margin-top: 3px;"></i>';
      else if (type === 'SUCCESS') iconHtml = '<i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 0.8rem; margin-top: 3px;"></i>';
      else iconHtml = '<i class="fa-solid fa-circle-info" style="color: #60a5fa; font-size: 0.8rem; margin-top: 3px;"></i>';

      const logEntry = document.createElement('div');
      logEntry.className = `log-entry ${type.toLowerCase()}`;
      logEntry.innerHTML = `
        <span class="log-time">[${timeStr}]</span>
        <span class="log-icon" style="flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 14px;">${iconHtml}</span>
        <span class="log-source">[${source}]</span>
        <span class="log-message" style="word-break: break-word;">${message}</span>
      `;
      
      consoleOutput.appendChild(logEntry);
      
      // Limita número máximo de logs na tela a 300 por questões de performance
      if (consoleOutput.children.length > 300) {
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
  },

  // Abre o modal de Contas do Meta Ads carregando os dados do backend
  openMetaAccountsModal: async function() {
    this.showLoader(true, 'Buscando contas de anúncios no Facebook...');
    document.getElementById('input-search-accounts').value = '';
    
    try {
      this.log('INFO', 'Meta API v25.0', 'Carregando lista de contas de anúncios do Facebook...');
      
      const response = await fetch(`/api/meta-accounts?clientName=${encodeURIComponent(this.state.selectedClient)}&demo=${this.state.isDemoMode}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `[Status ${response.status}] Erro ao buscar contas.`);
      }

      this.state.metaAccounts = await response.json();
      this.state.filteredMetaAccounts = [...this.state.metaAccounts];

      this.log('SUCCESS', 'Meta API v25.0', `Contas de anúncios carregadas: ${this.state.metaAccounts.length} encontradas.`);
      
      // Atualiza títulos do modal
      document.getElementById('mapped-client-title').textContent = this.state.selectedClient;
      
      // Renderiza os cards
      this.renderMetaAccountsGrid();
      
      this.showLoader(false);
      document.getElementById('meta-accounts-modal').classList.add('active');
    } catch (err) {
      this.showLoader(false);
      this.log('ERROR', 'Meta API v25.0', `Falha ao obter contas de anúncios: ${err.message}`);
      alert(`Falha ao obter contas de anúncios do Meta: ${err.message}`);
    }
  },

  // Renderiza o grid de cards de contas do Meta de forma reativa
  renderMetaAccountsGrid: function() {
    const grid = document.getElementById('meta-accounts-grid');
    grid.innerHTML = '';

    if (this.state.filteredMetaAccounts.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
          Nenhuma conta encontrada com o termo buscado.
        </div>
      `;
      return;
    }

    this.state.filteredMetaAccounts.forEach(account => {
      const card = document.createElement('div');
      card.className = 'account-card';
      
      card.innerHTML = `
        <div class="facebook-icon-circle">
          <i class="fa-brands fa-facebook-f"></i>
        </div>
        <div class="account-info">
          <div class="account-name" title="${account.name}">${account.name}</div>
          <div class="account-id">ID: ${account.id}</div>
          <div class="instagram-tag">
            <i class="fa-brands fa-instagram"></i>
            <span>Insta: ${account.instagram || 'Não vinculado'}</span>
          </div>
        </div>
      `;

      // Evento de clique para mapear a conta ao cliente
      card.addEventListener('click', () => {
        this.mapMetaAccountToClient(account.id, account.name, account.instagram);
      });

      grid.appendChild(card);
    });
  },

  // Salva o mapeamento no servidor e recarrega os dados do cliente
  mapMetaAccountToClient: async function(adAccountId, adAccountName, instagramUsername) {
    this.showLoader(true, `Vinculando '${adAccountName}' ao cliente '${this.state.selectedClient}'...`);
    
    try {
      this.log('INFO', 'System', `Enviando mapeamento do cliente '${this.state.selectedClient}' para conta Meta '${adAccountName}'...`);
      
      const response = await fetch('/api/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drive_client_name: this.state.selectedClient,
          meta_ad_account_id: adAccountId,
          meta_ad_account_name: adAccountName,
          instagram_username: instagramUsername
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `[Status ${response.status}] Falha ao registrar mapeamento.`);
      }

      this.log('SUCCESS', 'System', `Cliente '${this.state.selectedClient}' associado com sucesso à conta '${adAccountName}' (ID: ${adAccountId}).`);
      
      // Fecha o modal
      document.getElementById('meta-accounts-modal').classList.remove('active');
      
      // Recarrega todos os dados do cliente ativo
      await this.loadClientData();
      this.showLoader(false);
    } catch (err) {
      this.showLoader(false);
      this.log('ERROR', 'System', `Erro ao associar conta do Meta: ${err.message}`);
      alert(`Erro ao vincular conta: ${err.message}`);
    }
  },

  // Verifica e atualiza visualmente o card de status de conexão do Google Drive
  checkGoogleStatus: async function() {
    try {
      const response = await fetch('/api/google/status');
      if (!response.ok) throw new Error();
      
      const data = await response.json();
      
      const card = document.getElementById('google-connection-card');
      const icon = document.getElementById('google-connection-icon');
      const title = document.getElementById('google-connection-title');
      const desc = document.getElementById('google-connection-desc');
      const btn = document.getElementById('btn-google-toggle-connect');

      if (data.connected) {
        // Estado Conectado (Corrente Verde)
        icon.style.background = 'rgba(16, 185, 129, 0.1)';
        icon.style.borderColor = 'rgba(16, 185, 129, 0.2)';
        icon.style.color = '#10b981';
        icon.innerHTML = '<i class="fa-solid fa-link"></i>';
        
        title.textContent = 'Google Drive Ativo';
        desc.textContent = 'Arquivos restritos liberados';
        desc.style.color = '#10b981';
        
        btn.textContent = 'Desconectar';
        btn.style.background = 'rgba(239, 68, 68, 0.1)';
        btn.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        btn.style.color = '#ef4444';
        btn.dataset.action = 'disconnect';
      } else {
        // Estado Desconectado (Corrente Cinza/Vermelha)
        icon.style.background = 'rgba(239, 68, 68, 0.1)';
        icon.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        icon.style.color = '#ef4444';
        icon.innerHTML = '<i class="fa-solid fa-link-slash"></i>';
        
        title.textContent = 'Google Drive Inativo';
        desc.textContent = 'Requer autenticação OAuth2';
        desc.style.color = 'var(--text-secondary)';
        
        btn.textContent = 'Conectar';
        btn.style.background = 'var(--primary)';
        btn.style.borderColor = 'transparent';
        btn.style.color = '#fff';
        btn.dataset.action = 'connect';
      }
    } catch (err) {
      console.error("Erro ao verificar status do Google Drive:", err);
    }
  },

  // Renderiza a tabela exploradora de breakdowns do Meta
  renderExplorerTable: function() {
    const tableHeader = document.getElementById('explorer-table-header');
    const tableBody = document.getElementById('explorer-table-body');
    if (!tableHeader || !tableBody) return;

    const level = this.state.explorerLevel || 'campaign';
    const query = this.state.explorerSearch || '';

    let headersHtml = '';
    let dataRows = [];

    let levelLabel = 'Campanha';
    if (level === 'adset') levelLabel = 'Conjunto de Anúncios';
    else if (level === 'creative') levelLabel = 'Criativo (Anúncio)';

    headersHtml = `
      <th style="padding: 10px 12px;">${levelLabel}</th>
      <th style="padding: 10px 12px; text-align: right;">Investido</th>
      <th style="padding: 10px 12px; text-align: right;">Cliques</th>
      <th style="padding: 10px 12px; text-align: right;">Resultados</th>
      <th style="padding: 10px 12px; text-align: right;">Conversas</th>
      <th style="padding: 10px 12px; text-align: right;">Custo por Lead</th>
    `;

    if (level === 'campaign') {
      dataRows = this.state.metaData ? (this.state.metaData.campaigns || []) : [];
    } else if (level === 'adset') {
      dataRows = this.state.metaData ? (this.state.metaData.adsets || []) : [];
    } else {
      dataRows = this.state.metaData ? (this.state.metaData.creatives || []) : [];
    }

    tableHeader.innerHTML = headersHtml;

    if (query) {
      dataRows = dataRows.filter(row => {
        const name = (row.campaign_name || row.adset_name || row.ad_name || '').toLowerCase();
        return name.includes(query);
      });
    }

    if (dataRows.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    let tbodyHtml = '';
    dataRows.forEach(row => {
      let isSelected = false;
      let rowId = '';
      let displayName = '';
      let subName = '';

      if (level === 'campaign') {
        rowId = row.campaign_id;
        displayName = row.campaign_name;
        isSelected = this.state.selectedMetaCampaignId === rowId;
      } else if (level === 'adset') {
        rowId = row.adset_id;
        displayName = row.adset_name;
        subName = row.campaign_name;
        isSelected = this.state.selectedMetaAdsetId === rowId;
      } else {
        rowId = row.ad_id;
        displayName = row.ad_name;
        subName = row.adset_name;
        isSelected = this.state.selectedMetaAdId === rowId;
      }

      // Filtrar as leads locais do CRM para calcular a conversão real na planilha
      let crmLeadsCount = 0;
      if (level === 'campaign') {
        crmLeadsCount = this.state.leads.filter(l => 
          l.campaign && l.campaign.toLowerCase() === displayName.toLowerCase()
        ).length;
      } else if (level === 'adset') {
        crmLeadsCount = this.state.leads.filter(l => 
          l.adset && l.adset.toLowerCase() === displayName.toLowerCase()
        ).length;
      } else {
        const cleanAdName = displayName.replace(/\s*\[V\d+\]$/, '').toLowerCase();
        crmLeadsCount = this.state.leads.filter(l => 
          l.creative && (l.creative.toLowerCase() === displayName.toLowerCase() || l.creative.toLowerCase() === cleanAdName)
        ).length;
      }

      const cpl = crmLeadsCount > 0 ? (row.spend / crmLeadsCount) : 0;

      const formattedSpend = 'R$ ' + row.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formattedCpl = crmLeadsCount > 0 
        ? 'R$ ' + cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '-';

      const conversasCell = `${row.conversas} (${crmLeadsCount})`;

      tbodyHtml += `
        <tr class="${isSelected ? 'selected-row' : ''}" data-id="${rowId}">
          <td style="padding: 10px 12px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <div style="font-weight: 600; color: #fff;">${displayName}</div>
            ${subName ? `<div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">${subName}</div>` : ''}
          </td>
          <td style="padding: 10px 12px; text-align: right;">${formattedSpend}</td>
          <td style="padding: 10px 12px; text-align: right;">${row.clicks.toLocaleString('pt-BR')}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--primary);">${row.conversas.toLocaleString('pt-BR')}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--primary);">${conversasCell}</td>
          <td style="padding: 10px 12px; text-align: right;">${formattedCpl}</td>
        </tr>
      `;
    });

    tableBody.innerHTML = tbodyHtml;

    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(r => {
      r.addEventListener('click', (e) => {
        const id = r.dataset.id;
        if (!id) return;
        this.selectMetaRow(id);
      });
    });
  },

  // Gerencia clique em uma linha da tabela exploradora
  selectMetaRow: function(id) {
    const level = this.state.explorerLevel;

    if (level === 'campaign') {
      if (this.state.selectedMetaCampaignId === id) {
        this.state.selectedMetaCampaignId = null;
      } else {
        this.state.selectedMetaCampaignId = id;
      }
      this.state.selectedMetaAdsetId = null;
      this.state.selectedMetaAdId = null;
    } else if (level === 'adset') {
      if (this.state.selectedMetaAdsetId === id) {
        this.state.selectedMetaAdsetId = null;
      } else {
        this.state.selectedMetaAdsetId = id;
        const adset = (this.state.metaData.adsets || []).find(a => a.adset_id === id);
        if (adset) this.state.selectedMetaCampaignId = adset.campaign_id;
      }
      this.state.selectedMetaAdId = null;
    } else {
      if (this.state.selectedMetaAdId === id) {
        this.state.selectedMetaAdId = null;
      } else {
        this.state.selectedMetaAdId = id;
        const creative = (this.state.metaData.creatives || []).find(c => c.ad_id === id);
        if (creative) {
          this.state.selectedMetaAdsetId = creative.adset_id;
          this.state.selectedMetaCampaignId = creative.campaign_id;
        }
      }
    }

    const clearBtn = document.getElementById('btn-clear-meta-filters');
    if (this.state.selectedMetaCampaignId || this.state.selectedMetaAdsetId || this.state.selectedMetaAdId) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }

    this.renderExplorerTable();
    this.updateMetaAuditCharts();
    this.syncCrmLeadsFilter();
  },

  // Dispara atualização nos gráficos da seção de Auditoria
  updateMetaAuditCharts: function() {
    ChartsManager.updateMetaAudit(
      this.state.metaData,
      this.state.selectedMetaCampaignId,
      this.state.selectedMetaAdsetId,
      this.state.selectedMetaAdId,
      this.state.leads
    );
  },

  // Limpa todos os filtros ativos do Meta Ads
  clearMetaFilters: function() {
    this.state.selectedMetaCampaignId = null;
    this.state.selectedMetaAdsetId = null;
    this.state.selectedMetaAdId = null;

    document.getElementById('btn-clear-meta-filters').classList.add('hidden');

    this.renderExplorerTable();
    this.updateMetaAuditCharts();
    this.syncCrmLeadsFilter();
  },

  // Sincroniza o filtro com as leads locais do CRM (tabela inferior e outros gráficos)
  syncCrmLeadsFilter: function() {
    let campaignName = null;
    let adsetName = null;
    let creativeName = null;

    if (this.state.selectedMetaCampaignId && this.state.metaData) {
      const camp = (this.state.metaData.campaigns || []).find(c => c.campaign_id === this.state.selectedMetaCampaignId);
      if (camp) campaignName = camp.campaign_name.toLowerCase();
    }
    if (this.state.selectedMetaAdsetId && this.state.metaData) {
      const adset = (this.state.metaData.adsets || []).find(a => a.adset_id === this.state.selectedMetaAdsetId);
      if (adset) adsetName = adset.adset_name.toLowerCase();
    }
    if (this.state.selectedMetaAdId && this.state.metaData) {
      const ad = (this.state.metaData.creatives || []).find(c => c.ad_id === this.state.selectedMetaAdId);
      if (ad) creativeName = ad.ad_name.toLowerCase();
    }

    let leadsToFilter = [...this.state.leads];

    if (this.state.startDate && this.state.endDate) {
      leadsToFilter = leadsToFilter.filter(lead => {
        const leadDate = lead._parsedDate;
        return leadDate && leadDate >= this.state.startDate && leadDate <= this.state.endDate;
      });
    }

    if (campaignName) {
      leadsToFilter = leadsToFilter.filter(l => l.campaign && l.campaign.toLowerCase() === campaignName);
    }
    if (adsetName) {
      leadsToFilter = leadsToFilter.filter(l => l.adset && l.adset.toLowerCase() === adsetName);
    }
    if (creativeName) {
      const cleanCreativeName = creativeName.replace(/\s*\[v\d+\]$/, '');
      leadsToFilter = leadsToFilter.filter(l => l.creative && (l.creative.toLowerCase() === creativeName || l.creative.toLowerCase() === cleanCreativeName));
    }

    if (this.state.searchQuery) {
      leadsToFilter = leadsToFilter.filter(lead => {
        return (
          (lead.name && lead.name.toLowerCase().includes(this.state.searchQuery)) ||
          (lead.phone && lead.phone.includes(this.state.searchQuery)) ||
          (lead.phase && lead.phase.toLowerCase().includes(this.state.searchQuery))
        );
      });
    }

    this.state.filteredLeads = leadsToFilter;
    this.updateKPIs();
    
    ChartsManager.updateCharts(this.state.filteredLeads);
    ChartsManager.updateUtmRanking(this.state.filteredLeads, this.state.activeUtmTab);
    
    this.renderCreativePerformanceTable();
  }
};

// Inicialização imediata ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
