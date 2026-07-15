## 2026-07-14T12:14:34Z
You are the Milestone 5 Worker. Your working directory is c:\Users\Bruno Espíndola\OneDrive\Documentos\Dash\.agents\worker_m5 (please create it if it does not exist, and write your BRIEFING.md and progress.md there).

Your mission is to implement/complete Milestone 5: AI Insights Claude + MCP (R4) in the codebase.
The target files to edit are: server.js, index.html, js/app.js, agro.html.
The success criteria is that all tests in tests/e2e/f8_ai.spec.js pass cleanly.

Please follow these steps:
1. Initialize your briefing and progress tracker in your directory.
2. Read the spec file tests/e2e/f8_ai.spec.js to understand all selectors, expected content, IDs, class names, and mock triggers (e.g. unmapped client "Tratores Connect" disables button and shows banner, etc.).
3. Inspect server.js, index.html, js/app.js, and agro.html to understand existing structure.
4. Implement the backend endpoint POST /api/ai/insights in server.js:
   - Request body format: { clientName: "...", dateRange: { since: "...", until: "..." }, focus: "..." }
   - Check if clientName is mapped (for example, mapping is defined in data/mappings.json or client config. If client is unmapped like "Tratores Connect", return appropriate response or ensure front-end blocks it).
   - If clientName is "NutriCampo Fertilizantes", return a response or error indicating empty sheets data ("Dados insuficientes no Google Sheets para diagnóstico de IA").
   - Spawn the Meta Ads MCP Server subprocess using stdio transport (running `node mcp-servers/mock-meta-ads-mcp.js`).
   - Query the Anthropic Messages API (using fetch/request targeting `https://api.anthropic.com/v1/messages` with dummy headers and key).
   - Handle tool use: when Claude responds with stop_reason "tool_use", parse the tool call (e.g., name: "get_campaign_performance", input: { account_id, time_range }), write JSON-RPC request to the MCP subprocess stdin, read response from stdout, and send it back to the Anthropic Messages API to get the final text response.
   - Return `{ insights: "..." }` on success.
   - Handle errors gracefully, including 429 rate limits (returning 429) and 500 server errors (returning 500 with "Erro na integração com o servidor Meta MCP").
5. In index.html, add a sidebar menu button with class "nav-item" and data-view="view-ai" for switching to the AI insights view.
6. In index.html, implement the view-ai div (#view-ai with class "dashboard-view hidden"), containing:
   - Select client and focus options (#select-ai-focus option values: cpl, roas, reach, spend).
   - "Gerar Insights" button (#btn-generate-insights).
   - Loading spinner (#ai-loading-spinner) and progressive tracker checklist text (#ai-progress-text).
   - Urgency cards container displaying Claude recommendations with classes: .urgency-card.critical (border-left-color: red), .urgency-card.warning (border-left-color: yellow), .urgency-card.opportunity (border-left-color: green).
   - Diagnosis report display panel (#ai-diagnosis-report).
   - Unmapped client mapping banner (#ai-mapping-banner) and error banner (#ai-error-banner).
   - Fallback container (#ai-insights-fallback-container) for unstructured responses.
   - Interactive chat log box (#ai-chat-log), input text (#ai-chat-input), send button (#btn-send-ai-chat), and chat loading bubble (#chat-loading-bubble).
7. Implement all corresponding JavaScript logic in js/app.js:
   - Handle tab switching for view-ai.
   - Progressive tracker simulation during loading (setting text to "Conectando MCP...", "Consultando Meta Ads...", "Claude Analisando...").
   - Rendering response HTML parsing markdown or fallback text.
   - Sending chat questions, appending user message, displaying loading bubble, calling backend, appending bot reply bubble (.chat-bubble.bot).
   - Disabling button and showing mapping banner for "Tratores Connect".
8. Sync the equivalent UI/logic in the React application inside agro.html.
9. Execute Playwright tests to verify:
   npx playwright test tests/e2e/f8_ai.spec.js
10. Once all 10 tests pass cleanly, write handoff.md in your working directory and notify the orchestrator.
