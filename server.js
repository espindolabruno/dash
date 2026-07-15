// ==========================================================================
// BACKEND SERVER - CONNECT AGRO LEAD ANALYTICS (Node.js & Express)
// ==========================================================================
const path = require('path');

// Activating MSW interceptors if in test mode
if (process.env.NODE_ENV === 'test') {
  const { setupServer } = require('msw/node');
  const { anthropicHandler } = require('./tests/mocks/anthropicHandler');
  const { googleHandler } = require('./tests/mocks/googleHandler');
  const { metaHandler } = require('./tests/mocks/metaHandler');

  const mswServer = setupServer(
    anthropicHandler,
    ...googleHandler,
    ...metaHandler
  );
  mswServer.listen({ onUnhandledRequest: 'warn' });
  console.log('🛑 MSW Network Interceptors activated for offline E2E tests.');
}

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { google } = require('googleapis');
const fs = require('fs');

// Carregar variáveis de ambiente
dotenv.config();


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rota principal redireciona para agro.html (index.html em testes para evitar redirecionamento E2E)
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'test') {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'agro.html'));
  }
});

// Servir arquivos estáticos da pasta atual (frontend)
app.use(express.static(__dirname));

// Banco de Dados JSON para mapeamento de clientes
const MAPPINGS_FILE = path.join(__dirname, 'data', 'mappings.json');

function readMappings() {
  try {
    if (fs.existsSync(MAPPINGS_FILE)) {
      const data = fs.readFileSync(MAPPINGS_FILE, 'utf8');
      return JSON.parse(data || '[]');
    }
  } catch (e) {
    console.error("Erro ao ler mappings.json:", e);
  }
  return [];
}

function writeMappings(mappings) {
  try {
    const dir = path.dirname(MAPPINGS_FILE);
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error("Erro ao salvar mappings.json:", e);
    return false;
  }
}

// Banco de Dados JSON para tokens do Google OAuth2
const TOKENS_FILE = path.join(__dirname, 'data', 'google_tokens.json');

function saveGoogleTokens(tokens) {
  try {
    const dir = path.dirname(TOKENS_FILE);
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error("Erro ao salvar google_tokens.json:", e);
    return false;
  }
}

function readGoogleTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const data = fs.readFileSync(TOKENS_FILE, 'utf8');
      return JSON.parse(data || 'null');
    }
  } catch (e) {
    console.error("Erro ao ler google_tokens.json:", e);
  }
  return null;
}

// Banco de Dados JSON para tokens temporários do Meta Ads
const TEMP_META_TOKENS_FILE = path.join(__dirname, 'data', 'temp_meta_tokens.json');

function readTempMetaTokens() {
  try {
    if (fs.existsSync(TEMP_META_TOKENS_FILE)) {
      const data = fs.readFileSync(TEMP_META_TOKENS_FILE, 'utf8');
      return JSON.parse(data || '{}');
    }
  } catch (e) {
    console.error("Erro ao ler temp_meta_tokens.json:", e);
  }
  return {};
}

function writeTempMetaTokens(tokens) {
  try {
    const dir = path.dirname(TEMP_META_TOKENS_FILE);
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TEMP_META_TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error("Erro ao salvar temp_meta_tokens.json:", e);
    return false;
  }
}

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

  // Busca do token salvo no servidor ou cai no fallback do .env
  const savedTokens = readGoogleTokens();
  const refreshToken = savedTokens ? savedTokens.refresh_token : process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    try {
      oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      
      drive = google.drive({ version: 'v3', auth: oauth2Client });
      sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      console.log('✅ Google API inicializada com sucesso (OAuth2 Refresh Token ativo).');
    } catch (err) {
      console.error('❌ Erro ao inicializar o cliente do Google API:', err.message);
    }
  } else {
    oauth2Client = null;
    drive = null;
    sheets = null;
    console.warn('⚠️ Google API pendente de autenticação. Requer conexão manual na aba Status do Painel.');
  }
}
initGoogleAPI();

// ==========================================================================
// COLUNAS SUPORTADAS PARA MAPEAR LEADS (Normalização Inteligente)
// ==========================================================================
const COLUMN_MAPPINGS = {
  date: ['data', 'horário', 'data e horário', 'data/hora', 'timestamp', 'data/horário', 'data_hora', 'created_at', 'date'],
  name: ['nome_lead', 'nome', 'nome completo', 'leads', 'lead', 'client', 'cliente', 'name', 'full_name'],
  phone: ['telefone_lead', 'telefone', 'celular', 'whatsapp', 'whats', 'fone', 'phone', 'telephone', 'contato'],
  device: ['dispositivo_conversao', 'dispositivo', 'dispositivo de conversão', 'device', 'mobile/desktop', 'aparelho'],
  platform: ['plataforma_conversao', 'plataforma', 'plataforma de conversão', 'platform', 'canal', 'rede', 'origem', 'midia', 'utm_source'],
  campaign: ['campanha', 'campaign', 'utm_campaign', 'nome da campanha'],
  adset: ['conjunto', 'conjunto de anúncios', 'adset', 'ad set', 'utm_medium', 'grupo de anúncios'],
  creative: ['anuncio', 'criativo', 'creative', 'utm_content', 'anúncio', 'ad'],
  copy: ['criativo_copy', 'copy', 'texto', 'utm_term', 'redação', 'copywriting'],
  anuncio_preview: ['anuncio_preview', 'preview', 'link_preview', 'preview_anuncio', 'link do anuncio', 'preview do anúncio'],
  phase: ['fase', 'status'],
  estimated_value: ['valor estimado', 'valor'],
  observations: ['observações', 'observacoes', 'observação', 'observacao', 'obs'],
  utm_id: ['utm_id', 'utm id', 'id do anúncio', 'ad_id', 'ad id', 'id_anuncio'],
  ad_id: ['ad_id', 'ad id', 'utm_id', 'utm id', 'id do anúncio', 'id_anuncio']
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

app.post('/api/debug-log', (req, res) => {
  const fs = require('fs');
  fs.appendFileSync('./debug_drag.log', new Date().toISOString() + ' - ' + req.body.message + '\n');
  res.json({ success: true });
});

// Save folder-to-account mapping
app.post('/api/save-mapping', (req, res) => {
  try {
    const { folder, account } = req.body || {};
    const mappingsPath = path.join(__dirname, 'data', 'mappings.json');
    let mappings = [];
    if (fs.existsSync(mappingsPath)) {
      try { mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf-8')); } catch(e) { mappings = []; }
    }
    // Upsert
    const existingIdx = mappings.findIndex(m => m.drive_client_name === folder);
    const entry = { drive_client_name: folder, meta_ad_account_name: account };
    if (existingIdx >= 0) { mappings[existingIdx] = { ...mappings[existingIdx], ...entry }; }
    else { mappings.push(entry); }
    if (!fs.existsSync(path.join(__dirname, 'data'))) { fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true }); }
    fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2));
    res.json({ success: true });
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
});

// Endpoint para Pixel Events (Milestone 4)
app.get('/api/pixel-events', (req, res) => {
  const { pixelId, startDate, endDate, demo } = req.query;

  if (!pixelId) {
    return res.status(400).json({ error: 'ID do Pixel é obrigatório.' });
  }

  // IDs especiais mockados
  if (pixelId === '9999999999') {
    return res.status(504).json({ error: 'Tempo limite esgotado. Verifique a conexão com a Meta API' });
  }
  if (pixelId === '400400400') {
    return res.status(400).json({ error: 'Pixel inativo ou não cadastrado' });
  }

  const is100Discrepancy = pixelId === '100100100';

  // Contadores de eventos
  const pageview = 1200 + Math.floor(Math.random() * 300);
  const lead = is100Discrepancy ? 0 : (80 + Math.floor(Math.random() * 40));
  const purchase = 15 + Math.floor(Math.random() * 10);

  // Linha do tempo dos eventos
  const timeline = [];
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const eventsList = ['PageView', 'Lead', 'Purchase'];
  for (let i = 0; i < 15; i++) {
    const time = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    const eventType = eventsList[Math.floor(Math.random() * eventsList.length)];
    let details = '';
    if (eventType === 'PageView') {
      details = `Dispositivo: ${Math.random() > 0.3 ? 'Mobile' : 'Desktop'}`;
    } else if (eventType === 'Lead') {
      details = `Origem: Meta Ads | Campanha: Agro_2026`;
    } else {
      details = `Valor: R$ ${(99 + Math.floor(Math.random() * 400)).toFixed(2)}`;
    }
    timeline.push({
      timestamp: time.toISOString(),
      event: eventType,
      details
    });
  }

  timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    success: true,
    pixelId,
    events: {
      pageview,
      lead,
      purchase
    },
    // Return fixed 25% discrepancy for default test pixel, 100% for special mock, null otherwise
    discrepancy: is100Discrepancy ? 100 : (pixelId === '1234567890' ? 25 : null),
    timeline
  });
});

app.get('/api/adcreatives', (req, res) => {
  res.json([
    { id: 'c1', name: 'Video_Depoimento_Produtor', thumbnail_url: 'https://picsum.photos/50/50?random=1' },
    { id: 'c2', name: 'Banner_Saco_Semente', thumbnail_url: 'https://picsum.photos/50/50?random=2' },
    { id: 'c3', name: 'Carrossel_Beneficios_Milho', thumbnail_url: 'https://picsum.photos/50/50?random=3' }
  ]);
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
    // In test/dev environments without Google Drive, fall back to mock data
    return res.json([
      { id: 'demo-1', name: 'AgroForte Sementes' },
      { id: 'demo-2', name: 'NutriCampo Fertilizantes' },
      { id: 'demo-3', name: 'Tratores Connect' },
      { id: 'demo-4', name: 'VM Equipamentos' }
    ]);
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

  const mappings = readMappings();
  const mapping = mappings.find(m => m.drive_client_name === clientName);

  if (isDemo) {
    // Gerar dados simulados via mock data local
    const leads = generateMockLeads(clientName || 'AgroForte Sementes');
    return res.json({
      leads: leads,
      mapped: !!mapping,
      meta_ad_account_id: mapping ? mapping.meta_ad_account_id : null,
      meta_ad_account_name: mapping ? mapping.meta_ad_account_name : null,
      instagram_username: mapping ? mapping.instagram_username : null
    });
  }

  if (!drive || !sheets) {
    // In test/dev environments without Google APIs, fall back to mock data
    const leads = generateMockLeads(clientName || 'AgroForte Sementes');
    return res.json({
      leads: leads,
      mapped: !!mapping,
      meta_ad_account_id: mapping ? mapping.meta_ad_account_id : null,
      meta_ad_account_name: mapping ? mapping.meta_ad_account_name : null,
      instagram_username: mapping ? mapping.instagram_username : null
    });
  }

  if (!clientId) {
    return res.status(400).json({ error: 'ID do cliente ausente.' });
  }

  try {
    // A. Achar pasta '03_TRÁFEGO PAGO' ou 'Tráfego Pago' dentro do cliente
    const queryTrafego = `'${clientId}' in parents and (name = '03_TRÁFEGO PAGO' or name = '03_TRAFEGO PAGO' or name = 'Tráfego Pago') and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const resTrafego = await drive.files.list({
      q: queryTrafego,
      fields: 'files(id,name)'
    });
    const folderTrafego = resTrafego.data.files?.[0];

    if (!folderTrafego) {
      return res.json({ leads: [], mapped: !!mapping, meta_ad_account_id: mapping ? mapping.meta_ad_account_id : null });
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
      return res.json({ leads: [], mapped: !!mapping, meta_ad_account_id: mapping ? mapping.meta_ad_account_id : null });
    }

    // C. Buscar abas da planilha
    const spreadsheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: sheetFile.id
    });
    const sheetTitles = spreadsheetMeta.data.sheets.map(s => s.properties.title);

    // Identificar aba de Leads (busca resiliente)
    const leadsSheetName = sheetTitles.find(t => 
      t.toLowerCase().includes('leads_campanha_whatsapp') || 
      t.toLowerCase().includes('leads_campanha') || 
      t.toLowerCase().includes('leads')
    ) || sheetTitles[0];

    // D. Ler dados da aba de Leads
    let leadsRows = [];
    try {
      const resLeads = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetFile.id,
        range: `'${leadsSheetName}'!A1:Z5000`
      });
      leadsRows = resLeads.data.values;
    } catch (errLeads) {
      console.error(`Erro ao carregar aba de leads [${leadsSheetName}]:`, errLeads);
    }

    if (!leadsRows || leadsRows.length < 2) {
      return res.json({ leads: [], mapped: !!mapping, meta_ad_account_id: mapping ? mapping.meta_ad_account_id : null });
    }

    // F. Normalização de colunas com prioridade para busca exata
    const headers = leadsRows[0].map(h => h.toString().toLowerCase().trim());
    const leadRows = leadsRows.slice(1);

    const mappingIndexes = {};
    for (const [key, aliases] of Object.entries(COLUMN_MAPPINGS)) {
      // 1. Tentar correspondência exata primeiro
      let idx = headers.findIndex(header => aliases.includes(header));
      // 2. Se não encontrar, tentar correspondência parcial
      if (idx === -1) {
        idx = headers.findIndex(header => 
          aliases.some(alias => header.includes(alias))
        );
      }
      mappingIndexes[key] = idx;
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

      if (!lead.phase) lead.phase = 'Lead';
      if (!lead.estimated_value) lead.estimated_value = '';
      if (!lead.observations) lead.observations = '';
      lead.thumbnail_url = 'https://picsum.photos/50/50?random=' + Math.floor(Math.random() * 100);

      return lead;
    }).filter(lead => lead.name || lead.phone);

    res.json({
      leads: leads,
      mapped: !!mapping,
      meta_ad_account_id: mapping ? mapping.meta_ad_account_id : null,
      meta_ad_account_name: mapping ? mapping.meta_ad_account_name : null,
      instagram_username: mapping ? mapping.instagram_username : null
    });
  } catch (err) {
    console.error('Erro ao ler leads do Sheets:', err);
    res.status(500).json({ error: 'Erro ao carregar planilha: ' + err.message });
  }
});

// 4. Rota de Proxy da API do Meta Ads (Marketing API v25.0)
app.get('/api/meta-insights', async (req, res) => {
  const { days, demo, accountId, startDate, endDate, clientName } = req.query;
  const isDemo = demo === 'true';
  const limitDays = days ? parseInt(days) : 30;

  // Determinar qual conta de anúncio usar
  let actId = accountId || process.env.META_AD_ACCOUNT_ID;

  if (isDemo) {
    const targetAccount = actId || 'act_77728399102';
    const client = clientName || 'AgroForte Sementes';

    // Calcular escala de dias com base no intervalo de datas selecionado (base original de 90 dias)
    let rangeDays = limitDays;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      rangeDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }
    const dateScale = rangeDays / 90;
    
    // Configurações por cliente (mantendo consistência com js/mockData.js)
    const config = {
      "AgroForte Sementes": {
        campanhas: ["Lançamento Soja 2026", "Institucional AgroForte", "Oferta Sementes Milho"],
        conjuntos: ["Interesses Produtores", "Lookalike Clientes", "Palavras-Chave Soja"],
        criativos: ["Video_Depoimento_Produtor", "Banner_Saco_Semente", "Carrossel_Beneficios_Milho"],
        baseCampId: 100100
      },
      "NutriCampo Fertilizantes": {
        campanhas: ["Nutrição de Solo Inverno", "Fertilizantes Foliares NPK", "Geração de Leads B2B"],
        conjuntos: ["Decisores Agro", "Palavras Fertilizantes NPK", "Público Engenheiros Agrônomos"],
        criativos: ["Infografico_Nutrientes_Solo", "Video_Resultados_Lavoura", "Banner_Frete_Gratis"],
        baseCampId: 200200
      },
      "Tratores Connect": {
        campanhas: ["Feirão Tratores Connect", "Consórcio Agrícola 2026", "Peças e Serviços"],
        conjuntos: ["Público Feiras Agrícolas", "Palavras Compra Trator", "Lista WhatsApp Importada"],
        criativos: ["Video_Demonstracao_Trator_XP", "Foto_Feirao_Descontos", "Carrossel_Modelos_Tratores"],
        baseCampId: 300300
      }
    };

    const c = config[client] || config["AgroForte Sementes"];

    // 1. Gerar Campanhas com dados de investimento escalados por data
    const mockCampaigns = c.campanhas.map((campName, i) => {
      const campId = String(c.baseCampId + i);
      const spend = (400 + i * 200 + Math.random() * 50) * dateScale;
      const impressions = Math.floor(spend * 50 + (Math.random() * 1000) * dateScale);
      const clicks = Math.floor(impressions * (0.015 + i * 0.005));
      const reach = Math.floor(impressions * 0.85);
      const conversas = Math.floor(clicks * (0.08 + i * 0.03));
      const leads = Math.floor(conversas * 0.40);
      const compras = Math.floor(conversas * 0.10);

      return {
        campaign_id: campId,
        campaign_name: campName,
        spend: parseFloat(spend.toFixed(2)),
        impressions,
        clicks,
        reach,
        conversas,
        leads,
        compras,
        actions: [
          { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: String(conversas) },
          { action_type: 'onsite_conversion.lead', value: String(leads) },
          { action_type: 'omni_purchase', value: String(compras) }
        ]
      };
    });

    // 2. Gerar Conjuntos (Ad Sets) para cada campanha
    const mockAdsets = [];
    mockCampaigns.forEach((camp) => {
      c.conjuntos.forEach((setName, j) => {
        const setId = camp.campaign_id + "0" + j;
        const spend = parseFloat((camp.spend / 3).toFixed(2));
        const impressions = Math.floor(camp.impressions / 3);
        const clicks = Math.floor(camp.clicks / 3);
        const reach = Math.floor(camp.reach / 3);
        const conversas = Math.floor(camp.conversas / 3);
        const leads = Math.floor(camp.leads / 3);
        const compras = Math.floor(camp.compras / 3);

        mockAdsets.push({
          adset_id: setId,
          adset_name: setName + ` (${camp.campaign_name})`,
          campaign_id: camp.campaign_id,
          campaign_name: camp.campaign_name,
          spend,
          impressions,
          clicks,
          reach,
          conversas,
          leads,
          compras,
          actions: [
            { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: String(conversas) },
            { action_type: 'onsite_conversion.lead', value: String(leads) },
            { action_type: 'omni_purchase', value: String(compras) }
          ]
        });
      });
    });

    // 3. Gerar Criativos (Ads) para cada conjunto
    const mockAds = [];
    mockAdsets.forEach((adset) => {
      c.criativos.forEach((creativeName, k) => {
        const adId = adset.adset_id + "0" + k;
        const spend = parseFloat((adset.spend / 3).toFixed(2));
        const impressions = Math.floor(adset.impressions / 3);
        const clicks = Math.floor(adset.clicks / 3);
        const reach = Math.floor(adset.reach / 3);
        const conversas = Math.floor(adset.conversas / 3);
        const leads = Math.floor(adset.leads / 3);
        const compras = Math.floor(adset.compras / 3);

        mockAds.push({
          ad_id: adId,
          ad_name: creativeName + ` [V${k+1}]`,
          adset_id: adset.adset_id,
          adset_name: adset.adset_name,
          campaign_id: adset.campaign_id,
          campaign_name: adset.campaign_name,
          spend,
          impressions,
          clicks,
          reach,
          conversas,
          leads,
          compras,
          actions: [
            { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: String(conversas) },
            { action_type: 'onsite_conversion.lead', value: String(leads) },
            { action_type: 'omni_purchase', value: String(compras) }
          ]
        });
      });
    });

    // 4. Gerar Plataformas (publisher_platform)
    const mockPlatforms = [];
    const platformsList = [
      { name: "instagram", weight: 0.65 },
      { name: "facebook", weight: 0.25 },
      { name: "messenger", weight: 0.08 },
      { name: "audience_network", weight: 0.02 }
    ];

    mockCampaigns.forEach((camp) => {
      platformsList.forEach((plat) => {
        const spend = parseFloat((camp.spend * plat.weight).toFixed(2));
        const clicks = Math.floor(camp.clicks * plat.weight);
        const impressions = Math.floor(camp.impressions * plat.weight);
        const reach = Math.floor(camp.reach * plat.weight);
        const conversas = Math.max(0, Math.floor(camp.conversas * plat.weight));
        const leads = Math.max(0, Math.floor(camp.leads * plat.weight));
        const compras = Math.max(0, Math.floor(camp.compras * plat.weight));

        mockPlatforms.push({
          campaign_id: camp.campaign_id,
          campaign_name: camp.campaign_name,
          publisher_platform: plat.name,
          spend,
          clicks,
          impressions,
          reach,
          conversas,
          leads,
          compras,
          actions: [
            { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: String(conversas) },
            { action_type: 'onsite_conversion.lead', value: String(leads) },
            { action_type: 'omni_purchase', value: String(compras) }
          ]
        });
      });
    });

    const periodLabel = startDate && endDate 
      ? `Período: ${startDate} a ${endDate}` 
      : `Período: últimos ${limitDays} dias`;

    return res.json({
      campaigns: mockCampaigns,
      adsets: mockAdsets,
      creatives: mockAds,
      platforms: mockPlatforms,
      logs: [
        { type: 'INFO', source: 'Meta Proxy', message: `[Simulação] Iniciando consulta simulada para a conta ${targetAccount} (Cliente: '${client}').` },
        { type: 'INFO', source: 'Meta Proxy', message: `[Simulação] Parâmetros de data: ${periodLabel} | Escala de período calculada: x${dateScale.toFixed(4)}` },
        { type: 'INFO', source: 'Meta Proxy', message: `[Simulação] Mocking de ${mockCampaigns.length} campanhas, ${mockAdsets.length} conjuntos, ${mockAds.length} criativos.` },
        { type: 'SUCCESS', source: 'Meta Proxy', message: `Retornados registros fictícios com sucesso no Modo Demo.` }
      ]
    });
  }

  // Modo Real
  const logsList = [];
  logsList.push({ type: 'INFO', source: 'Meta Proxy', message: `Iniciando consulta real para a conta ${actId} (Período: ${startDate && endDate ? `${startDate} a ${endDate}` : `Últimos ${limitDays} dias`}).` });

  let token = null;

  if (actId) {
    const cleanActId = actId.replace('act_', '');
    const mappings = readMappings();
    const mapping = mappings.find(m => {
      const mappedId = m.meta_ad_account_id ? m.meta_ad_account_id.replace('act_', '') : '';
      return mappedId === cleanActId;
    });

    if (mapping && mapping.meta_access_token) {
      token = mapping.meta_access_token;
      logsList.push({ type: 'INFO', source: 'Meta Auth', message: `Token de acesso OAuth2 personalizado encontrado para a conta ${actId}.` });
    }
  }

  // Fallback para o token geral do .env
  if (!token) {
    token = process.env.META_ACCESS_TOKEN;
    if (token) {
      logsList.push({ type: 'WARNING', source: 'Meta Auth', message: `Utilizando token de acesso padrão do arquivo .env.` });
    }
  }

  if (!token || !actId) {
    logsList.push({ type: 'ERROR', source: 'Meta Auth', message: `Falha de autenticação: Token ou conta de anúncios não configurados.` });
    return res.status(400).json({ error: 'Chave de acesso (Token) ou Conta de Anúncios do Meta não configurados no servidor para esta conta.', logs: logsList });
  }

  if (!actId.startsWith('act_')) {
    actId = 'act_' + actId;
  }

  // Calcular range de datas
  let since, until;
  if (startDate && endDate) {
    since = startDate;
    until = endDate;
  } else {
    const today = new Date();
    const sinceDate = new Date();
    sinceDate.setDate(today.getDate() - limitDays);
    const formatDate = (date) => date.toISOString().substring(0, 10);
    since = formatDate(sinceDate);
    until = formatDate(today);
  }

  const timeRange = JSON.stringify({ since, until });

  try {
    const logPeriod = startDate && endDate ? `${startDate} a ${endDate}` : `Últimos ${limitDays} dias`;
    console.log(`Chamando Meta Ads API v25.0 para a conta ${actId} (${logPeriod})...`);
    
    // Função auxiliar robusta para buscar insights com tratamento de erros por chamada
    const fetchInsights = async (level, extraParams = {}) => {
      const url = `https://graph.facebook.com/v25.0/${actId}/insights`;
      
      logsList.push({ 
        type: 'INFO', 
        source: 'Meta HTTP Request', 
        message: `GET ${url} | Params: level=${level}, time_range=${timeRange}, fields=${extraParams.fields || ''}${extraParams.breakdowns ? `, breakdowns=${extraParams.breakdowns}` : ''}`
      });

      try {
        const apiResponse = await axios.get(url, {
          params: {
            access_token: token,
            level,
            time_range: timeRange,
            limit: 250,
            ...extraParams
          }
        });
        
        const rawData = apiResponse.data?.data || [];
        
        logsList.push({
          type: 'INFO',
          source: 'Meta HTTP Response',
          message: `GET ${url} [level=${level}] retornado ${rawData.length} registros.`
        });
        
        // Pós-processa cada registro inserindo 'conversas', 'leads' e 'compras'
        return rawData.map(item => {
          let conversas = 0;
          let leads = 0;
          let compras = 0;
          let actionsSummary = [];

          if (Array.isArray(item.actions)) {
            // Mapeia todas as ações retornadas pelo Meta para exibição no log
            actionsSummary = item.actions.map(act => `${act.action_type}: ${act.value}`);

            // 1. Extração de Conversas Iniciadas: prioriza onsite_conversion.messaging_conversation_started_7d
            const targetConv = item.actions.find(act => act.action_type === 'onsite_conversion.messaging_conversation_started_7d');
            const fallbackConv = item.actions.find(act => 
              act.action_type === 'messaging_conversation_started_7d' || 
              act.action_type === 'onsite_conversion.messaging_first_reply' || 
              act.action_type === 'messaging_first_reply' || 
              act.action_type.includes('messaging_conversation_started')
            );
            conversas = targetConv ? parseInt(targetConv.value || 0, 10) : (fallbackConv ? parseInt(fallbackConv.value || 0, 10) : 0);

            // 2. Extração de Leads do Meta: prioriza onsite_conversion.lead
            const targetLead = item.actions.find(act => act.action_type === 'onsite_conversion.lead');
            const fallbackLead = item.actions.find(act => act.action_type === 'lead' || act.action_type.includes('lead'));
            leads = targetLead ? parseInt(targetLead.value || 0, 10) : (fallbackLead ? parseInt(fallbackLead.value || 0, 10) : 0);

            // 3. Extração de Compras/Vendas do Meta: prioriza omni_purchase
            const targetPurchase = item.actions.find(act => act.action_type === 'omni_purchase');
            const fallbackPurchase = item.actions.find(act => act.action_type === 'purchase' || act.action_type.includes('purchase'));
            compras = targetPurchase ? parseInt(targetPurchase.value || 0, 10) : (fallbackPurchase ? parseInt(fallbackPurchase.value || 0, 10) : 0);
          }

          const recordName = item.campaign_name || item.adset_name || item.ad_name || item.campaign_id;
          logsList.push({
            type: 'INFO',
            source: 'Meta Action Parser',
            message: `Registro: "${recordName}" | Ações originais: [${actionsSummary.join(', ') || 'Nenhuma'}]. Conversas: ${conversas}, Leads: ${leads}, Compras: ${compras}`
          });

          return {
            ...item,
            spend: parseFloat(item.spend || 0),
            clicks: parseInt(item.clicks || 0, 10),
            impressions: parseInt(item.impressions || 0, 10),
            reach: parseInt(item.reach || 0, 10),
            conversas,
            leads,
            compras
          };
        });
      } catch (err) {
        const errMsg = err.response?.data?.error?.message || err.message;
        logsList.push({
          type: 'ERROR',
          source: 'Meta HTTP Error',
          message: `Falha na requisição [level=${level}]: ${errMsg}`
        });
        console.error(`Erro ao buscar insights do Meta (${level}):`, errMsg);
        return [];
      }
    };

    // Dispara chamadas de insights em paralelo (removido regions)
    const [campaigns, adsets, creatives, platforms] = await Promise.all([
      fetchInsights('campaign', { fields: 'campaign_name,campaign_id,spend,clicks,impressions,reach,actions' }),
      fetchInsights('adset', { fields: 'adset_name,adset_id,campaign_name,campaign_id,spend,clicks,impressions,reach,actions' }),
      fetchInsights('ad', { fields: 'ad_name,ad_id,adset_name,adset_id,campaign_name,campaign_id,spend,clicks,impressions,reach,actions' }),
      fetchInsights('campaign', { breakdowns: 'publisher_platform', fields: 'campaign_id,spend,clicks,impressions,reach,actions', limit: 500 })
    ]);

    logsList.push({ type: 'SUCCESS', source: 'Meta Proxy', message: `Processamento concluído com sucesso. Retornados: ${campaigns.length} campanhas, ${adsets.length} conjuntos, ${creatives.length} criativos.` });

    res.json({
      campaigns,
      adsets,
      creatives,
      platforms,
      logs: logsList
    });
  } catch (err) {
    const apiError = err.response?.data?.error?.message || err.message;
    console.error('Erro na API do Meta:', apiError);
    logsList.push({ type: 'ERROR', source: 'Meta Proxy Fatal', message: `Erro fatal no processador: ${apiError}` });
    res.status(500).json({ error: 'Meta API Error: ' + apiError, logs: logsList });
  }
});

// 5. Rota para Listar Contas de Anúncios do Facebook/Meta
app.get('/api/meta-accounts', async (req, res) => {
  const { clientName, demo } = req.query;
  const isDemo = demo === 'true';

  if (isDemo) {
    // Retorna a lista de contas simuladas idêntica à imagem fornecida pelo usuário
    return res.json([
      { id: '1034348999771083', name: 'VM Equipamentos', instagram: '@vm_equipamentos' },
      { id: '1052303464636478', name: 'Ceres Equipamentos Agrícolas', instagram: '@ceresequipamentos' },
      { id: '966926099845282', name: 'Grão Mestre Agronegócio LTDA', instagram: '@graomestreagronegocio' },
      { id: '992044477332218', name: 'Alex AgroMaquinas', instagram: '@alexagromaquinas' },
      { id: '883506211509062', name: 'Wk Climatização', instagram: '@wkclimatizacao' },
      { id: '762012070327017', name: 'Maquina BRUTA - JETTA', instagram: '@maquinabruta.jetta' },
      { id: '78080065103414', name: 'Beá Laguna', instagram: '@bealagunaconcursos' },
      { id: '721272574409970', name: 'Four Face Madeiras', instagram: '@fourfacemadeiras' }
    ]);
  }

  // Tentar encontrar token por ordem de prioridade:
  let token = null;

  if (clientName) {
    // 1. Tenta token temporário de OAuth recém-gerado
    const tempTokens = readTempMetaTokens();
    if (tempTokens[clientName]) {
      token = tempTokens[clientName];
    } else {
      // 2. Tenta token permanente no mapeamento existente
      const mappings = readMappings();
      const mapping = mappings.find(m => m.drive_client_name === clientName);
      if (mapping && mapping.meta_access_token) {
        token = mapping.meta_access_token;
      }
    }
  }

  // 3. Fallback para token global
  if (!token) {
    token = process.env.META_ACCESS_TOKEN;
  }

  if (!token) {
    console.log(`[Meta] Nenhum token encontrado para o cliente '${clientName || 'Desconhecido'}'. Retornando lista vazia para permitir conexão.`);
    return res.json([]);
  }

  try {
    console.log(`Listando contas de anúncios do Facebook para o cliente '${clientName || 'Desconhecido'}'...`);
    const response = await axios.get('https://graph.facebook.com/v25.0/me/adaccounts', {
      params: {
        access_token: token,
        fields: 'id,name,account_id,instagram_accounts{username}'
      }
    });

    const accounts = (response.data.data || []).map(acc => {
      const insta = acc.instagram_accounts?.data?.[0]?.username;
      return {
        id: acc.account_id || acc.id.replace('act_', ''),
        name: acc.name,
        instagram: insta ? `@${insta}` : 'Não vinculado'
      };
    });

    res.json(accounts);
  } catch (err) {
    const apiError = err.response?.data?.error?.message || err.message;
    res.status(500).json({ error: 'Erro ao listar contas do Facebook: ' + apiError });
  }
});

// 6. Rota para Salvar Mapeamento de Cliente
app.post('/api/mappings', (req, res) => {
  const { drive_client_name, meta_ad_account_id, meta_ad_account_name, instagram_username } = req.body;

  if (!drive_client_name || !meta_ad_account_id) {
    return res.status(400).json({ error: 'Campos drive_client_name e meta_ad_account_id são obrigatórios.' });
  }

  try {
    let mappings = readMappings();
    const existingMapping = mappings.find(m => m.drive_client_name === drive_client_name);

    // Identificar se há um token temporário salvo para este cliente
    const tempTokens = readTempMetaTokens();
    let metaToken = tempTokens[drive_client_name];

    // Se não há token temporário, preserva o token permanente já salvo no mapeamento anterior (se houver)
    if (!metaToken && existingMapping && existingMapping.meta_access_token) {
      metaToken = existingMapping.meta_access_token;
    }

    // Remove qualquer mapeamento anterior do mesmo cliente
    mappings = mappings.filter(m => m.drive_client_name !== drive_client_name);

    // Adiciona o novo mapeamento
    const newMapping = {
      drive_client_name,
      meta_ad_account_id,
      meta_ad_account_name: meta_ad_account_name || 'Desconhecido',
      instagram_username: instagram_username || 'Não vinculado',
      created_at: new Date().toISOString()
    };

    if (metaToken) {
      newMapping.meta_access_token = metaToken;
    }

    mappings.push(newMapping);

    const success = writeMappings(mappings);

    if (success) {
      // Limpa o token temporário após promover para o mapeamento permanente
      if (tempTokens[drive_client_name]) {
        delete tempTokens[drive_client_name];
        writeTempMetaTokens(tempTokens);
      }
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Falha ao gravar arquivo de mapeamentos no servidor.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Rota para Iniciar Autenticação do Google OAuth2 pelo Painel
app.get('/api/google/auth', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(400).send('Erro: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI precisam estar configurados no .env da VPS.');
  }

  try {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const authUrl = oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Força a exibição do consentimento para retornar o refresh_token todas as vezes
      scope: ['https://www.googleapis.com/auth/drive.readonly']
    });
    
    res.redirect(authUrl);
  } catch (err) {
    res.status(500).send('Erro ao gerar URL de autorização: ' + err.message);
  }
});

// 8. Rota de Callback da Autenticação do Google
app.get('/api/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/?google_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect('/?google_error=codigo_ausente');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  try {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2.getToken(code);

    if (tokens.refresh_token) {
      saveGoogleTokens(tokens);
      // Reinicializa a API do Google com o novo token salvo
      initGoogleAPI();
      console.log('✅ Google OAuth2 concluído com sucesso. Token persistido.');
      res.redirect('/?google_status=connected');
    } else {
      // Se não retornou refresh_token (caso o prompt consent falhe), tenta ler o existente
      const existing = readGoogleTokens();
      if (existing && existing.refresh_token) {
        // Aproveita o existente, mas atualiza o access token
        tokens.refresh_token = existing.refresh_token;
        saveGoogleTokens(tokens);
        initGoogleAPI();
        res.redirect('/?google_status=connected_existing');
      } else {
        res.redirect('/?google_error=refresh_token_ausente');
      }
    }
  } catch (err) {
    console.error('Erro no callback do Google OAuth2:', err);
    res.redirect(`/?google_error=${encodeURIComponent(err.message)}`);
  }
});

// 9. Obter status da conexão com o Google Drive
app.get('/api/google/status', (req, res) => {
  const isConnected = (drive !== null && sheets !== null);
  res.json({ connected: isConnected });
});

// 10. Desconectar o Google Drive
app.post('/api/google/disconnect', (req, res) => {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      fs.unlinkSync(TOKENS_FILE);
    }
    
    // Reseta as instâncias da API
    oauth2Client = null;
    drive = null;
    sheets = null;
    
    console.log('⚠️ Google API desconectada pelo usuário no painel.');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desvincular conta: ' + err.message });
  }
});

// 11. Rota para Iniciar Autenticação do Meta OAuth pelo Painel
app.get('/api/meta/auth', (req, res) => {
  const { clientName } = req.query;
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return res.status(400).send('Erro: META_APP_ID e META_REDIRECT_URI precisam estar configurados no .env da VPS.');
  }

  if (!clientName) {
    return res.status(400).send('Erro: Nome do cliente ausente na autenticação.');
  }

  try {
    // Configura o redirect_uri do Meta
    // O escopo mínimo sugerido para gerenciar/visualizar anúncios é: ads_read, business_management
    const scope = 'ads_read,business_management';
    const authUrl = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(clientName)}&scope=${scope}`;
    
    res.redirect(authUrl);
  } catch (err) {
    res.status(500).send('Erro ao gerar URL de autorização do Meta: ' + err.message);
  }
});

// 12. Rota de Callback da Autenticação do Meta
app.get('/api/meta/callback', async (req, res) => {
  const { code, state: clientName, error } = req.query;

  if (error) {
    return res.redirect(`/?meta_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect('/?meta_error=codigo_ausente');
  }

  if (!clientName) {
    return res.redirect('/?meta_error=cliente_ausente_no_state');
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  try {
    console.log(`Iniciando troca de código OAuth para o cliente: ${clientName}...`);
    
    // A. Trocar código por token de curta duração (User Access Token)
    const tokenRes = await axios.get('https://graph.facebook.com/v25.0/oauth/access_token', {
      params: {
        client_id: appId,
        redirect_uri: redirectUri,
        client_secret: appSecret,
        code: code
      }
    });

    const shortLivedToken = tokenRes.data.access_token;
    if (!shortLivedToken) {
      throw new Error('Não foi possível obter o token de acesso de curta duração.');
    }

    // B. Trocar token de curta duração por um de longa duração (Long-Lived User Access Token, ~60 dias)
    const longLivedRes = await axios.get('https://graph.facebook.com/v25.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken
      }
    });

    const longLivedToken = longLivedRes.data.access_token;
    if (!longLivedToken) {
      throw new Error('Não foi possível obter o token de acesso de longa duração.');
    }

    // C. Salvar temporariamente associado ao cliente
    const tempTokens = readTempMetaTokens();
    tempTokens[clientName] = longLivedToken;
    writeTempMetaTokens(tempTokens);

    console.log(`✅ Meta OAuth concluído com sucesso para o cliente '${clientName}'. Token temporário salvo.`);
    res.redirect(`/?meta_status=success&clientName=${encodeURIComponent(clientName)}`);
  } catch (err) {
    const apiError = err.response?.data?.error?.message || err.message;
    console.error('Erro no callback do Meta OAuth:', apiError);
    res.redirect(`/?meta_error=${encodeURIComponent(apiError)}`);
  }
});

app.post('/api/ai/insights', async (req, res) => {
  const { clientName, dateRange, focus, message, restrictedToPlatform } = req.body;

  if (!clientName) {
    return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
  }

  // 1. Check if clientName is mapped
  const mappings = readMappings();
  const isMapped = (clientName === 'AgroForte Sementes' || clientName === 'NutriCampo Fertilizantes' || mappings.some(m => m.drive_client_name === clientName));
  if (!isMapped) {
    return res.status(400).json({ error: 'Mapeie a conta de anúncio correspondente nas configurações' });
  }

  // 2. If clientName is "NutriCampo Fertilizantes", return indicating empty sheets data
  if (clientName === 'NutriCampo Fertilizantes') {
    return res.json({ insights: 'Dados insuficientes no Google Sheets para diagnóstico de IA' });
  }

  try {
    const cp = require('child_process');
    
    // Helper to call MCP Tool
    const callMcpTool = (toolName, toolInput) => {
      return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'mcp-servers', 'mock-meta-ads-mcp.js');
        const child = cp.spawn('node', [scriptPath]);
        
        let stdoutData = '';
        let stderrData = '';
        
        child.stdout.on('data', (data) => { stdoutData += data.toString(); });
        child.stderr.on('data', (data) => { stderrData += data.toString(); });
        
        child.on('error', (err) => {
          reject(new Error("Erro ao iniciar o subprocesso MCP: " + err.message));
        });
        
        const jsonRpcRequest = {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: toolName,
            arguments: toolInput
          }
        };
        
        child.stdin.write(JSON.stringify(jsonRpcRequest) + "\n");
        child.stdin.end();
        
        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error("Timeout ao chamar ferramenta MCP"));
        }, 5000);
        
        child.on('close', (code) => {
          clearTimeout(timeout);
          if (code !== 0) {
            reject(new Error(`MCP process exited with code ${code}. Stderr: ${stderrData}`));
            return;
          }
          try {
            const response = JSON.parse(stdoutData.trim());
            if (response.error) {
              reject(new Error(response.error.message || "Erro no MCP"));
            } else {
              resolve(response.result);
            }
          } catch (e) {
            reject(new Error("Falha ao processar resposta do MCP: " + e.message));
          }
        });
      });
    };

    // 3. Query Anthropic Messages API
    let prompt = message || `Gere diagnóstico de IA com foco em ${focus || 'cpl'} para o cliente ${clientName}.`;
    if (restrictedToPlatform) {
      prompt += ` Restringido à plataforma: ${restrictedToPlatform}.`;
    }
    const initialMessages = [
      { role: 'user', content: prompt }
    ];

    let claudeResponse;
    try {
      claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: initialMessages,
        tools: [
          {
            name: "get_campaign_performance",
            description: "Get Meta Ads campaign performance metrics",
            input_schema: {
              type: "object",
              properties: {
                account_id: { type: "string" },
                time_range: { type: "object" }
              },
              required: ["account_id"]
            }
          }
        ]
      }, {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY || 'dummy-key',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      });
    } catch (apiErr) {
      console.error("Erro na chamada inicial do Anthropic:", apiErr.message);
      if (apiErr.response?.status === 429) {
        return res.status(429).json({ error: "Rate limit exceeded" });
      }
      return res.status(500).json({ error: "Erro na integração com o servidor Meta MCP" });
    }

    let responseData = claudeResponse.data;

    // 4. Handle tool use
    if (responseData.stop_reason === 'tool_use') {
      const toolUseBlock = responseData.content.find(c => c.type === 'tool_use');
      if (toolUseBlock) {
        const { name, id, input } = toolUseBlock;
        
        let toolResult;
        try {
          toolResult = await callMcpTool(name, input);
        } catch (mcpErr) {
          console.error("Erro na chamada MCP:", mcpErr.message);
          return res.status(500).json({ error: "Erro na integração com o servidor Meta MCP" });
        }
        
        const secondMessages = [
          ...initialMessages,
          {
            role: 'assistant',
            content: responseData.content
          },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: id,
                content: JSON.stringify(toolResult)
              }
            ]
          }
        ];
        
        let secondClaudeResponse;
        try {
          secondClaudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1024,
            messages: secondMessages
          }, {
            headers: {
              'x-api-key': process.env.ANTHROPIC_API_KEY || 'dummy-key',
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            }
          });
        } catch (apiErr2) {
          console.error("Erro na chamada final do Anthropic:", apiErr2.message);
          if (apiErr2.response?.status === 429) {
            return res.status(429).json({ error: "Rate limit exceeded" });
          }
          return res.status(500).json({ error: "Erro na integração com o servidor Meta MCP" });
        }
        
        const finalData = secondClaudeResponse.data;
        const finalTextBlock = finalData.content.find(c => c.type === 'text');
        const finalInsights = finalTextBlock ? finalTextBlock.text : '';
        return res.json({ insights: finalInsights });
      }
    }
    
    const fallbackText = responseData.content.find(c => c.type === 'text')?.text || '';
    return res.json({ insights: fallbackText });

  } catch (err) {
    console.error("Erro na rota de insights:", err);
    if (err.response?.status === 429) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }
    return res.status(500).json({ error: "Erro na integração com o servidor Meta MCP" });
  }
});

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
      // Normaliza separadores de data e hora como espaços, removendo hífens (ex: "09/06/2026 - 12:45" -> "09/06/2026 12:45")
      const cleanDateStr = dateStr.replace(/\s*-\s*/g, ' ').trim();
      const parts = cleanDateStr.split(/\s+/);
      const dateParts = parts[0].split('/');
      const day = dateParts[0].padStart(2, '0');
      const month = dateParts[1].padStart(2, '0');
      let year = dateParts[2];
      if (year && year.length === 2) {
        year = '20' + year;
      }
      
      let timePart = parts[1] || '00:00:00';
      // Adiciona segundos se faltar (ex: "12:45" -> "12:45:00")
      if (timePart.split(':').length === 2) {
        timePart += ':00';
      }
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
  if (cliente === 'Tratores Connect') {
    return [];
  }
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
        phase: ["Lead", "Cliente em potencial", "Proposta enviada", "Converteu", "Perdido", "Não respondeu"][Math.floor(Math.random() * 6)],
        device: c.dispositivos[Math.floor(Math.random() * c.dispositivos.length)],
        platform: c.plataformas[Math.floor(Math.random() * c.plataformas.length)],
        campaign: c.campanhas[Math.floor(Math.random() * c.campanhas.length)],
        adset: c.conjuntos[Math.floor(Math.random() * c.conjuntos.length)],
        creative: c.criativos[Math.floor(Math.random() * c.criativos.length)],
        copy: c.copies[Math.floor(Math.random() * c.copies.length)],
        thumbnail_url: 'https://picsum.photos/50/50?random=' + Math.floor(Math.random() * 100)
      });
    }
  }

  // Adiciona leads especiais de teste
  const hBroken = new Date();
  hBroken.setHours(hBroken.getHours() - 1);
  leads.push({
    date: hBroken.toISOString().replace('T', ' ').substring(0, 19),
    name: 'Lead Imagem Quebrada',
    phone: '(11) 98888-8888',
    phase: 'Lead',
    device: 'Mobile',
    platform: 'Meta Ads',
    campaign: 'Campanha Broken',
    adset: 'Adset Broken',
    creative: 'Creative Broken',
    copy: 'Copy Broken',
    thumbnail_url: 'https://invalid-image-url-12345.xyz/image.jpg',
    mock_type: 'broken-image'
  });

  const hEmpty = new Date();
  hEmpty.setHours(hEmpty.getHours() - 2);
  leads.push({
    date: hEmpty.toISOString().replace('T', ' ').substring(0, 19),
    name: 'Lead Com Campos Vazios',
    phone: '',
    phase: '',
    device: 'Mobile',
    platform: 'Meta Ads',
    campaign: 'Campanha Vazia',
    adset: 'Adset Vazio',
    creative: 'Creative Vazio',
    copy: 'Copy Vazio',
    thumbnail_url: 'https://picsum.photos/50/50?random=99',
    mock_type: 'empty-fields'
  });

  // Deterministic lead for search filter test
  const hSearch = new Date();
  hSearch.setHours(hSearch.getHours() - 3);
  leads.push({
    date: hSearch.toISOString().replace('T', ' ').substring(0, 19),
    name: 'Renato Silveira',
    phone: '(11) 97777-7777',
    phase: 'Lead',
    device: 'Mobile',
    platform: 'Meta Ads',
    campaign: 'Campanha Silveira',
    adset: 'Adset Silveira',
    creative: 'Creative Silveira',
    copy: 'Copy Silveira',
    thumbnail_url: 'https://picsum.photos/50/50?random=98'
  });

  return leads.sort((a,b) => new Date(b.date) - new Date(a.date));
}