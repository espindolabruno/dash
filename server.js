// ==========================================================================
// BACKEND SERVER - CONNECT AGRO LEAD ANALYTICS (Node.js & Express)
// ==========================================================================
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { google } = require('googleapis');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta atual (frontend)
app.use(express.static(__dirname));

// ==========================================================================
// CONFIGURAÇÃO DO GOOGLE APIS (OAuth2 com Refresh Token)
// ==========================================================================
let oauth2Client = null;
let drive = null;
let sheets = null;

function initGoogleAPI() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    try {
      oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      
      drive = google.drive({ version: 'v3', auth: oauth2Client });
      sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      console.log('✅ Google API inicializada com sucesso (OAuth2 Refresh Token).');
    } catch (err) {
      console.error('❌ Erro ao inicializar o cliente do Google API:', err.message);
    }
  } else {
    console.warn('⚠️ Google API não configurada. Preencha as variáveis no seu .env para utilizar o Modo Real.');
  }
}
initGoogleAPI();

// ==========================================================================
// COLUNAS SUPORTADAS PARA MAPEAR LEADS (Normalização Inteligente)
// ==========================================================================
const COLUMN_MAPPINGS = {
  date: ['data', 'horário', 'data e horário', 'data/hora', 'timestamp', 'data/horário', 'data_hora', 'created_at', 'date'],
  name: ['nome', 'nome completo', 'leads', 'lead', 'client', 'cliente', 'name', 'full_name'],
  phone: ['telefone', 'celular', 'whatsapp', 'whats', 'fone', 'phone', 'telephone', 'contato'],
  device: ['dispositivo', 'dispositivo de conversão', 'device', 'mobile/desktop', 'aparelho'],
  platform: ['plataforma', 'plataforma de conversão', 'platform', 'canal', 'rede', 'origem', 'midia', 'utm_source'],
  campaign: ['campanha', 'campaign', 'utm_campaign', 'nome da campanha'],
  adset: ['conjunto', 'conjunto de anúncios', 'adset', 'ad set', 'utm_medium', 'grupo de anúncios'],
  creative: ['criativo', 'creative', 'utm_content', 'anúncio', 'ad'],
  copy: ['copy', 'texto', 'utm_term', 'redação', 'copywriting']
};

// ==========================================================================
// ROTAS DA API
// ==========================================================================

// 1. Rota de Autenticação Simples para a VPS
app.post('/api/login', (req, res) => {
  const { user, password } = req.body;
  const envUser = process.env.DASH_USER || 'admin';
  const envPass = process.env.DASH_PASSWORD || 'admin123';

  if (user === envUser && password === envPass) {
    res.json({ success: true, token: 'session_token_' + Math.random().toString(36).substring(2) });
  } else {
    res.status(401).json({ success: false, error: 'Usuário ou senha incorretos.' });
  }
});

// 2. Rota de Listagem de Clientes (Pastas)
app.get('/api/clients', async (req, res) => {
  const isDemo = req.query.demo === 'true';

  if (isDemo) {
    // Retorna clientes de teste do mock
    return res.json([
      { id: 'demo-1', name: 'AgroForte Sementes' },
      { id: 'demo-2', name: 'NutriCampo Fertilizantes' },
      { id: 'demo-3', name: 'Tratores Connect' }
    ]);
  }

  if (!drive) {
    return res.status(500).json({ error: 'Integração Google Drive não está configurada no servidor.' });
  }

  try {
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!rootFolderId) {
      return res.status(400).json({ error: 'ID da pasta raiz GOOGLE_DRIVE_FOLDER_ID não configurado no servidor.' });
    }

    const query = `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const response = await drive.files.list({
      q: query,
      fields: 'files(id,name)',
      pageSize: 100
    });

    res.json(response.data.files || []);
  } catch (err) {
    console.error('Erro ao listar clientes no Drive:', err);
    res.status(500).json({ error: 'Erro no Google Drive: ' + err.message });
  }
});

// 3. Rota de Carregamento de Leads
app.get('/api/leads', async (req, res) => {
  const { clientId, clientName, demo } = req.query;
  const isDemo = demo === 'true';

  if (isDemo) {
    // Gerar dados simulados via mock data local
    const leads = generateMockLeads(clientName || 'AgroForte Sementes');
    return res.json(leads);
  }

  if (!drive || !sheets) {
    return res.status(500).json({ error: 'Google API não inicializada no servidor.' });
  }

  if (!clientId) {
    return res.status(400).json({ error: 'ID do cliente ausente.' });
  }

  try {
    // A. Achar pasta 'Tráfego Pago' dentro do cliente
    const queryTrafego = `'${clientId}' in parents and name = 'Tráfego Pago' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const resTrafego = await drive.files.list({
      q: queryTrafego,
      fields: 'files(id,name)'
    });
    const folderTrafego = resTrafego.data.files?.[0];

    if (!folderTrafego) {
      return res.json([]); // Retorna vazio se não tiver pasta
    }

    // B. Achar planilhas em 'Tráfego Pago'
    const querySheets = `'${folderTrafego.id}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
    const resSheets = await drive.files.list({
      q: querySheets,
      fields: 'files(id,name)',
      pageSize: 5
    });
    const sheetFile = resSheets.data.files?.[0];

    if (!sheetFile) {
      return res.json([]);
    }

    // C. Ler os valores do Sheets
    const resValues = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetFile.id,
      range: 'A1:Z5000'
    });
    const rows = resValues.data.values;

    if (!rows || rows.length < 2) {
      return res.json([]); // Apenas cabeçalho ou vazia
    }

    // D. Normalização de colunas
    const headers = rows[0].map(h => h.toString().toLowerCase().trim());
    const leadRows = rows.slice(1);
    
    const mappingIndexes = {};
    for (const [key, aliases] of Object.entries(COLUMN_MAPPINGS)) {
      mappingIndexes[key] = headers.findIndex(header => 
        aliases.includes(header) || aliases.some(alias => header.includes(alias))
      );
    }

    const leads = leadRows.map(row => {
      const lead = {};
      for (const [field, index] of Object.entries(mappingIndexes)) {
        if (index !== -1 && row[index] !== undefined) {
          lead[field] = row[index].toString().trim();
        } else {
          lead[field] = '';
        }
      }
      
      // Normalizações básicas
      if (lead.date) lead.date = formatDateString(lead.date);
      if (!lead.platform) lead.platform = 'Direto / Desconhecido';
      if (!lead.device) lead.device = 'Não Especificado';

      return lead;
    }).filter(lead => lead.name || lead.phone);

    res.json(leads);
  } catch (err) {
    console.error('Erro ao ler leads do Sheets:', err);
    res.status(500).json({ error: 'Erro ao carregar planilha: ' + err.message });
  }
});

// 4. Rota de Proxy da API do Meta Ads (Marketing API v25.0)
app.get('/api/meta-insights', async (req, res) => {
  const { days, demo } = req.query;
  const isDemo = demo === 'true';
  const limitDays = days ? parseInt(days) : 30;

  if (isDemo) {
    // Retorna logs e dados simulados para a UI
    return res.json({
      logs: [
        { type: 'INFO', source: 'Meta API v25.0', message: `Iniciando consulta simulada para o período de ${limitDays} dias.` },
        { type: 'INFO', source: 'Meta API v25.0', message: 'GET https://graph.facebook.com/v25.0/act_77728399102/insights?level=ad&fields=ad_name,spend,clicks...' },
        { type: 'SUCCESS', source: 'Meta API v25.0', message: 'Dados de anúncios retornados com sucesso (200 OK).' }
      ],
      spend: 1450.00,
      cpl: 14.50
    });
  }

  const token = process.env.META_ACCESS_TOKEN;
  let actId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !actId) {
    return res.status(400).json({ error: 'Credenciais da API do Meta Ads não configuradas no servidor (.env).' });
  }

  if (!actId.startsWith('act_')) {
    actId = 'act_' + actId;
  }

  // Calcular range de datas
  const today = new Date();
  const sinceDate = new Date();
  sinceDate.setDate(today.getDate() - limitDays);
  const formatDate = (date) => date.toISOString().substring(0, 10);

  const timeRange = JSON.stringify({ since: formatDate(sinceDate), until: formatDate(today) });

  try {
    console.log(`Chamando Meta Ads API v25.0 para a conta ${actId} (Últimos ${limitDays} dias)...`);
    
    // Dispara chamadas de insights em paralelo
    const [campaignRes, creativeRes] = await Promise.all([
      axios.get(`https://graph.facebook.com/v25.0/${actId}/insights`, {
        params: {
          access_token: token,
          level: 'campaign',
          breakdowns: 'publisher_platform,device_platform',
          time_range: timeRange,
          fields: 'campaign_name,spend,clicks,impressions,actions'
        }
      }),
      axios.get(`https://graph.facebook.com/v25.0/${actId}/insights`, {
        params: {
          access_token: token,
          level: 'ad',
          time_range: timeRange,
          fields: 'ad_name,campaign_name,spend,clicks,impressions,actions',
          limit: 100
        }
      })
    ]);

    res.json({
      campaigns: campaignRes.data.data || [],
      creatives: creativeRes.data.data || [],
      logs: [
        { type: 'INFO', source: 'Meta API v25.0', message: `Conexão bem sucedida. Retornados ${campaignRes.data.data?.length || 0} registros de campanhas.` },
        { type: 'SUCCESS', source: 'Meta API v25.0', message: `Sucesso no processamento de insights de anúncios (v25.0).` }
      ]
    });
  } catch (err) {
    const apiError = err.response?.data?.error?.message || err.message;
    console.error('Erro na API do Meta:', apiError);
    res.status(500).json({ error: 'Meta API Error: ' + apiError });
  }
});

// Forçar redirecionamento do index.html para todas as páginas estáticas
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Inicialização do Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Connect Agro rodando na porta ${PORT}`);
  console.log(`🔗 Localmente: http://localhost:${PORT}`);
});

// ==========================================================================
// FUNÇÕES AUXILIARES DE SUPORTE
// ==========================================================================

// Formatar data em AAAA-MM-DD HH:MM:SS
function formatDateString(dateStr) {
  try {
    if (!isNaN(dateStr) && Number(dateStr) > 40000) {
      const serial = Number(dateStr);
      const utc_days = Math.floor(serial - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      const fractional_day = serial - Math.floor(serial) + 0.0000001;
      let total_seconds = Math.floor(86400 * fractional_day);
      const hours = Math.floor(total_seconds / 3600);
      total_seconds = total_seconds % 3600;
      const minutes = Math.floor(total_seconds / 60);
      const seconds = total_seconds % 60;
      date_info.setUTCHours(hours, minutes, seconds);
      return date_info.toISOString().replace('T', ' ').substring(0, 19);
    }
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ');
      const dateParts = parts[0].split('/');
      const day = dateParts[0].padStart(2, '0');
      const month = dateParts[1].padStart(2, '0');
      const year = dateParts[2];
      const timePart = parts[1] || '00:00:00';
      return `${year}-${month}-${day} ${timePart}`;
    }
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().replace('T', ' ').substring(0, 19);
    }
  } catch (e) {}
  return dateStr;
}

// Simulador de leads para o modo Demo
function generateMockLeads(cliente) {
  const leads = [];
  const agora = new Date();
  
  const config = {
    "AgroForte Sementes": {
      plataformas: ["Meta Ads", "Google Ads", "Instagram Organic"],
      dispositivos: ["Mobile", "Mobile", "Desktop"],
      campanhas: ["Lançamento Soja 2026", "Institucional AgroForte", "Oferta Sementes Milho"],
      conjuntos: ["Interesses Produtores", "Lookalike Clientes", "Palavras-Chave Soja"],
      criativos: ["Video_Depoimento_Produtor", "Banner_Saco_Semente", "Carrossel_Beneficios_Milho"],
      copies: ["Copy_Prova_Social", "Copy_Desconto_PreVenda", "Copy_Especificacoes_Tecnicas"]
    },
    "NutriCampo Fertilizantes": {
      plataformas: ["Google Ads", "Meta Ads", "LinkedIn Ads"],
      dispositivos: ["Desktop", "Mobile", "Mobile"],
      campanhas: ["Nutrição de Solo Inverno", "Fertilizantes Foliares NPK", "Geração de Leads B2B"],
      conjuntos: ["Decisores Agro", "Palavras Fertilizantes NPK", "Público Engenheiros Agrônomos"],
      criativos: ["Infografico_Nutrientes_Solo", "Video_Resultados_Lavoura", "Banner_Frete_Gratis"],
      copies: ["Copy_Cientifica_Resultados", "Copy_Urgencia_Estoque", "Copy_Institucional_B2B"]
    },
    "Tratores Connect": {
      plataformas: ["Meta Ads", "Google Ads"],
      dispositivos: ["Mobile", "Mobile", "Desktop"],
      campanhas: ["Feirão Tratores Connect", "Consórcio Agrícola 2026", "Peças e Serviços"],
      conjuntos: ["Público Feiras Agrícolas", "Palavras Compra Trator", "Lista WhatsApp Importada"],
      criativos: ["Video_Demonstracao_Trator_XP", "Foto_Feirao_Descontos", "Carrossel_Modelos_Tratores"],
      copies: ["Copy_Parcelamento_Facilitado", "Copy_Entrega_Imediata", "Copy_Upgrade_Tecnologico"]
    }
  };

  const c = config[cliente] || config["AgroForte Sementes"];
  const nomes = ["José Santos", "Maria Silva", "João Pereira", "Ana Oliveira", "Carlos Gomes", "Luiz Costa", "Aline Ribeiro", "Gustavo Teixeira", "Juliana Barbosa", "Rodrigo Lima"];
  const ddds = ["11", "19", "16", "31", "41", "51", "62"];

  for (let i = 30; i >= 0; i--) {
    const dataAlvo = new Date(agora);
    dataAlvo.setDate(agora.getDate() - i);
    const diaSemana = dataAlvo.getDay();
    let numLeads = (diaSemana === 0 || diaSemana === 6) ? 2 : 7; // Menos leads fim de semana

    for (let j = 0; j < numLeads; j++) {
      const h = new Date(dataAlvo);
      h.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      leads.push({
        date: h.toISOString().replace('T', ' ').substring(0, 19),
        name: nomes[Math.floor(Math.random() * nomes.length)],
        phone: `(${ddds[Math.floor(Math.random() * ddds.length)]}) 9${Math.floor(Math.random()*8999)+1000}-${Math.floor(Math.random()*8999)+1000}`,
        device: c.dispositivos[Math.floor(Math.random() * c.dispositivos.length)],
        platform: c.plataformas[Math.floor(Math.random() * c.plataformas.length)],
        campaign: c.campanhas[Math.floor(Math.random() * c.campanhas.length)],
        adset: c.conjuntos[Math.floor(Math.random() * c.conjuntos.length)],
        creative: c.criativos[Math.floor(Math.random() * c.criativos.length)],
        copy: c.copies[Math.floor(Math.random() * c.copies.length)]
      });
    }
  }
  return leads.sort((a,b) => new Date(b.date) - new Date(a.date));
}
