// Serviço de Integração com Meta Ads Graph API (Marketing API) - Versão v25.0
const MetaService = {
  // Constantes de Configuração (Podem ser sobrescritas pela UI e salvas no localStorage)
  ACCESS_TOKEN: '',
  AD_ACCOUNT_ID: '', // Formato: act_1234567890

  // Faz requisições para a API de Gráficos do Meta (v25.0)
  request: async function(endpoint, params = {}) {
    const token = this.ACCESS_TOKEN || localStorage.getItem('meta_access_token');
    let actId = this.AD_ACCOUNT_ID || localStorage.getItem('meta_ad_account_id');

    if (!token || !actId) {
      const errorMsg = 'Configurações do Meta Ads ausentes (Access Token ou ID da Conta).';
      App.log('ERROR', 'Meta API', errorMsg);
      throw new Error(errorMsg);
    }

    // Garante que o ID da conta comece com 'act_'
    if (!actId.startsWith('act_')) {
      actId = 'act_' + actId;
    }

    // Constrói a URL com os parâmetros de consulta
    const urlParams = new URLSearchParams();
    urlParams.append('access_token', token);
    
    for (const [key, val] of Object.entries(params)) {
      urlParams.append(key, val);
    }

    const url = `https://graph.facebook.com/v25.0/${actId}/${endpoint}?${urlParams.toString()}`;
    
    App.log('INFO', 'Meta API', `Enviando requisição: GET /v25.0/${actId}/${endpoint}`);

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        const errorDetail = data.error?.message || response.statusText;
        const errObj = new Error(`[Status ${response.status}] ${errorDetail}`);
        App.log('ERROR', 'Meta API', `Falha na requisição: ${errObj.message}`);
        throw errObj;
      }

      App.log('SUCCESS', 'Meta API', `Requisição concluída. Registros retornados: ${data.data?.length || 0}`);
      return data.data || [];
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error(err.toString());
      }
      App.log('ERROR', 'Meta API', `Erro de rede/conexão: ${err.message}`);
      throw err;
    }
  },

  // Busca custos agrupados por campanha com quebra por dispositivo e plataforma de veiculação
  fetchCampaignPerformance: async function(dias = 30) {
    const range = this.getDateRange(dias);
    const params = {
      level: 'campaign',
      breakdowns: 'publisher_platform,device_platform',
      time_range: JSON.stringify({ since: range.since, until: range.until }),
      fields: 'campaign_name,spend,clicks,impressions,actions'
    };

    return this.request('insights', params);
  },

  // Busca performance detalhada por Anúncio (Criativo)
  fetchCreativePerformance: async function(dias = 30) {
    const range = this.getDateRange(dias);
    const params = {
      level: 'ad',
      time_range: JSON.stringify({ since: range.since, until: range.until }),
      fields: 'ad_name,campaign_name,spend,clicks,impressions,actions',
      limit: 100
    };

    return this.request('insights', params);
  },

  // Auxiliar para calcular range de data no formato AAAA-MM-DD aceito pelo Meta
  getDateRange: function(dias) {
    const today = new Date();
    const sinceDate = new Date();
    sinceDate.setDate(today.getDate() - dias);

    const formatDate = (date) => date.toISOString().substring(0, 10);

    return {
      since: formatDate(sinceDate),
      until: formatDate(today)
    };
  }
};
