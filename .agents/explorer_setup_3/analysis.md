# AI Integration and System Flow Analysis: Meta Ads MCP & Claude

This document presents a comprehensive system design and analysis for integrating the external Meta Ads Model Context Protocol (MCP) server with Claude, creating an AI-driven insights interface on the Connect Agro dashboard, and establishing a robust testing infrastructure.

---

## Executive Summary
This proposal outlines a double-layered integration flow for the **Meta Ads MCP Server** and **Claude** within the Connect Agro dashboard. By employing the Model Context Protocol (MCP), Claude can dynamically query live Meta Ads performance metrics via tool calling and combine them with Google Sheets lead data. We propose an **AI Insights Dashboard Panel** aligned with the existing dark-theme glassmorphism UI, a secure backend-driven communication mechanism, and a testing strategy utilizing **Jest** (Unit/Integration) and **Playwright** (E2E) with **Mock Service Worker (MSW)** to ensure deterministic, offline-capable test execution.

---

## 1. Meta Ads MCP Server Integration with Claude (R4)

### 1.1 The Model Context Protocol (MCP) Concept
The Model Context Protocol (MCP) is an open-source standard created by Anthropic that allows AI models (like Claude) to securely connect to external data sources and tools. Rather than building static API wrappers, the model acts as the runtime engine that dynamically invokes tools exposed by an MCP Server based on the conversation context.

### 1.2 Integration Architectures
We propose two complementary integration paths:
1. **Primary: Dashboard-Integrated AI (Web-App Workflow)** - The end-user triggers AI analysis directly from the dashboard UI. The backend acts as the MCP client.
2. **Secondary: Developer/Ad-hoc Agent Workflow (Local/CLI)** - A developer uses Claude Desktop to locally run queries across Meta Ads and Google Sheets using the MCP servers directly.

---

### 1.3 Step-by-Step Dashboard Integration Flow (Backend-Proxy)

The backend (`server.js`) will act as the **MCP Client**, connecting to the external **Meta Ads MCP Server** via standard input/output (stdio) or Server-Sent Events (SSE). It coordinates requests between the React Frontend, the Anthropic Claude API, and the MCP Server.

```
+------------------+         +---------------+         +-----------------+         +---------------------+
| React Frontend   | -------> | server.js     | -------> | Claude API      |         | Meta Ads MCP Server |
| (Client Browser) |          | (MCP Client)  |          | (Anthropic SDK) |         | (JSON-RPC Process)  |
+------------------+         +---------------+         +-----------------+         +---------------------+
         |                           |                            |                           |
         | 1. POST /api/ai/insights  |                            |                           |
         |-------------------------->|                            |                           |
         |                           | 2. Connects to MCP &       |                           |
         |                           |    lists tool schemas      |                           |
         |                           |----------------------------|                           |
         |                           |                            |                           |
         |                           | 3. Call Messages API       |                           |
         |                           |    (Pass prompt + tools)   |                           |
         |                           |--------------------------->|                           |
         |                           |                            |                           |
         |                           | 4. Returns "tool_use"      |                           |
         |                           |    (needs campaign data)   |                           |
         |                           |<---------------------------|                           |
         |                           |                                                        |
         |                           | 5. Calls Tool: get_campaign_insights                   |
         |                           |------------------------------------------------------->|
         |                           |                                                        |
         |                           | 6. Returns raw JSON data (Spend, Clicks, CTR, etc.)    |
         |                           |<-------------------------------------------------------|
         |                           |                                                        |
         |                           | 7. Sends Tool Result to Claude                         |
         |                           |--------------------------->|                           |
         |                           |                            |                           |
         |                           | 8. Synthesizes Analysis    |                           |
         |                           |    (Final text/JSON)       |                           |
         |                           |<---------------------------|                           |
         |                           |                            |                           |
         | 9. Returns structured data|                            |                           |
         |<--------------------------|                            |                           |
         v                           v                            v                           v
```

#### Detailed Execution Steps:
1. **Frontend Request:** The user selects a client (e.g., "AgroForte Sementes"), selects a date range, and clicks "Gerar Insights com IA". The frontend sends a POST request to `/api/ai/insights` containing the `clientName`, `clientId` (Google Drive folder ID), and the date range.
2. **Retrieve Credentials & Sheets:** The backend reads the client mapping from `mappings.json` to get the `meta_ad_account_id` and Google Drive credentials. It retrieves the latest leads list from Google Sheets (standardized via the backend's lead parsing) and creates a lightweight summary (total leads, status/funnel breakdown, platforms).
3. **MCP Tool Discovery:** The backend initializes the MCP client, establishes a connection to the Meta Ads MCP Server, and fetches the schemas of the available tools:
   - `get_campaign_performance(account_id, time_range)`
   - `get_adset_performance(account_id, time_range)`
   - `get_ad_performance(account_id, time_range)`
4. **Initial Claude Call:** The backend sends a request to the Anthropic Messages API (`claude-3-5-sonnet`) with:
   - **System Prompt:** Sets role as a marketing and sales analyst specialized in agronegócio.
   - **User Message:** Requests a diagnostic of the client's current performance, providing the Google Sheets lead data summary.
   - **Tools array:** The list of JSON schemas retrieved from the MCP Server.
5. **Claude Tool Call Request:** Claude realizes it needs Meta Ads financial and click data to calculate CAC, ROAS, and lead source mismatch. It returns a response with `stop_reason: "tool_use"`, requesting the execution of `get_campaign_performance` with the client's mapped `meta_ad_account_id`.
6. **Tool Execution:** The backend receives the `tool_use` request. It executes the tool on the Meta Ads MCP Server via the MCP SDK, injecting the secure client OAuth token (`meta_access_token`) retrieved from `mappings.json` (so the token is never exposed to Claude or the frontend).
7. **Meta API Fetch:** The MCP Server translates the tool execution into a call to the Facebook Graph API (`https://graph.facebook.com/v25.0/`), parses the results, and returns the campaign performance metrics to the backend.
8. **Claude Final Synthesis:** The backend sends the tool results back to Claude. Claude combines the Google Sheets leads data with the Meta Ads cost data, identifies anomalies (e.g., campaigns with high spend but no sales in the CRM, platform mismatches), and generates a structured response.
9. **Frontend Update:** The backend parses Claude's response and sends it to the frontend, which displays the insights in dedicated UI components.

---

### 1.4 Mock Code Implementation Sketch (Backend Middleware)

To implement this flow, the following Node.js code would be integrated into `server.js`:

```javascript
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const { Anthropic } = require("@anthropic-ai/sdk");

// Rota de Insights com IA
app.post('/api/ai/insights', async (req, res) => {
  const { clientName, dateRange } = req.body;
  
  // 1. Obter mapeamentos do cliente
  const mappings = readMappings();
  const mapping = mappings.find(m => m.drive_client_name === clientName);
  if (!mapping || !mapping.meta_ad_account_id) {
    return res.status(400).json({ error: 'Cliente não possui conta do Meta vinculada.' });
  }

  try {
    // 2. Conectar com o MCP Server (via stdio subprocess)
    const transport = new StdioClientTransport({
      command: "node",
      args: [path.join(__dirname, "mcp-servers", "meta-ads-mcp.js")]
    });
    
    const mcpClient = new Client({
      name: "ConnectAgroClient",
      version: "1.0.0"
    }, { capabilities: {} });
    
    await mcpClient.connect(transport);

    // 3. Obter ferramentas disponíveis no MCP
    const mcpToolsResponse = await mcpClient.listTools();
    const tools = mcpToolsResponse.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema
    }));

    // 4. Preparar resumo dos dados do Google Sheets
    const leadsData = await getLeadsSummaryForClient(clientName); // Função auxiliar existente
    
    // 5. Instanciar SDK do Anthropic
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    let messages = [
      {
        role: "user",
        content: `Analise os resultados do cliente "${clientName}" no período de ${dateRange.since} a ${dateRange.until}.
        Aqui está o resumo dos leads consolidados na planilha do Google Drive:
        ${JSON.stringify(leadsData)}
        Por favor, utilize as ferramentas disponíveis para obter os dados financeiros e de cliques correspondentes nas campanhas do Meta Ads para calcular CPL, ROAS e funil de conversão.`
      }
    ];

    // 6. Loop de Chamada da API Claude com Suporte a Tool Use
    let response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3000,
      system: "Você é um analista especialista em tráfego pago e inteligência de vendas para o setor do agronegócio...",
      messages: messages,
      tools: tools
    });

    // Se Claude solicitar o uso de ferramenta
    while (response.stop_reason === "tool_use") {
      const toolCall = response.content.find(c => c.type === "tool_use");
      if (!toolCall) break;

      // Executa a ferramenta no MCP Server
      const toolResult = await mcpClient.callTool({
        name: toolCall.name,
        arguments: {
          ...toolCall.input,
          accessToken: mapping.meta_access_token || process.env.META_ACCESS_TOKEN
        }
      });

      // Adiciona o histórico de mensagens
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolCall.id,
            content: JSON.stringify(toolResult.content)
          }
        ]
      });

      // Chama o Claude novamente com o resultado da ferramenta
      response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 3000,
        system: "Você é um analista especialista...",
        messages: messages,
        tools: tools
      });
    }

    // Desconecta o MCP
    await transport.close();

    // Retorna a análise final (que pode ser formatada em JSON estruturado ou Markdown)
    res.json({ analysis: response.content[0].text });

  } catch (err) {
    console.error("Erro na integração do Claude com o MCP:", err);
    res.status(500).json({ error: "Erro na análise de IA: " + err.message });
  }
});
```

---

## 2. Layout, Design & Communication Mechanism

### 2.1 Proposed UI/UX Layout for AI Insights Section
The AI Insights section will be structured as a dedicated workspace panel integrated directly within `agro.html`. It is designed to match the current premium dark mode dashboard style with glassmorphic cards and glowing elements.

```
+---------------------------------------------------------------------------------------+
|  ✨ INSIGHTS DE INTELIGÊNCIA ARTIFICIAL (CLAUDE)                           [ Config ] |
+---------------------------------------------------------------------------------------+
|  [ Seletor de Foco: (o) Geral  ( ) Custo/CPL  ( ) Qualidade de Leads  ( ) Criativos ] |
|  [ Botão: GERAR DIAGNÓSTICO COM IA (Brilho Cyan/Purple)                            ] |
|                                                                                       |
|  Status: [ Conectando MCP... ] -> [ Consultando Meta Ads... ] -> [ Claude Analisando ] |
+---------------------------------------------------------------------------------------+
|  📊 SUMÁRIO EXECUTIVO (Geral)                                                        |
|  "No período selecionado, o CPL do cliente VM Equipamentos subiu 14% devido a uma     |
|   queda na taxa de cliques (CTR) no Instagram Stories, embora a conversão final no    |
|   WhatsApp tenha se mantido estável..."                                               |
+---------------------------------------------------------------------------------------+
|  🚨 PLANO DE AÇÃO RECOMENDADO                                                         |
|                                                                                       |
|  [ CRÍTICO ] Pausar campanha "VM_Bruta_Conversao_V1"                                  |
|   - Oportunidade: CPL atual R$ 42,50 (limite estabelecido: R$ 30,00).                 |
|   - Ação sugerida: Pausar e realocar orçamento para "VM_Tratores_Leads".              |
|                                                                                       |
|  [ ALERTA ] Incompatibilidade de UTM na campanha "NutriSementes_2026"                 |
|   - Desvio: 42 leads registrados no Google Drive sem UTM correspondente no Meta.       |
|   - Ação sugerida: Corrigir links de anúncios e parâmetros de UTM.                    |
|                                                                                       |
|  [ OPORTUNIDADE ] Escalar orçamento em 20% no Facebook Feed para a campanha X          |
|   - Desempenho: ROAS de 4.2x e conversões em alta nas sextas-feiras à tarde.          |
+---------------------------------------------------------------------------------------+
|  💬 CHAT COM O ASSISTENTE (Perguntas customizadas)                                    |
|  +---------------------------------------------------------------------------------+  |
|  | Como posso reduzir o CPL da campanha VM Equipamentos sem perder qualidade?     |  |
|  +---------------------------------------------------------------------------------+  |
|  [ Enviar Pergunta ]                                                                  |
+---------------------------------------------------------------------------------------+
```

#### Visual Components Details:
1. **Control Header (`.glass-panel`):**
   - A modern toggle bar to select the analysis focus (Strategic, Cost, Lead Quality, Creative/Copy Audit).
   - A primary action button with standard variables: `background: var(--primary-gradient)` and a subtle pulsing glow using `box-shadow: 0 0 15px var(--primary-glow)`.
   - **Progress Tracker:** A step-by-step indicator that updates dynamically via Server-Sent Events (SSE) or WebSockets during long-running tool executions.
2. **Executive Summary Card (`background: var(--panel-bg)`):**
   - Typographic hierarchy: Title styled with `--font-main` (Outfit) and body text in `--text-main` with highlighted metrics in cyan (`--primary`).
3. **Recommendation Board (Severity Columns):**
   - Cards color-coded using established feedback colors:
     - **Critical:** Border-left 4px solid `var(--error)` (#f43f5e) with a light red tint background.
     - **Warning:** Border-left 4px solid `var(--warning)` (#eab308) with a light yellow tint background.
     - **Opportunity:** Border-left 4px solid `var(--success)` (#10b981) with a light green tint background.
4. **Claude Conversational Panel:**
   - A conversational console at the bottom of the section. Includes an input text field styled with a translucent background (`rgba(255,255,255,0.03)`) and transition animations (`var(--transition-smooth)`).
   - Allows users to ask questions, referencing dashboard history and past campaign data.

---

### 2.2 System Flow and Communication Protocol

The communication between the components occurs in a request-response loop where the backend plays the central orchestrator role:

```
[Browser Client]           [server.js (Express)]          [Claude (Anthropic API)]       [Meta MCP Server]
       |                              |                              |                            |
       |-- 1. POST /api/ai/insights ->|                              |                            |
       |   (client, dateRange)        |-- 2. Init MCP client ------->|                            |
       |                              |   & list tool schemas        |                            |
       |                              |<-- 3. Return tool schemas ---|                            |
       |                              |                              |                            |
       |                              |-- 4. Send initial prompt --->|                            |
       |                              |   (Leads data + tools)       |                            |
       |                              |                              |                            |
       |                              |<-- 5. Request tool call -----|                            |
       |                              |   (get_campaign_performance) |                            |
       |                              |                              |                            |
       |                              |-- 6. Execute MCP tool ----------------------------------->|
       |                              |   (pass accounts, dates)                                  |
       |                              |                                                           |
       |                              |<-- 7. Returns raw campaign data JSON ---------------------|
       |                              |                              |                            |
       |                              |-- 8. Forward tool output --->|                            |
       |                              |   to Claude model            |                            |
       |                              |                              |                            |
       |                              |<-- 9. Final response --------|                            |
       |                              |   (Text analysis & JSON)     |                            |
       |<-- 10. Send structured JSON -|                              |                            |
       |   results & render UI        |                              |                            |
       v                              v                              v                            v
```

---

## 3. Test Infrastructure and Strategy

To guarantee the reliability, security, and performance of the dashboard (especially with the introduction of AI and external MCP servers), a structured testing setup is required.

### 3.1 Suggested Testing Stack
- **Test Runner & Assertion Library:** **Jest** (highly modular, fast, and has built-in mock assertions) or **Vitest** (for ultra-fast ESM runs).
- **Frontend Unit Testing:** **React Testing Library** (RTL) + `@testing-library/jest-dom` for testing React state transitions and component rendering.
- **End-to-End (E2E) Testing:** **Playwright** (best-in-class multi-browser testing, handles session authentication storage, and provides robust visual testing).
- **HTTP Mocking:** **Mock Service Worker (MSW)** or **Nock** to mock Google Drive, Meta Graph, and Anthropic API responses.

---

### 3.2 Unit Testing Strategy

#### Backend Unit Tests (Jest):
- **Target Files:** `server.js` and its helper modules.
- **Core Test Cases:**
  1. **Lead Header Normalization:** Test `COLUMN_MAPPINGS` with diverse variants of sheet headers. Confirm that "Whats", "Telefone", and "Celular" map to the unified `phone` attribute.
  2. **Mapping Logic:** Test `readMappings` and `writeMappings` functions. Verify database robustness against file write corruption and empty mapping arrays.
  3. **Credentials Fallback:** Test the `/api/meta-accounts` token selection priorities:
     - Priority 1: Temporary OAuth token.
     - Priority 2: Mapped permanent client token.
     - Priority 3: Global environment variable `META_ACCESS_TOKEN`.
  4. **Authorization Middleware:** Verify `/api/login` session token generation, verification, and correct HTTP status codes (200 for valid session, 401 for unauthorized).

*Example Jest test for lead normalization logic:*
```javascript
const { normalizeHeaders } = require('./utils/leadParser'); // Assume extracted helper

describe('Lead Header Normalizer', () => {
  it('should correctly map Portuguese and English headers to standard keys', () => {
    const rawHeaders = ['Data/Hora', 'Nome Completo', 'Whats', 'Dispositivo', 'Canal'];
    const expected = { date: 0, name: 1, phone: 2, device: 3, platform: 4 };
    expect(normalizeHeaders(rawHeaders)).toEqual(expected);
  });

  it('should ignore casing and accents', () => {
    const rawHeaders = ['NOME', 'TELEFONE', 'PLATAFORMA'];
    const expected = { name: 0, phone: 1, platform: 2 };
    expect(normalizeHeaders(rawHeaders)).toEqual(expected);
  });
});
```

#### Frontend Unit Tests (Vitest + RTL):
- **Target Components:** `agro.html` React components (extracted into modular JS/JSX files for testing).
- **Core Test Cases:**
  1. **KPI Math Calculation:** Verify math calculation logic for CPL, CPC, and ROAS. Ensure correct output when dividing by zero (e.g. spend = 0 or conversions = 0).
  2. **Demo Mode Toggle:** Confirm that toggling Demo Mode loads static mock datasets (`mockData.js`) and hides integration setup screens.
  3. **AI Insights Cards Rendering:** Validate that the recommendations list displays color-coded badges based on warning severity levels.

---

### 3.3 End-to-End (E2E) Testing Strategy (Playwright)

E2E tests will run automated browser instances to test entire workflows from a user's perspective.

#### Core E2E Scenarios:
1. **Authentication Flow (Demo vs. Real):**
   - Log in via mock credentials.
   - Click "Acessar Modo Demo" -> Assert page redirects to dashboard with the "MODO DEMO" badge visible.
   - Log out -> Verify session token deletion from Session Storage.
2. **Client Accounts Mapping Flow:**
   - Navigate to Settings -> Meta Accounts tab.
   - Select a mock client and map it to a specific Meta Ad Account ID.
   - Save mapping -> Verify that `mappings.json` is updated on the filesystem and the dashboard updates the current client header.
3. **AI Insights Generation Flow:**
   - Select client, set date range, and click "Gerar Insights".
   - Assert the loading spinner/skeleton cards are displayed.
   - Assert that once the mock API responds, the AI Insights card, KPI audit checklist, and chat box are correctly displayed and interactive.

*Example Playwright E2E test:*
```javascript
import { test, expect } from '@playwright/test';

test.describe('Connect Agro - Dashboard E2E Flows', () => {
  test('should log in and display demo mode data', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Clique no botão de demo
    await page.click('#btn-login-demo');
    
    // Verificar se entrou no dashboard
    await expect(page.locator('#demo-badge')).toBeVisible();
    await expect(page.locator('#select-client')).toHaveValue('demo-1');
    
    // Verificar se os gráficos de pizza ou linhas são renderizados
    const leadsCount = await page.locator('.kpi-value').first().textContent();
    expect(parseInt(leadsCount)).toBeGreaterThan(0);
  });
  
  test('should trigger AI Insights and display structured recommendations', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.click('#btn-login-demo');
    
    // Navegar até seção de IA
    await page.click('text=Insights IA');
    await page.click('#btn-generate-ai-insights');
    
    // Verificar se exibe estado de loading
    await expect(page.locator('.ai-loader')).toBeVisible();
    
    // Esperar processamento (mockado na API)
    await expect(page.locator('.ai-recommendation-card')).toHaveCount(3);
    await expect(page.locator('.ai-summary-text')).toContainText('CPL');
  });
});
```

---

### 3.4 Integration & API Mocking Strategy

To avoid dependencies on external APIs (which can cause test instability, rate limits, and financial costs), mocking must be applied to integration layers.

1. **Mocking Claude API & MCP Server:**
   - Use **MSW (Mock Service Worker)** or **Nock** to intercept HTTP requests from `server.js` to `https://api.anthropic.com/` and return predefined JSON-RPC payloads mimicking Claude's "tool_use" requests and final response.
   - For stdio/SSE MCP server mock: Spin up a simple local Node script that simulates an MCP server (listening to JSON-RPC over stdin/stdout) and returns canned ad account results.
2. **Mocking Google Sheets API:**
   - Implement mock handlers for the `googleapis` library or intercept calls to Google OAuth and Drive REST endpoints returning mock sheets content (representing different scenarios like empty sheets, sheets with corrupt dates, or large datasets).
3. **Continuous Integration (CI) Integration:**
   - Integrate Playwright and Jest into the GitHub Actions/GitLab CI pipeline.
   - Run tests automatically on every Pull Request.
   - Generate test reports and code coverage files, failing the build if coverage falls below a certain threshold (e.g., 80% for backend business logic).
