// Serviço de Integração com Google Drive e Google Sheets API v4
const DriveService = {
  // ID da pasta "Clientes" no Google Drive (Modifique aqui ou insira nas configurações da UI)
  ROOT_FOLDER_ID: '', // ID da pasta raiz 'Clientes'

  // Mapeamento inteligente de cabeçalhos de planilhas para nosso formato padronizado
  columnMappings: {
    date: ['data', 'horário', 'data e horário', 'data/hora', 'timestamp', 'data/horário', 'data_hora', 'created_at', 'date'],
    name: ['nome', 'nome completo', 'leads', 'lead', 'client', 'cliente', 'name', 'full_name'],
    phone: ['telefone', 'celular', 'whatsapp', 'whats', 'fone', 'phone', 'telephone', 'contato'],
    device: ['dispositivo', 'dispositivo de conversão', 'device', 'mobile/desktop', 'aparelho'],
    platform: ['plataforma', 'plataforma de conversão', 'platform', 'canal', 'rede', 'origem', 'midia', 'utm_source'],
    campaign: ['campanha', 'campaign', 'utm_campaign', 'nome da campanha'],
    adset: ['conjunto', 'conjunto de anúncios', 'adset', 'ad set', 'utm_medium', 'grupo de anúncios'],
    creative: ['criativo', 'creative', 'utm_content', 'anúncio', 'ad'],
    copy: ['copy', 'texto', 'utm_term', 'redação', 'copywriting']
  },

  // Faz requisições genéricas para a API do Google REST
  request: async function(url) {
    const token = Auth.accessToken;
    if (!token) throw new Error('Usuário não autenticado.');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Erro na API do Google: ${response.statusText}`);
    }

    return response.json();
  },

  // Lista todos os clientes (subpastas na pasta 'Clientes')
  fetchClients: async function(rootId = this.ROOT_FOLDER_ID) {
    if (!rootId) {
      // Se não houver rootId configurado, busca pelo nome 'Clientes'
      const searchRoot = await this.findFolderByName('Clientes');
      if (!searchRoot) {
        throw new Error('Pasta raiz "Clientes" não encontrada e nenhum ID foi fornecido.');
      }
      rootId = searchRoot.id;
    }

    const query = `'${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=100`;
    
    const data = await this.request(url);
    return data.files || [];
  },

  // Busca uma pasta pelo nome na raiz do Drive do usuário
  findFolderByName: async function(name) {
    const query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=1`;
    const data = await this.request(url);
    return data.files?.[0] || null;
  },

  // Busca e processa os leads de um determinado cliente
  fetchClientLeads: async function(clientId) {
    // 1. Achar a pasta 'Tráfego Pago' dentro da pasta do cliente
    const queryTrafego = `'${clientId}' in parents and name = 'Tráfego Pago' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const urlTrafego = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryTrafego)}&fields=files(id,name)`;
    const dataTrafego = await this.request(urlTrafego);
    const trafegoFolder = dataTrafego.files?.[0];

    if (!trafegoFolder) {
      console.warn(`Pasta "Tráfego Pago" não encontrada para o cliente ID ${clientId}.`);
      return [];
    }

    // 2. Achar as planilhas (Google Sheets) dentro de 'Tráfego Pago'
    const querySheets = `'${trafegoFolder.id}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
    const urlSheets = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(querySheets)}&fields=files(id,name)&pageSize=5`;
    const dataSheets = await this.request(urlSheets);
    const sheets = dataSheets.files || [];

    if (sheets.length === 0) {
      console.warn(`Nenhuma planilha encontrada na pasta "Tráfego Pago" do cliente.`);
      return [];
    }

    // Lemos a primeira planilha encontrada (podemos estender depois se houver mais de uma)
    const targetSpreadsheetId = sheets[0].id;
    return this.fetchLeadsFromSpreadsheet(targetSpreadsheetId);
  },

  // Consome a planilha via Google Sheets API v4 e normaliza os dados
  fetchLeadsFromSpreadsheet: async function(spreadsheetId) {
    // Lê a primeira aba inteira (A1:Z5000)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z5000`;
    const data = await this.request(url);
    const rows = data.values;

    if (!rows || rows.length < 2) {
      return []; // Vazio ou apenas cabeçalho
    }

    const headers = rows[0].map(h => h.toString().toLowerCase().trim());
    const leadRows = rows.slice(1);
    
    // Mapear qual índice de coluna corresponde a qual campo
    const mappingIndexes = {};
    for (const [key, aliases] of Object.entries(this.columnMappings)) {
      mappingIndexes[key] = headers.findIndex(header => 
        aliases.includes(header) || aliases.some(alias => header.includes(alias))
      );
    }

    // Converter cada linha da planilha em um objeto lead
    return leadRows.map(row => {
      const lead = {};
      
      for (const [field, index] of Object.entries(mappingIndexes)) {
        if (index !== -1 && row[index] !== undefined) {
          lead[field] = row[index].toString().trim();
        } else {
          lead[field] = ''; // Preenche com vazio se não existir a coluna
        }
      }

      // Fallback de higienização de dados
      if (lead.date) {
        lead.date = this.formatDateString(lead.date);
      }
      
      // Fallback de plataforma para "Desconhecido" caso falte na planilha
      if (!lead.platform) {
        lead.platform = 'Direto / Desconhecido';
      }

      // Dispositivo padrão
      if (!lead.device) {
        lead.device = 'Não Especificado';
      }

      return lead;
    }).filter(lead => lead.name || lead.phone); // Exige pelo menos nome ou telefone para considerar lead válido
  },

  // Normalização de datas e horários para formato AAAA-MM-DD HH:MM:SS
  formatDateString: function(dateStr) {
    try {
      // Caso seja apenas um número serial do Excel/Sheets
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

      // Trata formatos comuns PT-BR "DD/MM/AAAA HH:MM:SS" ou "DD/MM/AAAA"
      if (dateStr.includes('/')) {
        const parts = dateStr.split(' ');
        const dateParts = parts[0].split('/');
        const day = dateParts[0].padStart(2, '0');
        const month = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        const timePart = parts[1] || '00:00:00';
        
        return `${year}-${month}-${day} ${timePart}`;
      }

      // Caso já seja formato ISO/UTC
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().replace('T', ' ').substring(0, 19);
      }
    } catch (e) {
      console.warn("Erro ao parsear data:", dateStr, e);
    }
    
    return dateStr; // Retorna original caso falhe o parse
  }
};
