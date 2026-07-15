const { http, HttpResponse } = require('msw');

const googleHandler = [
  // Mock listing client folders
  http.get('https://www.googleapis.com/drive/v3/files', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    
    if (q.includes("mimeType = 'application/vnd.google-apps.folder'")) {
      if (q.includes('03_TRÁFEGO PAGO') || q.includes('Tráfego Pago') || q.includes('03_TRAFEGO PAGO')) {
        // Child folder search (e.g., searching for "03_TRÁFEGO PAGO")
        return HttpResponse.json({
          files: [{ id: "folder_trafego_1", name: "03_TRÁFEGO PAGO" }]
        });
      }
      // Root client search
      return HttpResponse.json({
        files: [
          { id: "client_folder_1", name: "AgroForte Sementes" },
          { id: "client_folder_2", name: "NutriCampo Fertilizantes" },
          { id: "client_folder_3", name: "Tratores Connect" }
        ]
      });
    }
    
    if (q.includes("mimeType = 'application/vnd.google-apps.spreadsheet'")) {
      // Spreadsheet list inside "03_TRÁFEGO PAGO"
      return HttpResponse.json({
        files: [{ id: "spreadsheet_leads_id", name: "Leads Planilha" }]
      });
    }

    return HttpResponse.json({ files: [] });
  }),

  // Mock fetching spreadsheet metadata (sheet tabs list)
  http.get('https://sheets.googleapis.com/v4/spreadsheets/:spreadsheetId', ({ params }) => {
    return HttpResponse.json({
      spreadsheetId: params.spreadsheetId,
      sheets: [
        { properties: { title: "leads_campanha_whatsapp" } }
      ]
    });
  }),

  // Mock reading cells from the spreadsheet
  http.get('https://sheets.googleapis.com/v4/spreadsheets/:spreadsheetId/values/:range', () => {
    return HttpResponse.json({
      range: "'leads_campanha_whatsapp'!A1:Z5000",
      majorDimension: "ROWS",
      values: [
        ["Data/Hora", "Nome do Lead", "WhatsApp", "Dispositivo", "Plataforma de Conversão", "Campanha", "Status", "Valor Estimado", "Observações"],
        ["2026-07-01 10:00:00", "Carlos Mendes", "(19) 99823-1122", "Mobile", "Meta Ads", "Lançamento Soja 2026", "Lead", "15000", "Interessado em defensivos"],
        ["2026-07-02 15:45:00", "Felipe Agro", "(41) 98765-4321", "Desktop", "Google Ads", "Oferta Sementes Milho", "Cliente em potencial", "22000", "Solicitou tabela de preços"]
      ]
    });
  }),

  // Mock Google OAuth2 token refresh
  http.post('https://oauth2.googleapis.com/token', () => {
    return HttpResponse.json({
      access_token: "mock_google_access_token_123",
      expires_in: 3599,
      refresh_token: "dummy-refresh-token",
      scope: "https://www.googleapis.com/auth/drive.readonly",
      token_type: "Bearer"
    });
  })
];

module.exports = { googleHandler };
