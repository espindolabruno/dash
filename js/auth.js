// Módulo de Autenticação do Google OAuth2
const Auth = {
  // CONFIGURAÇÕES GERAIS (Modifique aqui ou utilize as configurações do Dashboard na UI)
  CLIENT_ID: localStorage.getItem('google_client_id') || 'SEU_CLIENT_ID.apps.googleusercontent.com', 
  
  // Lista de e-mails permitidos a acessar o dashboard (se vazia, permite qualquer conta que fizer login com sucesso)
  ALLOWED_EMAILS: [], 

  // Scopes necessários para ler arquivos do Google Drive e planilhas do Sheets
  SCOPES: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ].join(' '),

  tokenClient: null,
  accessToken: null,
  userProfile: null,

  // Inicializa a API do Google Identity Services
  init: function(onSuccessCallback, onErrorCallback) {
    // Carrega o token client
    if (typeof google === 'undefined') {
      onErrorCallback('Biblioteca Google API não carregada. Verifique sua conexão.');
      return;
    }

    try {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: this.SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error !== undefined) {
            onErrorCallback(tokenResponse.error_description || tokenResponse.error);
            return;
          }
          
          this.accessToken = tokenResponse.access_token;
          sessionStorage.setItem('oauth_token', this.accessToken);
          
          // Buscar perfil do usuário para validação de e-mail e exibição na UI
          this.fetchUserProfile(onSuccessCallback, onErrorCallback);
        },
      });
      
      // Verifica se já existe um token salvo na sessão
      const savedToken = sessionStorage.getItem('oauth_token');
      if (savedToken) {
        this.accessToken = savedToken;
        this.fetchUserProfile(onSuccessCallback, () => {
          // Se o token salvo falhar (expirou), limpa e pede login
          this.logout();
        });
      }
    } catch (err) {
      console.error("Erro na inicialização do Google Auth client:", err);
      onErrorCallback(err.message || 'Falha ao inicializar autenticação.');
    }
  },

  // Inicia o fluxo de login popup
  login: function() {
    if (this.tokenClient) {
      // Solicita consentimento do usuário
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      console.error('Auth não foi inicializado corretamente.');
    }
  },

  // Limpa o token e desloga
  logout: function() {
    this.accessToken = null;
    this.userProfile = null;
    sessionStorage.removeItem('oauth_token');
    sessionStorage.removeItem('user_profile');
    if (typeof google !== 'undefined' && google.accounts.oauth2.revoke && this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
    window.location.reload();
  },

  // Busca dados de perfil do usuário logado
  fetchUserProfile: function(onSuccess, onError) {
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    })
    .then(response => {
      if (!response.ok) throw new Error('Falha ao obter perfil do Google.');
      return response.json();
    })
    .then(profile => {
      // Validar se o e-mail está na lista permitida (se houver restrição)
      if (this.ALLOWED_EMAILS.length > 0 && !this.ALLOWED_EMAILS.includes(profile.email.toLowerCase())) {
        this.logout();
        onError(`Acesso negado. O e-mail ${profile.email} não está autorizado a acessar este painel.`);
        return;
      }

      this.userProfile = profile;
      sessionStorage.setItem('user_profile', JSON.stringify(profile));
      onSuccess(profile);
    })
    .catch(err => {
      console.error(err);
      onError(err.message);
    });
  },

  // Retorna se o usuário está logado
  isAuthenticated: function() {
    return !!this.accessToken && !!this.userProfile;
  },

  // Tenta restaurar a sessão ao carregar a página
  restoreSession: function() {
    const savedToken = sessionStorage.getItem('oauth_token');
    const savedProfile = sessionStorage.getItem('user_profile');
    if (savedToken && savedProfile) {
      this.accessToken = savedToken;
      this.userProfile = JSON.parse(savedProfile);
      return true;
    }
    return false;
  }
};
