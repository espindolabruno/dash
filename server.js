// ==========================================================================
// BACKEND SERVER - CONNECT AGRO LEAD ANALYTICS (Node.js & Express)
// ==========================================================================
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

    // C. Ler os valores do Sheets
    const resValues = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetFile.id,
      range: 'A1:Z5000'
    });
    const rows = resValues.data.values;

    if (!rows || rows.length < 2) {
      return res.json({ leads: [], mapped: !!mapping, meta_ad_account_id: mapping ? mapping.meta_ad_account_id : null });
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
  const { days, demo, accountId } = req.query;
  const isDemo = demo === 'true';
  const limitDays = days ? parseInt(days) : 30;

  // Determinar qual conta de anúncio usar
  let actId = accountId || process.env.META_AD_ACCOUNT_ID;

  if (isDemo) {
    // Retorna logs e dados simulados para a UI
    const targetAccount = actId || 'act_77728399102';
    return res.json({
      logs: [
        { type: 'INFO', source: 'Meta API v25.0', message: `Iniciando consulta para a conta ${targetAccount} - Período: últimos ${limitDays} dias` },
        { type: 'INFO', source: 'Meta API v25.0', message: `GET https://graph.facebook.com/v25.0/${targetAccount}/insights?level=ad&fields=ad_name,spend...` },
        { type: 'SUCCESS', source: 'Meta API v25.0', message: 'Resposta recebida por Criativos (200 OK).' },
        { type: 'INFO', source: 'Meta API v25.0', message: `GET https://graph.facebook.com/v25.0/${targetAccount}/insights?level=campaign&breakdowns=publisher_platform,device_platform...` },
        { type: 'SUCCESS', source: 'Meta API v25.0', message: 'Resposta recebida por Plataforma/Dispositivo (200 OK).' }
      ],
      spend: 1450.00,
      cpl: 14.50
    });
  }

  const token = process.env.META_ACCESS_TOKEN;

  if (!token || !actId) {
    return res.status(400).json({ error: 'Chave de acesso (Token) ou Conta de Anúncios do Meta não configurados no servidor.' });
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
        { type: 'INFO', source: 'Meta API v25.0', message: `Consulta efetuada na conta ${actId}.` },
        { type: 'INFO', source: 'Meta API v25.0', message: `Retornados ${campaignRes.data.data?.length || 0} registros de campanhas e ${creativeRes.data.data?.length || 0} criativos.` },
        { type: 'SUCCESS', source: 'Meta API v25.0', message: `Sucesso no processamento de insights de anúncios v25.0.` }
      ]
    });
  } catch (err) {
    const apiError = err.response?.data?.error?.message || err.message;
    console.error('Erro na API do Meta:', apiError);
    res.status(500).json({ error: 'Meta API Error: ' + apiError });
  }
});

// 5. Rota para Listar Contas de Anúncios do Facebook/Meta
app.get('/api/meta-accounts', async (req, res) => {
  const isDemo = req.query.demo === 'true';

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

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    return res.status(400).json({ error: 'META_ACCESS_TOKEN não configurado no servidor.' });
  }

  try {
    console.log('Listando contas de anúncios do Facebook...');
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

    // Remove qualquer mapeamento anterior do mesmo cliente
    mappings = mappings.filter(m => m.drive_client_name !== drive_client_name);

    // Adiciona o novo mapeamento
    mappings.push({
      drive_client_name,
      meta_ad_account_id,
      meta_ad_account_name: meta_ad_account_name || 'Desconhecido',
      instagram_username: instagram_username || 'Não vinculado',
      created_at: new Date().toISOString()
    });

    const success = writeMappings(mappings);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Falha ao gravar arquivo de mapeamentos no servidor.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
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
