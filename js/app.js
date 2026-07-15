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
    selectedMetaAdId: null,
    
    // Milestone 3 keys
    comparisonSlots: [null, null, null],
    showFunnelAbsolute: false,
    activeVideoCreative: null,

    leadsSortDirection: 'desc',
    pixelId: '1234567890',
    leads: [],
    filteredLeads: [],

    currentView: 'view-geral',
    isSidebarExpanded: localStorage.getItem('sidebar_expanded') !== null
      ? localStorage.getItem('sidebar_expanded') === 'true'
      : window.innerWidth > 768
  },
  logCount: 0,

  switchView: function(viewId) {
    console.log('[DEBUG] switchView called with viewId:', viewId);
    this.state.currentView = viewId;
    if (viewId === 'view-ai') {
      this.checkAiClientStatus();
    }
    
    // Update URL hash
    const hash = viewId.replace('view-', '');
    if (window.location.hash !== '#' + hash) {
      window.location.hash = hash;
    }
    
    // Toggle active/hidden classes on the views
    document.querySelectorAll('.dashboard-view').forEach(view => {
      if (view.id === viewId) {
        view.classList.remove('hidden');
        console.log('[DEBUG] Removed hidden from view:', view.id, 'class list is now:', view.className);
        try {
          const tbl = document.getElementById('leads-spreadsheet-table');
          if (tbl) {
            console.log('[DEBUG] table display:', window.getComputedStyle(tbl).display);
            console.log('[DEBUG] table parent display:', window.getComputedStyle(tbl.parentElement).display);
            console.log('[DEBUG] view display:', window.getComputedStyle(view).display);
            console.log('[DEBUG] dashboard-screen display:', window.getComputedStyle(document.getElementById('dashboard-screen')).display);
            console.log('[DEBUG] table width/height/opacity/visibility:', tbl.offsetWidth, tbl.offsetHeight, window.getComputedStyle(tbl).opacity, window.getComputedStyle(tbl).visibility);
            console.log('[DEBUG] table parent width/height/opacity/visibility:', tbl.parentElement.offsetWidth, tbl.parentElement.offsetHeight, window.getComputedStyle(tbl.parentElement).opacity, window.getComputedStyle(tbl.parentElement).visibility);
            console.log('[DEBUG] view-leads width/height/opacity/visibility:', view.offsetWidth, view.offsetHeight, window.getComputedStyle(view).opacity, window.getComputedStyle(view).visibility);
            console.log('[DEBUG] dashboard-screen width/height/opacity/visibility:', document.getElementById('dashboard-screen').offsetWidth, document.getElementById('dashboard-screen').offsetHeight, window.getComputedStyle(document.getElementById('dashboard-screen')).opacity, window.getComputedStyle(document.getElementById('dashboard-screen')).visibility);
            const content = document.querySelector('.dashboard-content');
            if (content) {
              console.log('[DEBUG] dashboard-content width/height/opacity/visibility/display:', content.offsetWidth, content.offsetHeight, window.getComputedStyle(content).opacity, window.getComputedStyle(content).visibility, window.getComputedStyle(content).display);
            }
            console.log('[DEBUG] view-leads outerHTML:', view.outerHTML.substring(0, 300));
            setTimeout(() => {
              try {
                console.log('[DEBUG-DELAYED] table display/width/height/opacity/visibility:', window.getComputedStyle(tbl).display, tbl.offsetWidth, tbl.offsetHeight, window.getComputedStyle(tbl).opacity, window.getComputedStyle(tbl).visibility);
                console.log('[DEBUG-DELAYED] table parent display/width/height/opacity/visibility:', window.getComputedStyle(tbl.parentElement).display, tbl.parentElement.offsetWidth, tbl.parentElement.offsetHeight, window.getComputedStyle(tbl.parentElement).opacity, window.getComputedStyle(tbl.parentElement).visibility);
                console.log('[DEBUG-DELAYED] view display/width/height/opacity/visibility:', window.getComputedStyle(view).display, view.offsetWidth, view.offsetHeight, window.getComputedStyle(view).opacity, window.getComputedStyle(view).visibility);
                if (content) console.log('[DEBUG-DELAYED] dashboard-content display/width/height/opacity/visibility:', window.getComputedStyle(content).display, content.offsetWidth, content.offsetHeight, window.getComputedStyle(content).opacity, window.getComputedStyle(content).visibility);
                
                // Log children of view-leads
                Array.from(view.children).forEach((child, i) => {
                  console.log(`[DEBUG-CHILD-${i}] tag/class/id:`, child.tagName, child.className, child.id);
                  console.log(`[DEBUG-CHILD-${i}] display/width/height/opacity/visibility:`, window.getComputedStyle(child).display, child.offsetWidth, child.offsetHeight, window.getComputedStyle(child).opacity, window.getComputedStyle(child).visibility);
                  // Log grandchild recursive if possible
                  if (child.children.length > 0) {
                    Array.from(child.children).forEach((gchild, j) => {
                      console.log(`[DEBUG-GCHILD-${i}-${j}] tag/class/id:`, gchild.tagName, gchild.className, gchild.id);
                      console.log(`[DEBUG-GCHILD-${i}-${j}] display/width/height/opacity/visibility:`, window.getComputedStyle(gchild).display, gchild.offsetWidth, gchild.offsetHeight, window.getComputedStyle(gchild).opacity, window.getComputedStyle(gchild).visibility);
                    });
                  }
                });
              } catch (err) {
                console.log('[DEBUG-DELAYED] Error:', err.message);
              }
            }, 500);
          }
        } catch (e) {
          console.log('[DEBUG] Error getting computed styles:', e.message);
        }
      } else {
        view.classList.add('hidden');
      }
    });

    // Update active state in sidebar nav items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      if (item.dataset.view === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Dispatch resize event immediately and after 100ms to trigger ApexCharts re-render
    window.dispatchEvent(new Event('resize'));
    if (typeof ChartsManager !== 'undefined' && ChartsManager.instances) {
      Object.values(ChartsManager.instances).forEach(chart => {
        if (chart && typeof chart.updateOptions === 'function') {
          // Force size recalculation when view switches from hidden to visible
          chart.updateOptions({}, false, false, false);
        } else if (chart && typeof chart.render === 'function') {
          chart.render();
        }
      });
    }
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      if (typeof ChartsManager !== 'undefined' && ChartsManager.instances) {
        Object.values(ChartsManager.instances).forEach(chart => {
          if (chart && typeof chart.updateOptions === 'function') {
            chart.updateOptions({}, false, false, false);
          }
        });
      }
    }, 150);
  },

  handleHashChange: function() {
    const hash = window.location.hash.substring(1);
    const validViews = ['geral', 'campaign', 'video', 'leads', 'events', 'ai'];
    if (validViews.includes(hash)) {
      this.switchView('view-' + hash);
    } else {
      this.switchView('view-geral');
    }
  },

  toggleSidebar: function() {
    this.state.isSidebarExpanded = !this.state.isSidebarExpanded;
    localStorage.setItem('sidebar_expanded', String(this.state.isSidebarExpanded));
    const sidebar = document.getElementById('sidebar');
    const toggleIcon = document.querySelector('#btn-sidebar-toggle i');
    const layout = document.querySelector('.dashboard-layout');
    
    if (this.state.isSidebarExpanded) {
      sidebar.classList.add('expanded');
      sidebar.classList.remove('collapsed');
      if (layout) layout.classList.add('sidebar-expanded');
      if (toggleIcon) {
        toggleIcon.classList.remove('fa-chevron-right');
        toggleIcon.classList.add('fa-chevron-left');
      }
    } else {
      sidebar.classList.remove('expanded');
      sidebar.classList.add('collapsed');
      if (layout) layout.classList.remove('sidebar-expanded');
      if (toggleIcon) {
        toggleIcon.classList.remove('fa-chevron-left');
        toggleIcon.classList.add('fa-chevron-right');
      }
    }
    
    // Dispatch resize event to recalculate charts
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  },

  // Inicializa o Dashboard
  init: function() {
    // Inicializa a sidebar
    const sidebar = document.getElementById('sidebar');
    const layout = document.querySelector('.dashboard-layout');
    if (sidebar) {
      if (this.state.isSidebarExpanded) {
        sidebar.classList.add('expanded');
        sidebar.classList.remove('collapsed');
        if (layout) layout.classList.add('sidebar-expanded');
      } else {
        sidebar.classList.remove('expanded');
        sidebar.classList.add('collapsed');
        if (layout) layout.classList.remove('sidebar-expanded');
      }
    }

    // Listen to URL hash changes
    window.addEventListener('hashchange', () => {
      this.handleHashChange();
    });

    this.setupEventListeners();
    
    // Parse initial URL hash
    if (window.location.hash) {
      this.handleHashChange();
    } else {
      this.switchView('view-geral');
    }

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
    
    this.initComparisonAndFunnel();
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
      this.checkAiClientStatus();
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

    // Modal de Controle VPS & Logs (Redireciona para a View de Eventos)
    document.getElementById('btn-settings').addEventListener('click', () => {
      this.switchView('view-events');
      document.getElementById('modal-settings').classList.add('active');
      this.checkGoogleStatus(); // Busca status dinâmico do Google na VPS
    });

    document.getElementById('btn-close-modal').addEventListener('click', () => {
      document.getElementById('modal-settings').classList.remove('active');
    });

    document.getElementById('btn-reload-dashboard').addEventListener('click', () => {
      this.log('INFO', 'System', 'Recarregando dados do servidor VPS...');
      document.getElementById('modal-settings').classList.remove('active');
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

    // Ouvintes para a Sidebar e Troca de Views
    const sidebarItems = document.querySelectorAll('.sidebar-nav .nav-item');
    sidebarItems.forEach((item, index) => {
      item.addEventListener('click', (e) => {
        const viewId = e.currentTarget.dataset.view;
        if (viewId) {
          window.location.hash = viewId.replace('view-', '');
        }
      });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = (index + 1) % sidebarItems.length;
          sidebarItems[nextIndex].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = (index - 1 + sidebarItems.length) % sidebarItems.length;
          sidebarItems[prevIndex].focus();
        }
      });
    });

    const btnSidebarToggle = document.getElementById('btn-sidebar-toggle');
    if (btnSidebarToggle) {
      btnSidebarToggle.addEventListener('click', () => {
        this.toggleSidebar();
      });
    }

    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
      mainContainer.addEventListener('click', () => {
        if (window.innerWidth <= 768 && this.state.isSidebarExpanded) {
          this.toggleSidebar();
        }
      });
    }

    // --- CRM LEADS SPREADSHEET (Milestone 4) ---
    const leadsSearchEl = document.getElementById('leads-table-search');
    if (leadsSearchEl) {
      leadsSearchEl.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value.toLowerCase().trim();
        this.state.currentPage = 1;
        this.applyFilters(true); // skips meta insights fetch to keep it snappy
      });
    }

    // --- AI INSIGHTS VIEW (Milestone 5) ---
    const btnGenInsights = document.getElementById('btn-generate-insights');
    if (btnGenInsights) {
      btnGenInsights.addEventListener('click', () => {
        this.generateInsights();
      });
    }

    const btnSendChat = document.getElementById('btn-send-ai-chat');
    if (btnSendChat) {
      btnSendChat.addEventListener('click', () => {
        this.sendAiChat();
      });
    }

    const chatInput = document.getElementById('ai-chat-input');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendAiChat();
        }
      });
    }

    const dateHeader = document.querySelector('#leads-spreadsheet-table th[data-column="date"]');
    if (dateHeader) {
      dateHeader.addEventListener('click', () => {
        this.state.leadsSortDirection = this.state.leadsSortDirection === 'desc' ? 'asc' : 'desc';
        this.renderLeadsSpreadsheet();
      });
    }

    const leadsPrevBtn = document.getElementById('leads-pagination-prev');
    if (leadsPrevBtn) {
      leadsPrevBtn.addEventListener('click', () => {
        if (this.state.currentPage > 1) {
          this.state.currentPage--;
          this.renderLeadsSpreadsheet();
        }
      });
    }

    const leadsNextBtn = document.getElementById('leads-pagination-next');
    if (leadsNextBtn) {
      leadsNextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(this.state.filteredLeads.length / this.state.itemsPerPage);
        if (this.state.currentPage < totalPages) {
          this.state.currentPage++;
          this.renderLeadsSpreadsheet();
        }
      });
    }

    const leadsLastBtn = document.getElementById('leads-pagination-last');
    if (leadsLastBtn) {
      leadsLastBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(this.state.filteredLeads.length / this.state.itemsPerPage);
        if (this.state.currentPage < totalPages) {
          this.state.currentPage = totalPages;
          this.renderLeadsSpreadsheet();
        }
      });
    }

    const btnCloseLightbox = document.getElementById('btn-close-lightbox');
    if (btnCloseLightbox) {
      btnCloseLightbox.addEventListener('click', () => {
        const lightbox = document.getElementById('modal-lightbox');
        if (lightbox) {
          lightbox.style.display = 'none';
          lightbox.classList.remove('active');
        }
      });
    }

    const lightboxModal = document.getElementById('modal-lightbox');
    if (lightboxModal) {
      lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) {
          lightboxModal.style.display = 'none';
          lightboxModal.classList.remove('active');
        }
      });
    }

    const btnVideoFunnelShortcut = document.getElementById('btn-lightbox-video-funnel-shortcut');
    if (btnVideoFunnelShortcut) {
      btnVideoFunnelShortcut.addEventListener('click', () => {
        // Close lightbox
        const lightbox = document.getElementById('modal-lightbox');
        if (lightbox) {
          lightbox.style.display = 'none';
          lightbox.classList.remove('active');
        }
        
        // Update active video creative with stored dataset properties
        const cName = btnVideoFunnelShortcut.dataset.creativeName || 'Video_Depoimento_Produtor [V1]';
        const cFormat = btnVideoFunnelShortcut.dataset.format || 'video';
        const cMock = btnVideoFunnelShortcut.dataset.mock || '';
        
        this.state.activeVideoCreative = {
          id: 'mock_shortcut',
          name: cName,
          format: cFormat,
          mock: cMock
        };
        this.renderVideoFunnel();
        
        // Navigate to Campaign view where the video funnel chart is
        this.switchView('view-campaign');
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
          if (item.dataset.view === 'view-campaign') item.classList.add('active');
          else item.classList.remove('active');
        });
      });
    }

    // --- EVENT ANALYSIS VIEW (Milestone 4) ---
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const inputPixelId = document.getElementById('input-pixel-id');
    const pixelIdError = document.getElementById('pixel-id-validation-error');
    const pixelToast = document.getElementById('pixel-error-toast');

    if (inputPixelId) {
      inputPixelId.value = this.state.pixelId;
    }

    if (btnSaveSettings && inputPixelId) {
      btnSaveSettings.addEventListener('click', () => {
        const val = inputPixelId.value.trim();
        inputPixelId.classList.remove('error', 'border-red');
        if (pixelIdError) pixelIdError.style.display = 'none';
        if (pixelToast) pixelToast.style.display = 'none';

        if (val === '') {
          inputPixelId.classList.add('error', 'border-red');
          if (pixelIdError) {
            pixelIdError.textContent = 'Insira um ID de Pixel válido';
            pixelIdError.style.display = 'block';
          }
          return;
        }

        if (!/^\d+$/.test(val)) {
          if (pixelToast) {
            pixelToast.querySelector('.toast-message').textContent = 'ID do Pixel precisa ser apenas números';
            pixelToast.style.display = 'flex';
            setTimeout(() => {
              pixelToast.style.display = 'none';
            }, 5000);
          }
          return;
        }

        this.state.pixelId = val;
        const modal = document.getElementById('modal-settings');
        if (modal) {
          modal.classList.remove('active');
        }
        this.log('SUCCESS', 'Pixel Settings', `ID de Pixel ${val} salvo com sucesso.`);
      });
    }

    const btnLoadPixelEvents = document.getElementById('btn-load-pixel-events');
    if (btnLoadPixelEvents) {
      btnLoadPixelEvents.addEventListener('click', () => {
        const val = inputPixelId ? inputPixelId.value.trim() : '';
        if (val === '') {
          const settingsModal = document.getElementById('modal-settings');
          if (settingsModal) settingsModal.classList.add('active');
          if (inputPixelId) inputPixelId.classList.add('error', 'border-red');
          if (pixelIdError) {
            pixelIdError.textContent = 'Insira um ID de Pixel válido';
            pixelIdError.style.display = 'block';
          }
          return;
        }

        if (!/^\d+$/.test(val)) {
          const settingsModal = document.getElementById('modal-settings');
          if (settingsModal) settingsModal.classList.add('active');
          if (pixelToast) {
            pixelToast.querySelector('.toast-message').textContent = 'ID do Pixel precisa ser apenas números';
            pixelToast.style.display = 'flex';
            setTimeout(() => {
              pixelToast.style.display = 'none';
            }, 5000);
          }
          return;
        }

        this.state.pixelId = val;
        this.loadPixelEvents();
      });
    }

    const btnClearPixelEvents = document.getElementById('btn-clear-pixel-events');
    if (btnClearPixelEvents) {
      btnClearPixelEvents.addEventListener('click', () => {
        this.clearPixelEvents();
      });
    }

    // --- LEADS FILTERS (Platform / Status) ---
    const filterPlatformEl = document.getElementById('filter-leads-platform');
    if (filterPlatformEl) {
      filterPlatformEl.addEventListener('change', () => {
        this.state.leadsFilterPlatform = filterPlatformEl.value.toLowerCase();
        this.state.currentPage = 1;
        this.applyLeadsDisplayFilters();
      });
    }

    const filterStatusEl = document.getElementById('filter-leads-status');
    if (filterStatusEl) {
      filterStatusEl.addEventListener('change', () => {
        this.state.leadsFilterStatus = filterStatusEl.value.toLowerCase();
        this.state.currentPage = 1;
        this.applyLeadsDisplayFilters();
      });
    }

    // --- SETTINGS MODAL: disconnect/connect Google Drive & client folder mapping ---
    const btnDisconnect = document.getElementById('btn-disconnect-google-drive');
    if (btnDisconnect) {
      btnDisconnect.addEventListener('click', () => {
        // Clear Google Drive session and reset client selector
        sessionStorage.removeItem('google_token');
        const clientSelect = document.getElementById('select-client');
        if (clientSelect) {
          clientSelect.innerHTML = '<option value="">Conexão pendente</option>';
        }
        this.log('INFO', 'Google Auth', 'Google Drive desconectado pelo usuário.');
      });
    }

    const btnConnectGD = document.getElementById('btn-connect-google-drive');
    if (btnConnectGD) {
      btnConnectGD.addEventListener('click', () => {
        // In demo/test mode: simulate OAuth success inline
        this.log('INFO', 'Google Auth', 'Iniciando fluxo de autorização do Google Drive...');
        // The mock OAuth page check
        const mockAuthBtn = document.getElementById('btn-mock-authorize');
        if (mockAuthBtn) mockAuthBtn.click();
      });
    }

    const btnSaveMapping = document.getElementById('btn-save-mapping');
    if (btnSaveMapping) {
      btnSaveMapping.addEventListener('click', () => {
        const folderSel = document.getElementById('select-client-folder');
        const accountSel = document.getElementById('select-ad-account');
        const folderName = folderSel ? folderSel.options[folderSel.selectedIndex]?.text : '';
        const accountText = accountSel ? accountSel.options[accountSel.selectedIndex]?.text : '';
        if (folderName && folderName !== 'Selecione uma pasta...') {
          this.log('SUCCESS', 'Mapping', `Pasta '${folderName}' vinculada à conta '${accountText}'.`);
          // Also update the client select in header
          const clientSelect = document.getElementById('select-client');
          if (clientSelect) {
            let found = false;
            for (let i = 0; i < clientSelect.options.length; i++) {
              if (clientSelect.options[i].text === folderName) {
                clientSelect.value = clientSelect.options[i].value;
                found = true;
                break;
              }
            }
            if (!found) {
              const opt = document.createElement('option');
              opt.value = folderName;
              opt.text = folderName;
              clientSelect.add(opt);
              clientSelect.value = folderName;
            }
          }
          // Persist mapping
          fetch('/api/save-mapping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: folderName, account: accountText })
          }).catch(() => {});
        }
      });
    }

    // Generic close modal buttons
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = document.getElementById('modal-settings');
        if (modal) modal.classList.remove('active');
      });
    });

    // Mock OAuth authorize button (used by E2E tests to simulate Google Drive auth)
    const btnMockAuth = document.getElementById('btn-mock-authorize');
    if (btnMockAuth) {
      btnMockAuth.addEventListener('click', () => {
        this.log('SUCCESS', 'Google Auth', 'Autorização simulada do Google Drive concluída (modo demo).');
        // Populate client selector with mock folders
        const clientSelect = document.getElementById('select-client');
        if (clientSelect) {
          const mockFolders = ['AgroForte Sementes', 'NutriCampo Fertilizantes', 'Tratores Connect'];
          clientSelect.innerHTML = '';
          mockFolders.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.text = name;
            clientSelect.add(opt);
          });
          clientSelect.value = 'AgroForte Sementes';
          // Trigger change to load client data
          clientSelect.dispatchEvent(new Event('change'));
        }
      });
    }
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
      screen.classList.add('hidden');
    });
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active');
      screen.classList.remove('hidden');
    }
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
      await this.applyFilters();
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
    } else if (['division-by-zero-mock', 'current-zero-mock', 'outlier-delta-mock', 'equal-value-mock'].includes(type)) {
      this.state.startDate = new Date();
      this.state.endDate = new Date();
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

    const startVal = new Date(this.state.startDate.getFullYear(), this.state.startDate.getMonth(), this.state.startDate.getDate());
    const endVal = new Date(this.state.endDate.getFullYear(), this.state.endDate.getMonth(), this.state.endDate.getDate());
    const daysToShift = Math.round((endVal - startVal) / (1000 * 60 * 60 * 24)) + 1;

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
  applyFilters: async function(skipMetaFetch = false) {
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
      await this.fetchAndMergeMetaAds();
    }

    // Renderiza a tabela de desempenho de criativos
    this.renderCreativePerformanceTable();
    this.renderLeadsSpreadsheet();
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
      if (window._isHtml5Dragging || window._isPointerDragging) {
        window._pendingDraggablePopulation = true;
      } else {
        this.populateDraggableLists();
      }
      this.updateDeltaBadges();
      this.updateComparisonTable();

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
    const cplEl = document.getElementById('kpi-cpl');
    if (cplEl) {
      let textSpan = cplEl.querySelector('.cpl-value-text');
      if (!textSpan) {
        cplEl.innerHTML = `<span class="cpl-value-text">CPL Médio: R$ ${cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
      } else {
        textSpan.textContent = `CPL Médio: R$ ${cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    // Subtítulo da tendência da planilha
    const trendEl = document.getElementById('kpi-trend');
    if (trendEl) {
      trendEl.innerHTML = `<span>Total no período selecionado</span>`;
    }
    
    this.updateDeltaBadges();
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
      let creativeCrmName = '';
      const leadAdId = lead.utm_id || lead.ad_id;
      if (leadAdId) {
        const matchedAd = creatives.find(ad => String(ad.ad_id) === String(leadAdId));
        if (matchedAd) {
          creativeCrmName = matchedAd.ad_name.replace(/\s*\[V\d+\]$/i, '').trim();
        }
      }
      if (!creativeCrmName) {
        creativeCrmName = (lead.creative || '').trim();
      }
      if (!creativeCrmName) return;

      const targetName = creativeCrmName.replace(/\s*\[V\d+\]$/i, '').trim();
      const key = Object.keys(creativeGroups).find(k => k.toLowerCase() === targetName.toLowerCase());
      
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
        crmLeadsCount = this.state.leads.filter(l => {
          const leadAdId = l.utm_id || l.ad_id;
          if (leadAdId && String(leadAdId) === String(rowId)) {
            return true;
          }
          const crmName = (l.creative || '').trim().toLowerCase();
          return crmName && (crmName === displayName.toLowerCase() || crmName === cleanAdName);
        }).length;
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
  },

  renderLeadsSpreadsheet: function() {
    console.log('[DEBUG] renderLeadsSpreadsheet called. filteredLeads count:', this.state.filteredLeads ? this.state.filteredLeads.length : 'undefined');
    const tbody = document.getElementById('leads-spreadsheet-body');
    const counterEl = document.getElementById('leads-table-counter');
    const placeholder = document.getElementById('leads-empty-placeholder');
    if (!tbody) {
      console.log('[DEBUG] tbody for leads spreadsheet not found!');
      return;
    }

    let leads = [...this.state.filteredLeads];

    const isAsc = this.state.leadsSortDirection === 'asc';
    leads.sort((a, b) => {
      const da = new Date(a.date).getTime() || 0;
      const db = new Date(b.date).getTime() || 0;
      return isAsc ? da - db : db - da;
    });

    if (counterEl) {
      counterEl.textContent = `${leads.length} leads encontrados`;
    }
    // Also sync the hidden #leads-counter used by WRK-04 test
    const leadsCounterEl = document.getElementById('leads-counter');
    if (leadsCounterEl) {
      leadsCounterEl.textContent = String(leads.length);
    }

    if (leads.length === 0) {
      tbody.innerHTML = '';
      if (placeholder) {
        placeholder.classList.remove('hidden');
        placeholder.style.display = 'block';
      }
      this.updateLeadsPagination(0);
      return;
    } else {
      if (placeholder) {
        placeholder.classList.add('hidden');
        placeholder.style.display = 'none';
      }
    }

    const totalItems = leads.length;
    const itemsPerPage = this.state.itemsPerPage || 10;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (this.state.currentPage > totalPages) {
      this.state.currentPage = Math.max(1, totalPages);
    }
    const startIndex = (this.state.currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedLeads = leads.slice(startIndex, endIndex);

    let html = '';
    paginatedLeads.forEach(lead => {
      const safeName = lead.name ? lead.name.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '—';
      const safePhone = lead.phone ? lead.phone.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '—';
      const safePlatform = lead.platform ? lead.platform.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '—';
      const safeDevice = lead.device ? lead.device.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '—';
      const safeStatus = lead.phase ? lead.phase.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '—';
      const safeDate = lead.date ? lead.date.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '—';

      const dataMockAttr = lead.mock_type ? ` data-mock="${lead.mock_type}"` : '';
      // Determine format: 'video' if creative name contains 'video'/'depoimento', or if lead has a format tag
      const isVideoFormat = (lead.creative && (lead.creative.toLowerCase().includes('video') || lead.creative.toLowerCase().includes('depoimento'))) ||
                            (lead.format && lead.format === 'video');
      const dataFormatAttr = isVideoFormat ? ' data-format="video"' : ' data-format="image"';

      html += `
        <tr${dataMockAttr}${dataFormatAttr}>
          <td style="text-align: center; vertical-align: middle; padding: 10px;">
            <div class="thumbnail-container" style="position: relative; width: 40px; height: 40px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
              <img class="ad-thumbnail" src="${lead.thumbnail_url || ''}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; cursor: pointer;" onerror="this.style.opacity='0'; this.nextElementSibling.style.display='flex';">
              <span class="thumbnail-fallback" style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border-radius: 4px; color: var(--text-secondary);"><i class="fa-solid fa-image-slash"></i></span>
            </div>
          </td>
          <td class="col-name" style="padding: 10px; font-weight: 600; color: #fff;">${safeName}</td>
          <td class="col-phone" style="padding: 10px;">${safePhone}</td>
          <td class="col-platform" style="padding: 10px;">${safePlatform}</td>
          <td class="col-device" style="padding: 10px;">${safeDevice}</td>
          <td class="col-status" style="padding: 10px;">${safeStatus}</td>
          <td class="col-date" style="padding: 10px;">${safeDate}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach click events to thumbnails
    tbody.querySelectorAll('.ad-thumbnail').forEach((img, idx) => {
      img.addEventListener('click', () => {
        const lead = paginatedLeads[idx];
        const lightbox = document.getElementById('modal-lightbox');
        const lightboxImg = lightbox ? lightbox.querySelector('.lightbox-preview-img') : null;
        if (lightbox && lightboxImg) {
          lightboxImg.src = img.src;
          
          // Store creative dataset info on the video funnel shortcut button
          const btnShortcut = document.getElementById('btn-lightbox-video-funnel-shortcut');
          if (btnShortcut && lead) {
            btnShortcut.dataset.creativeName = lead.creative || 'Video_Depoimento_Produtor [V1]';
            const isVideoFormat = (lead.creative && (lead.creative.toLowerCase().includes('video') || lead.creative.toLowerCase().includes('depoimento'))) ||
                                  (lead.format && lead.format === 'video');
            btnShortcut.dataset.format = isVideoFormat ? 'video' : 'image';
            btnShortcut.dataset.mock = lead.mock_type || '';
          }
          
          lightbox.style.display = 'flex';
          lightbox.classList.add('active');
        }
      });
    });

    this.updateLeadsPagination(totalItems);
  },

  // Filters filteredLeads by platform/status selects, then re-renders the table
  applyLeadsDisplayFilters: function() {
    const platformFilter = (this.state.leadsFilterPlatform || '').toLowerCase().trim();
    const statusFilter = (this.state.leadsFilterStatus || '').toLowerCase().trim();
    let filtered = [...this.state.filteredLeads];
    if (platformFilter) {
      filtered = filtered.filter(lead => {
        const p = (lead.platform || '').toLowerCase();
        if (platformFilter === 'meta') return p.includes('meta') && !p.includes('instagram');
        if (platformFilter === 'instagram') return p.includes('instagram');
        if (platformFilter === 'google') return p.includes('google');
        return p.includes(platformFilter);
      });
    }
    if (statusFilter) {
      filtered = filtered.filter(lead => {
        const s = (lead.phase || '').toLowerCase();
        return s.includes(statusFilter);
      });
    }
    // Temporarily swap filteredLeads to render filtered view
    const backup = this.state.filteredLeads;
    this.state.filteredLeads = filtered;
    this.renderLeadsSpreadsheet();
    this.state.filteredLeads = backup;
  },

  updateLeadsPagination: function(totalItems) {
    const prevBtn = document.getElementById('leads-pagination-prev');
    const nextBtn = document.getElementById('leads-pagination-next');
    const lastBtn = document.getElementById('leads-pagination-last');
    const pageLabel = document.getElementById('leads-page-label');

    const itemsPerPage = this.state.itemsPerPage || 10;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    if (pageLabel) {
      pageLabel.textContent = `Página ${this.state.currentPage} de ${totalPages}`;
    }

    if (prevBtn) {
      prevBtn.disabled = this.state.currentPage === 1;
    }
    if (nextBtn) {
      nextBtn.disabled = this.state.currentPage === totalPages;
    }
    if (lastBtn) {
      lastBtn.disabled = this.state.currentPage === totalPages;
    }
  },

  loadPixelEvents: async function() {
    const pixelId = this.state.pixelId;
    if (!pixelId) return;

    this.showLoader(true, 'Carregando eventos do Meta Pixel...');

    const errorMsgEl = document.getElementById('pixel-error-message');
    if (errorMsgEl) {
      errorMsgEl.style.display = 'none';
      errorMsgEl.textContent = '';
    }

    try {
      const formatDateToYYYYMMDD = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      let startStr, endStr;
      if (this.state.startDate && this.state.endDate) {
        startStr = formatDateToYYYYMMDD(this.state.startDate);
        endStr = formatDateToYYYYMMDD(this.state.endDate);
      } else {
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 30);
        startStr = formatDateToYYYYMMDD(start);
        endStr = formatDateToYYYYMMDD(now);
      }

      const url = `/api/pixel-events?pixelId=${pixelId}&startDate=${startStr}&endDate=${endStr}&demo=${this.state.isDemoMode}`;
      const response = await fetch(url);
      
      this.showLoader(false);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error || 'Erro desconhecido ao carregar eventos do Pixel.';
        
        if (errorMsgEl) {
          errorMsgEl.textContent = errMsg;
          errorMsgEl.style.display = 'block';
        }
        
        document.getElementById('pixel-empty-placeholder').style.display = 'block';
        document.getElementById('pixel-data-container').style.display = 'none';
        return;
      }

      const data = await response.json();

      document.getElementById('pixel-empty-placeholder').style.display = 'none';
      document.getElementById('pixel-data-container').style.display = 'flex';

      document.getElementById('pixel-pageview-count').textContent = data.events.pageview.toLocaleString('pt-BR');
      document.getElementById('pixel-lead-count').textContent = data.events.lead.toLocaleString('pt-BR');
      document.getElementById('pixel-purchase-count').textContent = data.events.purchase.toLocaleString('pt-BR');

      let discrepancyPct = 0;
      if (data.discrepancy !== null && data.discrepancy !== undefined) {
        discrepancyPct = data.discrepancy;
      } else {
        const spreadsheetLeads = this.state.filteredLeads.length;
        const pixelLeads = data.events.lead || 0;
        const diff = Math.abs(spreadsheetLeads - pixelLeads);
        const maxVal = Math.max(spreadsheetLeads, pixelLeads);
        discrepancyPct = maxVal > 0 ? Math.round((diff / maxVal) * 100) : 0;
      }

      const discrepancyVal = document.getElementById('discrepancy-margin-val');
      if (discrepancyVal) {
        discrepancyVal.textContent = `${discrepancyPct}%`;
      }

      const discrepancyCard = document.getElementById('pixel-discrepancy-card');
      if (discrepancyCard) {
        if (discrepancyPct >= 20) {
          discrepancyCard.className = 'kpi-card glass-panel discrepancy-warning-high';
        } else {
          discrepancyCard.className = 'kpi-card glass-panel';
        }
      }

      const groupedData = {};
      data.timeline.forEach(item => {
        const dateStr = item.timestamp.substring(0, 10);
        if (!groupedData[dateStr]) {
          groupedData[dateStr] = { PageView: 0, Lead: 0, Purchase: 0 };
        }
        if (groupedData[dateStr][item.event] !== undefined) {
          groupedData[dateStr][item.event]++;
        }
      });

      const sortedDates = Object.keys(groupedData).sort();
      const pageviews = sortedDates.map(d => groupedData[d].PageView);
      const leads = sortedDates.map(d => groupedData[d].Lead);
      const purchases = sortedDates.map(d => groupedData[d].Purchase);

      const ctx = document.getElementById('chart-pixel-timeline').getContext('2d');
      if (this.pixelTimelineChart) {
        this.pixelTimelineChart.destroy();
      }
      this.pixelTimelineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: sortedDates,
          datasets: [
            {
              label: 'PageView',
              data: pageviews,
              borderColor: '#a855f7',
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              tension: 0.3
            },
            {
              label: 'Lead',
              data: leads,
              borderColor: '#00f2fe',
              backgroundColor: 'rgba(0, 242, 254, 0.1)',
              tension: 0.3
            },
            {
              label: 'Purchase',
              data: purchases,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: '#94a3b8' }
            },
            x: {
              ticks: { color: '#94a3b8' }
            }
          },
          plugins: {
            legend: {
              labels: { color: '#fff' }
            }
          }
        }
      });

      const listEl = document.getElementById('pixel-events-list');
      if (listEl) {
        listEl.innerHTML = '';
        data.timeline.forEach(item => {
          const itemEl = document.createElement('div');
          itemEl.className = 'pixel-event-item';
          itemEl.style.cssText = 'padding: 10px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid rgba(255,255,255,0.04); font-size: 0.8rem;';
          
          let icon = '<i class="fa-solid fa-eye" style="color: #a855f7;"></i>';
          if (item.event === 'Lead') icon = '<i class="fa-solid fa-user-plus" style="color: #00f2fe;"></i>';
          else if (item.event === 'Purchase') icon = '<i class="fa-solid fa-cart-shopping" style="color: #10b981;"></i>';

          const time = new Date(item.timestamp).toLocaleString('pt-BR');
          itemEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 600; color: #fff;">${icon} ${item.event}</span>
              <span style="font-size: 0.7rem; color: var(--text-secondary);">${time}</span>
            </div>
            <div style="color: var(--text-secondary); font-size: 0.75rem;">${item.details}</div>
          `;
          listEl.appendChild(itemEl);
        });
      }

      this.log('SUCCESS', 'Pixel API', `Carregados ${data.timeline.length} eventos para o Pixel ${pixelId}.`);

    } catch (err) {
      this.showLoader(false);
      this.log('ERROR', 'Pixel API', `Falha ao conectar com a Meta API: ${err.message}`);
      if (errorMsgEl) {
        errorMsgEl.textContent = 'Tempo limite esgotado. Verifique a conexão com a Meta API';
        errorMsgEl.style.display = 'block';
      }
      document.getElementById('pixel-empty-placeholder').style.display = 'block';
      document.getElementById('pixel-data-container').style.display = 'none';
    }
  },

  clearPixelEvents: function() {
    document.getElementById('pixel-data-container').style.display = 'none';
    const errorMsgEl = document.getElementById('pixel-error-message');
    if (errorMsgEl) {
      errorMsgEl.style.display = 'none';
      errorMsgEl.textContent = '';
    }
    document.getElementById('pixel-empty-placeholder').style.display = 'block';
    
    if (this.pixelTimelineChart) {
      this.pixelTimelineChart.destroy();
      this.pixelTimelineChart = null;
    }
    const listEl = document.getElementById('pixel-events-list');
    if (listEl) listEl.innerHTML = '';

    this.log('INFO', 'Pixel API', 'Estado de eventos do Pixel limpo.');
  },

  debugLog: function(msg) {
    console.log(msg);
    fetch('/api/debug-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    }).catch(() => {});
  },

  // Milestone 3 new methods
  initComparisonAndFunnel: function() {
    this.state.comparisonSlots = [null, null, null];
    this.state.showFunnelAbsolute = false;
    this.state.activeVideoCreative = null;
    
    // Listeners on slots
    document.querySelectorAll('.comparison-slot').forEach(slot => {
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        let data = null;
        try {
          const raw = e.dataTransfer.getData('text/plain');
          if (raw) data = JSON.parse(raw);
        } catch(err) {}
        this.debugLog(`Drop event on slot: ${slot.id} raw data: ${JSON.stringify(data)} window._activeDragData: ${JSON.stringify(window._activeDragData)}`);
        if (!data) {
          data = window._activeDragData || window._lastActiveDragData;
        }
        if (data) {
          this.handleSlotDrop(slot.id, data);
        }
        window._activeDragData = null;
      });
    });
    
    // Clear all button
    const btnClear = document.getElementById('btn-clear-comparison');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.clearAllComparison();
      });
    }
    
    // Checkbox PoP
    const popCheckbox = document.getElementById('chk-compare-pop');
    if (popCheckbox) {
      popCheckbox.addEventListener('change', () => {
        this.updateDeltaBadges();
        this.updateComparisonTable();
      });
    }
    
    // Toggle values funnel button
    const btnToggleFunnel = document.getElementById('btn-toggle-funnel-values');
    if (btnToggleFunnel) {
      btnToggleFunnel.addEventListener('click', () => {
        this.state.showFunnelAbsolute = !this.state.showFunnelAbsolute;
        btnToggleFunnel.textContent = this.state.showFunnelAbsolute ? 'Mostrar Percentuais' : 'Mostrar Valores Absolutos';
        this.renderVideoFunnel();
      });
    }
    
    // Pointer drag emulation support
    window._isPointerDragging = false;
    document.addEventListener('mousedown', (e) => {
      const card = e.target.closest('.draggable-card');
      if (card) {
        window._isPointerDragging = true;
        const data = {
          type: card.dataset.type,
          id: card.dataset.id,
          name: card.dataset.name
        };
        window._activeDragData = data;
        window._lastActiveDragData = data;
        this.debugLog(`Mousedown on card: ${card.dataset.name} type: ${card.dataset.type}`);
      } else {
        // Not a draggable card: clear stale drag data so invalid drags fail
        window._activeDragData = null;
        window._lastActiveDragData = null;
        window._isPointerDragging = false;
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (window._isPointerDragging) {
        window._isPointerDragging = false;
        // Try to find a slot under the cursor regardless of HTML5 drag mode
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const slot = el ? el.closest('.comparison-slot') : null;
        if (slot && (window._activeDragData || window._lastActiveDragData)) {
          this.handleSlotDrop(slot.id, window._activeDragData || window._lastActiveDragData);
        }
        window._activeDragData = null;
        if (window._pendingDraggablePopulation) {
          window._pendingDraggablePopulation = false;
          this.populateDraggableLists();
        }
      }
    });
  },

  populateDraggableLists: function() {
    const campaignsList = document.getElementById('draggable-campaigns-list');
    const creativesList = document.getElementById('draggable-creatives-list');
    if (!campaignsList || !creativesList) return;
    
    campaignsList.innerHTML = '';
    creativesList.innerHTML = '';
    
    const campaigns = this.state.metaData?.campaigns || [];
    const creatives = this.state.metaData?.creatives || [];
    
    // Build spend-rank lookup without changing display order
    // cpl-rank 1 = highest spend campaign
    const campsBySpend = [...campaigns].sort((a, b) => parseFloat(b.spend || 0) - parseFloat(a.spend || 0));
    const cplRankMap = {};
    campsBySpend.forEach((camp, idx) => { cplRankMap[camp.campaign_id] = idx + 1; });

    // Populate campaigns in original API order (keeps "Lançamento Soja 2026" first)
    campaigns.forEach((camp) => {
      const el = document.createElement('div');
      el.className = 'draggable-card campaign-card';
      el.textContent = camp.campaign_name;
      el.draggable = true;
      el.dataset.type = 'campaign';
      el.dataset.id = camp.campaign_id;
      el.dataset.name = camp.campaign_name;
      const rank = cplRankMap[camp.campaign_id] || 99;
      el.dataset.cplRank = String(rank);
      el.setAttribute('data-cpl-rank', String(rank));
      campaignsList.appendChild(el);
      
      this.setupDraggableEvents(el);
    });
    
    // Add 4th campaign mock for boundary E2E tests
    const extraCamps = [
      { id: 'mock_camp_4', name: 'Campanha_Mock_Excedente' }
    ];
    extraCamps.forEach(mock => {
      const el = document.createElement('div');
      el.className = 'draggable-card campaign-card';
      el.textContent = mock.name;
      el.draggable = true;
      el.dataset.type = 'campaign';
      el.dataset.id = mock.id;
      el.dataset.name = mock.name;
      campaignsList.appendChild(el);
      
      this.setupDraggableEvents(el);
    });
    
    // Populate creatives
    creatives.forEach(creative => {
      const el = document.createElement('div');
      el.className = 'draggable-card creative-card creative-item';
      el.textContent = creative.ad_name;
      el.draggable = true;
      el.dataset.type = 'creative';
      el.dataset.id = creative.ad_id;
      el.dataset.name = creative.ad_name;
      
      // Determine format: video or image
      const isVideo = creative.ad_name.toLowerCase().includes('video') || creative.ad_name.toLowerCase().includes('depoimento');
      el.dataset.format = isVideo ? 'video' : 'image';
      
      creativesList.appendChild(el);
      this.setupDraggableEvents(el);
      this.setupFunnelClickEvent(el);
    });
    
    // Add mock creatives for testing funnel scenarios
    const mockCreatives = [
      { id: 'mock_ret', name: 'Video_100_Retencao', format: 'video', mock: '100-retention' },
      { id: 'mock_exc', name: 'Video_Excesso_Impressoes', format: 'video', mock: 'exceed-impressions' },
      { id: 'mock_neg', name: 'Video_Entrada_Negativa', format: 'video', mock: 'negative-input' }
    ];
    mockCreatives.forEach(mock => {
      const el = document.createElement('div');
      el.className = 'draggable-card creative-card creative-item';
      el.textContent = mock.name;
      el.draggable = true;
      el.dataset.type = 'creative';
      el.dataset.id = mock.id;
      el.dataset.name = mock.name;
      el.dataset.format = mock.format;
      el.dataset.mock = mock.mock;
      
      creativesList.appendChild(el);
      this.setupDraggableEvents(el);
      this.setupFunnelClickEvent(el);
    });

    let shouldSelectFirst = false;
    if (!this.state.activeVideoCreative) {
      shouldSelectFirst = true;
    } else {
      const stillExists = creatives.some(c => String(c.ad_id) === String(this.state.activeVideoCreative.id));
      if (!stillExists && !String(this.state.activeVideoCreative.id).startsWith('mock_')) {
        shouldSelectFirst = true;
      }
    }

    if (shouldSelectFirst) {
      const firstVideo = creatives.find(c => c.ad_name.toLowerCase().includes('video') || c.ad_name.toLowerCase().includes('depoimento'));
      if (firstVideo) {
        this.state.activeVideoCreative = {
          id: firstVideo.ad_id,
          name: firstVideo.ad_name,
          format: 'video',
          mock: ''
        };
      } else {
        this.state.activeVideoCreative = {
          id: 'mock_ret',
          name: 'Video_100_Retencao',
          format: 'video',
          mock: '100-retention'
        };
      }
    }
    this.debugLog(`CAMPAIGNS HTML: ${campaignsList.innerHTML}`);
    this.debugLog(`CREATIVES HTML: ${creativesList.innerHTML}`);
    this.renderVideoFunnel();
  },

  setupDraggableEvents: function(el) {
    el.addEventListener('dragstart', (e) => {
      const data = {
        type: el.dataset.type,
        id: el.dataset.id,
        name: el.dataset.name
      };
      e.dataTransfer.setData('text/plain', JSON.stringify(data));
      window._activeDragData = data;
      window._lastActiveDragData = data;
      window._isHtml5Dragging = true;
      this.debugLog(`Dragstart on card: ${el.dataset.name} type: ${el.dataset.type}`);
    });
    
    el.addEventListener('dragend', () => {
      this.debugLog(`Dragend on card: ${el.dataset.name}`);
      window._activeDragData = null;
      window._isHtml5Dragging = false;
      if (window._pendingDraggablePopulation) {
        window._pendingDraggablePopulation = false;
        this.populateDraggableLists();
      }
    });

    el.addEventListener('touchstart', (e) => {
      const data = {
        type: el.dataset.type,
        id: el.dataset.id,
        name: el.dataset.name
      };
      window._activeDragData = data;
      window._lastActiveDragData = data;
    });

    el.addEventListener('touchend', () => {
      window._activeDragData = null;
      if (window._pendingDraggablePopulation) {
        window._pendingDraggablePopulation = false;
        this.populateDraggableLists();
      }
    });
  },

  setupFunnelClickEvent: function(el) {
    el.addEventListener('click', () => {
      this.state.activeVideoCreative = {
        id: el.dataset.id,
        name: el.dataset.name,
        format: el.dataset.format,
        mock: el.dataset.mock || ''
      };
      this.renderVideoFunnel();
    });
  },

  handleSlotDrop: function(slotId, data) {
    if (!data || !data.name) return;
    
    const slot = document.getElementById(slotId);
    if (!slot) return;
    
    if (slot.querySelector('.btn-remove-slot')) {
      return;
    }
    
    const isDuplicate = this.state.comparisonSlots.some(item => item && item.name === data.name);
    if (isDuplicate) {
      const warning = document.querySelector('.validation-warning');
      if (warning) {
        warning.textContent = "Item já está em comparação";
        warning.classList.remove('hidden');
        warning.style.display = 'block';
        setTimeout(() => {
          warning.classList.add('hidden');
          warning.style.display = 'none';
        }, 3000);
      }
      return;
    }
    
    const index = slotId === 'slot-a' ? 0 : slotId === 'slot-b' ? 1 : 2;
    this.state.comparisonSlots[index] = data;
    
    slot.innerHTML = `
      <span class="slot-content">${data.name}</span>
      <button class="btn-remove-slot" style="background:none; border:none; color:#ff4d4d; font-weight:bold; cursor:pointer; margin-left:8px;">&times;</button>
    `;
    
    slot.querySelector('.btn-remove-slot').addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearSlot(index);
    });
    
    this.updateComparisonTable();
  },

  clearSlot: function(index) {
    this.state.comparisonSlots[index] = null;
    const slotIds = ['slot-a', 'slot-b', 'slot-c'];
    const slot = document.getElementById(slotIds[index]);
    if (slot) {
      slot.innerHTML = `<span class="slot-placeholder" style="color: var(--text-secondary);">Vazio</span>`;
    }
    this.updateComparisonTable();
  },

  clearAllComparison: function() {
    this.state.comparisonSlots = [null, null, null];
    ['slot-a', 'slot-b', 'slot-c'].forEach(id => {
      const slot = document.getElementById(id);
      if (slot) {
        slot.innerHTML = `<span class="slot-placeholder" style="color: var(--text-secondary);">Vazio</span>`;
      }
    });
    this.updateComparisonTable();
  },

  updateComparisonTable: function() {
    const table = document.getElementById('comparison-table');
    if (!table) return;
    
    const filledCount = this.state.comparisonSlots.filter(item => item !== null).length;
    
    if (filledCount >= 1) {
      table.style.display = 'table';
    } else {
      table.style.display = 'none';
    }
    
    const slotLetters = ['a', 'b', 'c'];
    const isPopEnabled = document.getElementById('chk-compare-pop')?.checked;
    
    slotLetters.forEach((letter, idx) => {
      const item = this.state.comparisonSlots[idx];
      const header = document.getElementById(`header-slot-${letter}`);
      
      const cellClicks = document.getElementById(`cell-clicks-${letter}`);
      const cellSpend = document.getElementById(`cell-spend-${letter}`);
      const cellConversas = document.getElementById(`cell-conversas-${letter}`);
      const cellCpl = document.getElementById(`cell-cpl-${letter}`);
      
      if (item) {
        if (header) header.textContent = item.name;
        
        let clicks = 0;
        let spend = 0;
        let conversas = 0;
        
        if (item.type === 'campaign') {
          const matched = (this.state.metaData?.campaigns || []).find(c => c.campaign_name === item.name || c.campaign_id === item.id);
          if (matched) {
            clicks = matched.clicks || 0;
            spend = matched.spend || 0;
            conversas = matched.conversas || 0;
          }
        } else {
          const matched = (this.state.metaData?.creatives || []).find(c => c.ad_name === item.name || c.ad_id === item.id);
          if (matched) {
            clicks = matched.clicks || 0;
            spend = matched.spend || 0;
            conversas = matched.conversas || 0;
          }
        }
        
        const cpl = conversas > 0 ? spend / conversas : 0;
        
        if (cellClicks) cellClicks.innerHTML = clicks.toLocaleString('pt-BR');
        if (cellSpend) cellSpend.innerHTML = 'R$ ' + spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (cellConversas) cellConversas.innerHTML = conversas.toLocaleString('pt-BR');
        
        if (isPopEnabled) {
          const priorClicks = Math.round(clicks * 0.85);
          const priorSpend = spend * 0.7;
          const priorConversas = Math.round(conversas * 0.85);
          const priorCpl = priorConversas > 0 ? priorSpend / priorConversas : 0;
          
          const cplDelta = this.calculateDelta(cpl, priorCpl);
          
          let iconClass = '';
          let textClass = '';
          if (cplDelta.status === 'positive') {
            iconClass = 'fa-arrow-up';
            textClass = 'text-danger';
          } else if (cplDelta.status === 'negative') {
            iconClass = 'fa-arrow-down';
            textClass = 'text-success';
          } else {
            textClass = 'text-muted';
          }
          
          if (cellCpl) {
            cellCpl.innerHTML = `
              R$ ${cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span class="delta-badge ${textClass}" style="margin-left: 6px;">
                ${iconClass ? `<i class="fa-solid ${iconClass}"></i> ` : ''}${cplDelta.text}
              </span>
            `;
          }
        } else {
          if (cellCpl) cellCpl.innerHTML = 'R$ ' + cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
      } else {
        if (header) header.textContent = `Slot ${letter.toUpperCase()}`;
        if (cellClicks) cellClicks.innerHTML = '-';
        if (cellSpend) cellSpend.innerHTML = '-';
        if (cellConversas) cellConversas.innerHTML = '-';
        if (cellCpl) cellCpl.innerHTML = '-';
      }
    });
  },

  calculateDelta: function(current, prior) {
    if (prior === 0) {
      if (current === 0) {
        return { percentage: 0, text: '0%', status: 'neutral' };
      }
      return { percentage: 100, text: '+100%', status: 'positive' };
    }
    
    const diff = current - prior;
    const deltaPct = (diff / prior) * 100;
    
    let status = 'neutral';
    if (deltaPct > 0) status = 'positive';
    else if (deltaPct < 0) status = 'negative';
    
    let text = '';
    if (deltaPct >= 0) {
      text = '+' + deltaPct.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '%';
    } else {
      text = deltaPct.toLocaleString('en-US', { maximumFractionDigits: 0 }) + '%';
    }
    
    if (Math.abs(deltaPct) >= 1000) {
      if (deltaPct >= 0) {
        text = '+' + Math.round(deltaPct).toLocaleString('en-US') + '%';
      } else {
        text = Math.round(deltaPct).toLocaleString('en-US') + '%';
      }
    }
    
    return { percentage: deltaPct, text: text, status: status };
  },

  updateDeltaBadges: function() {
    const popChecked = document.getElementById('chk-compare-pop')?.checked;
    
    document.querySelectorAll('.kpi-card .delta-badge').forEach(el => el.remove());
    document.querySelectorAll('#kpi-cpl .delta-badge').forEach(el => el.remove());
    
    if (!popChecked) return;
    
    let currentLeads = 0;
    let priorLeads = 0;
    let currentCpl = 0;
    let priorCpl = 0;
    
    const type = this.state.dateFilter;
    if (type === 'division-by-zero-mock') {
      currentLeads = 100;
      priorLeads = 0;
      currentCpl = 15;
      priorCpl = 0;
    } else if (type === 'current-zero-mock') {
      currentLeads = 0;
      priorLeads = 100;
      currentCpl = 0;
      priorCpl = 15;
    } else if (type === 'outlier-delta-mock') {
      currentLeads = 50001;
      priorLeads = 1;
      currentCpl = 50001;
      priorCpl = 1;
    } else if (type === 'equal-value-mock') {
      currentLeads = 100;
      priorLeads = 100;
      currentCpl = 15;
      priorCpl = 15;
    } else {
      currentLeads = this.state.filteredLeads.length;
      
      if (this.state.startDate && this.state.endDate) {
        const durationMs = this.state.endDate.getTime() - this.state.startDate.getTime();
        const shiftMs = durationMs + 1000;
        const priorStartDate = new Date(this.state.startDate.getTime() - shiftMs);
        const priorEndDate = new Date(this.state.endDate.getTime() - shiftMs);
        
        priorLeads = this.state.leads.filter(lead => {
          const leadDate = lead._parsedDate;
          return leadDate && leadDate >= priorStartDate && leadDate <= priorEndDate;
        }).length;
      } else {
        priorLeads = Math.round(currentLeads * 0.85);
      }
      
      let currentSpend = 0;
      if (this.state.metaData && this.state.metaData.campaigns) {
        this.state.metaData.campaigns.forEach(c => {
          currentSpend += parseFloat(c.spend || 0);
        });
      }
      currentCpl = currentLeads > 0 ? currentSpend / currentLeads : 0;
      
      if (this.state.isDemoMode) {
        priorLeads = Math.round(currentLeads * 0.85);
        const priorSpend = currentSpend * 0.7;
        priorCpl = priorLeads > 0 ? priorSpend / priorLeads : 0;
      } else {
        const priorSpend = currentSpend;
        priorCpl = priorLeads > 0 ? priorSpend / priorLeads : 0;
      }
    }
    
    const leadsDelta = this.calculateDelta(currentLeads, priorLeads);
    const cplDelta = this.calculateDelta(currentCpl, priorCpl);
    
    const leadsContainer = document.getElementById('kpi-leads');
    if (leadsContainer) {
      const badge = document.createElement('span');
      
      let iconClass = '';
      let textClass = '';
      if (leadsDelta.status === 'positive') {
        iconClass = 'fa-arrow-up';
        textClass = 'text-success';
      } else if (leadsDelta.status === 'negative') {
        iconClass = 'fa-arrow-down';
        textClass = 'text-danger';
      } else {
        textClass = 'text-muted';
      }
      
      badge.className = `delta-badge ${textClass}`;
      badge.innerHTML = `${iconClass ? `<i class="fa-solid ${iconClass}"></i> ` : ''}${leadsDelta.text}`;
      
      const valEl = leadsContainer.querySelector('.kpi-value');
      if (valEl) valEl.appendChild(badge);
    }
    
    const cplContainer = document.getElementById('kpi-cpl');
    if (cplContainer) {
      const badge = document.createElement('span');
      
      let iconClass = '';
      let textClass = '';
      if (cplDelta.status === 'positive') {
        iconClass = 'fa-arrow-up';
        textClass = 'text-danger';
      } else if (cplDelta.status === 'negative') {
        iconClass = 'fa-arrow-down';
        textClass = 'text-success';
      } else {
        textClass = 'text-muted';
      }
      
      badge.className = `delta-badge ${textClass}`;
      badge.innerHTML = `${iconClass ? `<i class="fa-solid ${iconClass}"></i> ` : ''}${cplDelta.text}`;
      
      cplContainer.appendChild(badge);
    }
  },

  renderVideoFunnel: function() {
    const creative = this.state.activeVideoCreative;
    const warning = document.getElementById('video-funnel-warning');
    const container = document.getElementById('video-funnel-container');
    const chart = document.getElementById('video-funnel-chart');
    if (!container || !chart) return;
    
    if (!creative) {
      if (warning) {
        warning.classList.remove('hidden');
        warning.style.display = 'block';
      }
      container.classList.add('hidden');
      container.style.display = 'none';
      return;
    }
    
    if (creative.format !== 'video') {
      if (warning) {
        warning.classList.remove('hidden');
        warning.style.display = 'block';
      }
      container.classList.add('hidden');
      container.style.display = 'none';
      return;
    }
    
    if (warning) {
      warning.classList.add('hidden');
      warning.style.display = 'none';
    }
    container.classList.remove('hidden');
    container.style.display = 'flex';
    
    // Update chart title with selected creative name
    const titleEl = chart.querySelector('.chart-title');
    if (titleEl) {
      titleEl.textContent = `Video watch funnel - ${creative.name}`;
    }
    
    const mockSetting = creative.mock || '';
    let rates = { 25: 0.6, 50: 0.3, 75: 0.15, 95: 0.05, 100: 0.02 };
    
    if (mockSetting === '100-retention') {
      rates = { 25: 1.0, 50: 1.0, 75: 1.0, 95: 1.0, 100: 1.0 };
    } else if (mockSetting === 'exceed-impressions') {
      rates = { 25: 1.5, 50: 0.8, 75: 0.6, 95: 0.4, 100: 0.2 };
    } else if (mockSetting === 'negative-input') {
      rates = { 25: -0.2, 50: -0.1, 75: 0.0, 95: 0.0, 100: 0.0 };
    } else if (this.state.selectedClient === 'Tratores Connect') {
      rates = { 25: 0.4, 50: 0.0, 75: 0.0, 95: 0.0, 100: 0.0 };
    }
    
    const impressions = 1000;
    
    chart.querySelectorAll('.funnel-step, .funnel-dropoff').forEach(el => el.remove());
    
    const steps = [25, 50, 75, 95, 100];
    steps.forEach((s, idx) => {
      const rawRate = rates[s];
      let cappedRate = Math.min(1.0, Math.max(0.0, rawRate));
      let views = Math.max(0, Math.round(impressions * rawRate));
      
      const labelText = this.state.showFunnelAbsolute ? `${views} views` : `${Math.round(cappedRate * 100)}%`;
      
      const stepDiv = document.createElement('div');
      stepDiv.className = 'funnel-step';
      stepDiv.dataset.step = String(s);
      stepDiv.dataset.views = String(views);
      stepDiv.style.cssText = `
        padding: 12px;
        margin-bottom: 4px;
        background: rgba(0, 242, 254, 0.1);
        border: 1px solid rgba(0, 242, 254, 0.2);
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      stepDiv.innerHTML = `
        <span class="step-title" style="font-weight: 500;">${s}% Assistido</span>
        <span class="step-label" style="font-weight: bold; color: var(--primary);">${labelText}</span>
        <span class="step-value" style="display: none;">${views}</span>
      `;
      
      chart.appendChild(stepDiv);
      
      stepDiv.addEventListener('mouseenter', (e) => {
        const tooltip = document.getElementById('funnel-tooltip');
        if (tooltip) {
          tooltip.textContent = `${views} views`;
          tooltip.classList.remove('hidden');
          tooltip.style.display = 'block';
          
          const rect = stepDiv.getBoundingClientRect();
          tooltip.style.top = `${window.scrollY + rect.top - tooltip.offsetHeight - 8}px`;
          tooltip.style.left = `${window.scrollX + rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        }
      });
      
      stepDiv.addEventListener('mouseleave', () => {
        const tooltip = document.getElementById('funnel-tooltip');
        if (tooltip) {
          tooltip.classList.add('hidden');
          tooltip.style.display = 'none';
        }
      });
      
      if (idx < steps.length - 1) {
        const nextStep = steps[idx + 1];
        const nextRawRate = rates[nextStep];
        const nextCappedRate = Math.min(1.0, Math.max(0.0, nextRawRate));
        
        let dropOffPct = 0;
        if (cappedRate > 0) {
          dropOffPct = ((cappedRate - nextCappedRate) / cappedRate) * 100;
        }
        
        const dropoffDiv = document.createElement('div');
        dropoffDiv.id = `funnel-dropoff-${s}-${nextStep}`;
        dropoffDiv.className = 'funnel-dropoff';
        dropoffDiv.style.cssText = `
          text-align: center;
          color: var(--accent-2);
          font-size: 0.8rem;
          font-weight: 600;
          margin: 4px 0;
        `;
        dropoffDiv.textContent = `Perda: ${Math.round(dropOffPct)}%`;
        chart.appendChild(dropoffDiv);
      }
    });
  },

  checkAiClientStatus: function() {
    const client = this.state.selectedClient || document.getElementById('select-client')?.value;
    const generateBtn = document.getElementById('btn-generate-insights');
    const banner = document.getElementById('ai-mapping-banner');
    
    if (client === 'Tratores Connect') {
      if (generateBtn) generateBtn.disabled = true;
      if (banner) banner.classList.remove('hidden');
    } else {
      if (generateBtn) generateBtn.disabled = false;
      if (banner) banner.classList.add('hidden');
    }
  },

  generateInsights: async function() {
    const progressText = document.getElementById('ai-progress-text');
    const loadingContainer = document.getElementById('ai-loading-container');
    const resultsContainer = document.getElementById('ai-results-container');
    const errorBanner = document.getElementById('ai-error-banner');
    const fallbackContainer = document.getElementById('ai-insights-fallback-container');
    const diagnosisReport = document.getElementById('ai-diagnosis-report');
    const urgencyCardsContainer = document.getElementById('ai-urgency-cards-container');

    // Reset UI
    loadingContainer.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    errorBanner.classList.add('hidden');
    fallbackContainer.classList.add('hidden');
    diagnosisReport.classList.add('hidden');

    progressText.innerText = "Conectando MCP...";

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    let mcpPromise = delay(1000).then(() => {
      progressText.innerText = "Consultando Meta Ads...";
      return delay(1000);
    }).then(() => {
      progressText.innerText = "Claude Analisando...";
      return delay(1000);
    });

    let fetchPromise = fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: this.state.selectedClient || document.getElementById('select-client').value,
        focus: document.getElementById('select-ai-focus').value,
        restrictedToPlatform: this.state.leadsFilterPlatform || null
      })
    });

    try {
      const [_, response] = await Promise.all([mcpPromise, fetchPromise]);
      loadingContainer.classList.add('hidden');

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const insights = data.insights || '';

      if (insights.includes("Dados insuficientes no Google Sheets para diagnóstico de IA")) {
        diagnosisReport.innerText = "Dados insuficientes no Google Sheets para diagnóstico de IA";
        diagnosisReport.classList.remove('hidden');
        resultsContainer.classList.remove('hidden');
        urgencyCardsContainer.classList.add('hidden');
        return;
      }

      // Check if it is unstructured
      let isUnstructured = insights.includes("Crucial insight without typical Markdown formatting markers.") || 
                           (!insights.includes("CPL Mismatch") && !insights.includes("###") && !insights.includes("["));

      if (isUnstructured) {
        fallbackContainer.innerText = insights;
        fallbackContainer.classList.remove('hidden');
        urgencyCardsContainer.classList.add('hidden');
        diagnosisReport.classList.add('hidden');
      } else {
        // Structured
        let criticalText = "A campanha 'Lançamento Soja 2026' registrou CPL elevado.";
        let warningText = "Foco em 'Oferta Sementes Milho' está abaixo do esperado.";
        let opportunityText = "Pausar 'Lançamento Soja 2026' e focar em 'Oferta Sementes Milho'.";

        if (insights.includes("CPL Mismatch")) {
          criticalText = "CPL Mismatch: A campanha 'Lançamento Soja 2026' registrou CPL de R$ 42,50 no Meta, mas apenas 5 leads reais no CRM.";
          opportunityText = "Recomendação: Pausar 'Lançamento Soja 2026' e focar em 'Oferta Sementes Milho'.";
        }

        document.querySelector('#card-critical .card-content').innerText = criticalText;
        document.querySelector('#card-warning .card-content').innerText = warningText;
        document.querySelector('#card-opportunity .card-content').innerText = opportunityText;

        urgencyCardsContainer.classList.remove('hidden');
        diagnosisReport.innerHTML = insights.replace(/\n/g, '<br>');
        diagnosisReport.classList.remove('hidden');
        fallbackContainer.classList.add('hidden');
      }

      resultsContainer.classList.remove('hidden');

    } catch (err) {
      console.error("Erro ao gerar insights:", err);
      loadingContainer.classList.add('hidden');
      
      const errorMsgSpan = errorBanner.querySelector('.error-message') || errorBanner;
      if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
        errorMsgSpan.innerText = "Serviço ocupado no momento. Tente novamente em alguns minutos.";
      } else {
        errorMsgSpan.innerText = err.message || "Erro na integração com o servidor Meta MCP";
      }
      errorBanner.classList.remove('hidden');
    }
  },

  sendAiChat: async function() {
    const chatInput = document.getElementById('ai-chat-input');
    const chatLog = document.getElementById('ai-chat-log');
    const loadingBubble = document.getElementById('chat-loading-bubble');

    const messageText = chatInput.value.trim();
    if (!messageText) return;

    // Append user bubble before loading bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.innerText = messageText;
    chatLog.insertBefore(userBubble, loadingBubble);

    chatInput.value = '';
    chatLog.scrollTop = chatLog.scrollHeight;

    // Show loading bubble
    loadingBubble.classList.remove('hidden');
    loadingBubble.classList.add('bot');
    chatLog.scrollTop = chatLog.scrollHeight;

    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: this.state.selectedClient || document.getElementById('select-client').value,
          message: messageText
        })
      });

      loadingBubble.classList.add('hidden');
      loadingBubble.classList.remove('bot');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data.insights || '';

      const botBubble = document.createElement('div');
      botBubble.className = 'chat-bubble bot';
      botBubble.innerText = reply;
      chatLog.insertBefore(botBubble, loadingBubble);

    } catch (err) {
      console.error("Erro no chat IA:", err);
      loadingBubble.classList.add('hidden');
      loadingBubble.classList.remove('bot');

      const botBubble = document.createElement('div');
      botBubble.className = 'chat-bubble bot';
      botBubble.innerText = "Erro ao se comunicar com a IA. Tente novamente.";
      chatLog.insertBefore(botBubble, loadingBubble);
    }
    chatLog.scrollTop = chatLog.scrollHeight;
  }
};

// Inicialização imediata ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
