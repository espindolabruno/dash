## 2026-07-13T04:40:19Z
Objective: Set up the E2E test runner (Playwright) and API mocks for the Connect Agro Analytics Dashboard so that tests can run offline.
Do NOT write tests yet, just set up the infrastructure.

Instructions:
1. Update `package.json` to add `@playwright/test` and `msw` as `devDependencies`.
2. Add npm scripts:
   - `"test:e2e": "playwright test"`
   - `"test:e2e:ui": "playwright test --ui"`
   - `"test:e2e:debug": "playwright test --debug"`
3. Create `playwright.config.js` at the project root to:
   - Configures the `webServer` option to run the Express backend server (command: `cross-env NODE_ENV=test USE_MOCK_MCP=true node server.js`, port: 3000, reuseExistingServer: !process.env.CI).
   - Configures the test directory to `tests/e2e`.
   - Set browser configs, timeouts, etc.
4. Implement offline mocks:
   - Setup MSW (Mock Service Worker) inside Node server or as an interceptor. Since `server.js` starts the Express server, when `process.env.NODE_ENV === 'test'`, it should require and start the MSW Node server (`setupServer`) to intercept outbound requests to:
     - Google Sheets and Drive APIs (`https://www.googleapis.com/...`) returning mock spreadsheet/leads data.
     - Meta Graph API (`https://graph.facebook.com/...`) returning mock account and campaign data.
     - Anthropic Messages API (`https://api.anthropic.com/v1/messages`) returning mock Claude responses.
   - Setup a mock Meta Ads MCP server subprocess script `mcp-servers/mock-meta-ads-mcp.js` (or similar location) that runs over stdio and responds to JSON-RPC 2.0 requests (e.g. `get_campaign_performance`, `get_adset_performance`, `get_ad_performance` tools) with mock data.
5. In `server.js`, check if `NODE_ENV === 'test'` and load the MSW interceptor.
6. Install dependencies (`npm install`) and run the test runner to ensure there are no compilation or config issues.
7. Save your handoff report to `c:\Users\Bruno Espíndola\OneDrive\Documentos\Dash\.agents\worker_m1\handoff.md`.
