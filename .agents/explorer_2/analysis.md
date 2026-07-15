# Connect Agro Advanced Analytics - API and Mock Strategy Analysis

This document provides a detailed investigation of the backend API endpoints in `server.js` and the frontend calls in `js/app.js` and `agro.html`, followed by a comprehensive offline mock design strategy for Anthropic Claude, Google Drive/Sheets, and Meta Graph/Pixel/MCP APIs.

---

## 1. Analysis of Backend API Endpoints & Frontend Calls

### 1.1. Existing Backend Endpoints (`server.js`)
* **Session Management:**
  * `POST /api/login`: Validates user credentials against `DASH_USER` and `DASH_PASSWORD` env vars. Returns a session token.
* **Google Integration (OAuth2 & Sheets):**
  * `GET /api/google/auth`: Generates and redirects to the Google OAuth2 authorization URL.
  * `GET /api/google/callback`: Handles Google auth redirect, exchanges code for refresh token, stores it in `google_tokens.json`, and reinits client.
  * `GET /api/google/status`: Returns status of Google API initialization (boolean `connected`).
  * `POST /api/google/disconnect`: Deletes `google_tokens.json` and resets google API objects.
  * `GET /api/clients`: Retrieves subfolders from Process Drive folder `GOOGLE_DRIVE_FOLDER_ID` (or returns static list in Demo Mode).
  * `GET /api/leads`: Retrieves and parses CRM lead spreadsheets under a client folder. Columns are normalized using alias arrays (`COLUMN_MAPPINGS`). Returns normalized lead records.
* **Meta Ads Integration (OAuth2 & Marketing API v25.0):**
  * `GET /api/meta/auth`: Redirects user to Meta OAuth URL.
  * `GET /api/meta/callback`: Exchanges Meta code for short-lived access token, upgrades it to long-lived, and writes to `temp_meta_tokens.json`.
  * `GET /api/meta-accounts`: Fetches ad accounts associated with the Meta user. In Demo Mode, returns a list of mock ad accounts.
  * `GET /api/meta-insights`: Proxies requests to the Meta Marketing API insights endpoint. Fetches campaign, adset, creative (ad), and platform performance in parallel. In Demo Mode, generates simulated metrics scaled by date range.
  * `POST /api/mappings`: Saves a mapping between a Google Drive client and a Meta Ad Account ID into `mappings.json`.

### 1.2. Planned Endpoints (`PROJECT.md`)
* `GET /api/pixel-events`: Fetches event statistics from the Meta Pixel (`https://graph.facebook.com/v25.0/<pixel_id>/stats`).
* `POST /api/ai/insights`: Initializes the Meta Ads MCP server subprocess, coordinates the tool loop with Anthropic's Messages API, and returns synthesized marketing suggestions.

### 1.3. Frontend API Calls (`js/app.js` & `agro.html`)
The frontend calls these APIs using the browser's native `fetch` API. Key details include:
* **Demo Mode Toggle:** The frontend passes a `demo=true` query parameter to `/api/clients`, `/api/leads`, `/api/meta-insights`, `/api/meta-accounts`, and `/api/pixel-events` when the user enables "Modo Demo".
* **State Sync:** The client header, client selection, and date range filters directly control the parameters passed to `/api/leads` and `/api/meta-insights`.
* **OAuth Redirection:** Triggering settings connections updates `window.location.href` to direct the browser to the backend OAuth initialization endpoints.

---

## 2. Mocking Strategy 1: Anthropic Claude API (`/api/ai/insights`)

The backend `/api/ai/insights` endpoint acts as an MCP client. It initiates a multi-step tool-use loops with Claude.
1. Backend sends prompt + leads summary + MCP tools to Anthropic Messages API.
2. Claude returns `stop_reason: "tool_use"` requesting campaign performance.
3. Backend runs the tool via MCP stdio subprocess and returns results to Claude.
4. Claude returns the final text analysis.

To mock this 100% offline, we can use two different approaches:

### Approach A: Network Interception via MSW (Mock Service Worker) for Node
We intercept the outbound HTTPS requests from `server.js` to `https://api.anthropic.com/v1/messages`. MSW intercepts these requests at the network layer and returns predefined JSON mock responses.

* **MSW Handler Implementation (`tests/mocks/anthropicHandler.js`):**
```javascript
import { http, HttpResponse } from 'msw';

export const anthropicHandler = http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
  const body = await request.json();
  const messages = body.messages || [];

  // Determine if it is the first call (asking for tools) or the second call (providing tool results)
  const hasToolResult = messages.some(msg => 
    Array.isArray(msg.content) && msg.content.some(c => c.type === 'tool_result')
  );

  if (!hasToolResult) {
    // 1. Return a tool_use request to trigger backend tool execution
    return HttpResponse.json({
      id: "msg_mock_tool_use_123",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text": "Vou consultar o desempenho das campanhas de anúncios para analisar o CPL e o ROAS."
        },
        {
          type: "tool_use",
          id": "toolu_mock_campaign_performance",
          name: "get_campaign_performance",
          input: {
            account_id: "act_77728399102",
            time_range: { since: "2026-06-01", until: "2026-06-30" }
          }
        }
      ],
      stop_reason: "tool_use",
      model: "claude-3-5-sonnet-20241022",
      usage: { input_tokens: 1500, output_tokens: 120 }
    });
  } else {
    // 2. Return the final synthesized recommendation text
    return HttpResponse.json({
      id: "msg_mock_final_analysis_456",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "### Relatório de Diagnóstico de IA (Mock)\n\n* **CPL Mismatch:** A campanha 'Lançamento Soja 2026' registrou CPL de R$ 42,50 no Meta, mas apenas 5 leads reais no CRM.\n* **Recomendação:** Pausar 'Lançamento Soja 2026' e focar em 'Oferta Sementes Milho'."
        }
      ],
      stop_reason: "end_turn",
      model: "claude-3-5-sonnet-20241022",
      usage: { input_tokens: 2200, output_tokens: 300 }
    });
  }
});
```

### Approach B: Server-Side Mocking in the Express Route
If `demo === true` or if `process.env.NODE_ENV === 'test'` is active, the Express route inside `server.js` directly returns a mock response, avoiding Claude SDK initialization and MCP subprocess spawns.
```javascript
app.post('/api/ai/insights', async (req, res) => {
  const { clientName, dateRange, demo } = req.body;
  
  if (demo === true || process.env.NODE_ENV === 'test') {
    return res.json({
      analysis: `### Análise Connect Agro (Simulado)
      
- **Melhor Desempenho:** Campanha "Lançamento Soja 2026" com ROAS de 4.5x.
- **Canal Crítico:** Instagram Stories com CPL elevado a R$ 38,20.
- **Ação:** Pausar o criativo "Banner_Saco_Semente" e focar no depoimento em vídeo.`
    });
  }
  // ... real MCP + Claude loop ...
});
```

---

## 3. Mocking Strategy 2: Google Drive & Sheets API

The Google APIs are called inside `/api/clients` and `/api/leads`.

### Approach A: Network Interception via MSW for Node
Google APIs use standard REST endpoints under `googleapis`. We can mock these endpoints to return folders and cell contents.
* **Google API Routes to Intercept:**
  * Folder List: `GET https://www.googleapis.com/drive/v3/files`
  * Sheet Metadata: `GET https://sheets.googleapis.com/v4/spreadsheets/:spreadsheetId`
  * Sheet Cell Values: `GET https://sheets.googleapis.com/v4/spreadsheets/:spreadsheetId/values/:range`

* **MSW Handler Implementation (`tests/mocks/googleHandler.js`):**
```javascript
import { http, HttpResponse } from 'msw';

export const googleHandler = [
  // Mock listing client folders
  http.get('https://www.googleapis.com/drive/v3/files', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    
    if (q.includes('mimeType = \'application/vnd.google-apps.folder\'')) {
      if (q.includes('parents')) {
        // Child folder search (e.g., searching for "03_TRÁFEGO PAGO")
        return HttpResponse.json({
          files: [{ id: "folder_trafego_1", name: "03_TRÁFEGO PAGO" }]
        });
      }
      // Root client search
      return HttpResponse.json({
        files: [
          { id: "client_folder_1", name: "AgroForte Sementes" },
          { id: "client_folder_2", name: "NutriCampo Fertilizantes" }
        ]
      });
    }
    
    if (q.includes('mimeType = \'application/vnd.google-apps.spreadsheet\'')) {
      // Spreadsheet list inside "03_TRÁFEGO PAGO"
      return HttpResponse.json({
        files: [{ id: "spreadsheet_leads_id", name: "Leads Planilha" }]
      });
    }

    return HttpResponse.json({ files: [] });
  }),

  // Mock fetching spreadsheet metadata (sheet tabs list)
  http.get('https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_leads_id', () => {
    return HttpResponse.json({
      spreadsheetId: "spreadsheet_leads_id",
      sheets: [
        { properties: { title: "leads_campanha_whatsapp" } }
      ]
    });
  }),

  // Mock reading cells from the spreadsheet
  http.get('https://sheets.googleapis.com/v4/spreadsheets/spreadsheet_leads_id/values/*', () => {
    return HttpResponse.json({
      range: "'leads_campanha_whatsapp'!A1:Z5000",
      majorDimension: "ROWS",
      values: [
        ["Data/Hora", "Nome do Lead", "WhatsApp", "Dispositivo", "Plataforma de Conversão", "Campanha", "Status", "Valor Estimado", "Observações"],
        ["2026-07-01 10:00:00", "Carlos Mendes", "(19) 99823-1122", "Mobile", "Meta Ads", "Lançamento Soja 2026", "Lead", "15000", "Interessado em defensivos"],
        ["2026-07-02 15:45:00", "Felipe Agro", "(41) 98765-4321", "Desktop", "Google Ads", "Oferta Sementes Milho", "Cliente em potencial", "22000", "Solicitou tabela de preços"]
      ]
    });
  })
];
```

### Approach B: Built-in Demo Mode Fallback
By using the frontend query parameters (`demo=true`), the backend completely bypasses the Google API and calls `generateMockLeads()`. In Playwright E2E tests focused on UI layout, running tests with `demo=true` ensures offline capability out-of-the-box.

---

## 4. Mocking Strategy 3: Meta Graph / Pixel API & Meta Ads MCP Server

Mocking Meta involves two components: the HTTP-based Graph API (insights, accounts, Pixel) and the stdio-based MCP server subprocess.

### 4.1. Meta Graph API & Pixel API Mocking (MSW Node)
The backend calls Meta Graph API endpoints. We intercept them at the network layer.
* **MSW Handler Implementation (`tests/mocks/metaHandler.js`):**
```javascript
import { http, HttpResponse } from 'msw';

export const metaHandler = [
  // Mock listing ad accounts
  http.get('https://graph.facebook.com/v25.0/me/adaccounts', () => {
    return HttpResponse.json({
      data: [
        { id: "act_1034348999771083", name: "VM Equipamentos", account_id: "1034348999771083" },
        { id: "act_1052303464636478", name: "Ceres Equipamentos Agrícolas", account_id: "1052303464636478" }
      ]
    });
  }),

  // Mock fetching insights (campaigns, adsets, ads, platforms)
  http.get('https://graph.facebook.com/v25.0/*/insights', ({ request }) => {
    const url = new URL(request.url);
    const level = url.searchParams.get('level') || 'campaign';
    const breakdowns = url.searchParams.get('breakdowns');

    if (breakdowns === 'publisher_platform') {
      return HttpResponse.json({
        data: [
          { campaign_id: "100100", campaign_name: "Lançamento Soja 2026", publisher_platform: "instagram", spend: "800.50", clicks: "700", impressions: "35000", reach: "30000", actions: [{ action_type: "onsite_conversion.lead", value: "30" }] },
          { campaign_id: "100100", campaign_name: "Lançamento Soja 2026", publisher_platform: "facebook", spend: "400.00", clicks: "500", impressions: "15000", reach: "10000", actions: [{ action_type: "onsite_conversion.lead", value: "15" }] }
        ]
      });
    }

    if (level === 'campaign') {
      return HttpResponse.json({
        data: [
          { campaign_id: "100100", campaign_name: "Lançamento Soja 2026", spend: "1200.50", clicks: "1200", impressions: "50000", reach: "40000", actions: [{ action_type: "onsite_conversion.messaging_conversation_started_7d", value: "150" }, { action_type: "onsite_conversion.lead", value: "45" }, { action_type: "omni_purchase", value: "10" }] }
        ]
      });
    }

    // Default empty / low values for other levels
    return HttpResponse.json({ data: [] });
  }),

  // Mock fetching Pixel Event Stats (GET /v25.0/<pixel_id>/stats)
  http.get('https://graph.facebook.com/v25.0/*/stats', () => {
    return HttpResponse.json({
      data: [
        { event: "PageView", value: "1200" },
        { event: "Lead", value: "85" },
        { event: "Purchase", value: "15" }
      ]
    });
  }),

  // Mock OAuth token exchange
  http.get('https://graph.facebook.com/v25.0/oauth/access_token', () => {
    return HttpResponse.json({
      access_token: "mock_fb_access_token_777"
    });
  })
];
```

### 4.2. Meta Ads MCP Server Mocking (Stdio Subprocess)
**⚠️ Critical Technical Detail:** The Meta Ads MCP server is executed as a child process via `child_process.spawn`. Because child processes run in separate V8 instances, Node-side MSW or Nock running inside the main `server.js` process **will not intercept** the child process's outgoing HTTP requests.

To resolve this, we must mock the MCP server at the **process level** using a custom mock script.

1. **Create the Mock MCP Server Script (`mcp-servers/mock-meta-ads-mcp.js`):**
This script listens on standard I/O for JSON-RPC messages and returns canned payloads without making network requests.
```javascript
#!/usr/bin/env node
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    const response = { jsonrpc: "2.0", id: request.id };

    if (request.method === 'initialize') {
      response.result = {
        protocolVersion: "2024-11-05",
        capabilities: {},
        serverInfo: { name: "MockMetaAdsServer", version: "1.0.0" }
      };
    } else if (request.method === 'tools/list') {
      response.result = {
        tools: [
          {
            name: "get_campaign_performance",
            description: "Get Meta Ads campaign performance metrics",
            inputSchema: {
              type: "object",
              properties: {
                account_id: { type: "string" },
                time_range: { type: "object" }
              },
              required: ["account_id"]
            }
          }
        ]
      };
    } else if (request.method === 'tools/call') {
      const toolName = request.params.name;
      if (toolName === 'get_campaign_performance') {
        response.result = {
          content: [
            {
              type: "text",
              text: JSON.stringify([
                {
                  campaign_id: "100100",
                  campaign_name: "Lançamento Soja 2026",
                  spend: 1200.50,
                  impressions: 50000,
                  clicks: 1200,
                  reach: 40000,
                  conversas: 150,
                  leads: 45,
                  compras: 10
                }
              ])
            }
          ]
        };
      } else {
        response.result = { content: [{ type: "text", text: "[]" }] };
      }
    } else {
      response.error = { code: -32601, message: "Method not found" };
    }

    process.stdout.write(JSON.stringify(response) + "\n");
  } catch (e) {
    console.error("Error in Mock MCP server:", e);
  }
});
```

2. **Dynamically Target the Subprocess in `server.js`:**
Modify the backend initialization code in `server.js` to execute the mock script if a test environment variable is detected:
```javascript
const mcpScript = process.env.USE_MOCK_MCP === 'true'
  ? "mcp-servers/mock-meta-ads-mcp.js"
  : "mcp-servers/meta-ads-mcp.js";

const transport = new StdioClientTransport({
  command: "node",
  args: [path.join(__dirname, mcpScript)]
});
```

---

## 5. Offline Playwright E2E Setup

To run Playwright tests 100% offline, configure Playwright to spin up the mocked backend server, injecting the required environment variables:

1. **Playwright Config (`playwright.config.js`):**
```javascript
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-failure',
  },
  webServer: {
    command: 'cross-env NODE_ENV=test USE_MOCK_MCP=true node server.js',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
```

2. **Backend Server MSW Bootstrap (`server.js` modification):**
Bootstrap MSW in `server.js` if `process.env.NODE_ENV === 'test'` is active:
```javascript
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
```

This configuration ensures that when `npx playwright test` runs:
* The web server starts on port 3000 with mock-enabled node flags.
* All outbound HTTP traffic to Anthropic, Google, and Meta APIs is intercepted in-process by MSW.
* The MCP connection targets the stdio mock server subprocess.
* Playwright E2E tests run 100% offline, deterministic, and with zero external API costs.
