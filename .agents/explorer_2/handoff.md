# Handoff Report - Offline E2E Mock Design Strategy

This report details the investigation findings and offline mocking strategy for the Connect Agro Advanced Analytics Dashboard E2E Playwright test suite.

---

## 1. Observation
We observed the following regarding the dashboard's API endpoints and frontend:

* **CDN and Browser Compilation:** `agro.html` (lines 17-24) imports React, ReactDOM, Recharts, and Babel directly via CDN:
  ```html
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  ...
  <script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin></script>
  ```
* **Google API Clients:** `server.js` (lines 115-147) initializes Google Drive and Sheets clients using standard Google Node SDK wrappers (`oauth2Client`, `drive`, and `sheets`).
* **Demo Mode Parameter:** The backend endpoints `/api/leads` (lines 231-241) and `/api/meta-insights` (lines 367-380) check for a `demo === 'true'` flag:
  ```javascript
  if (isDemo) {
    const leads = generateMockLeads(clientName || 'AgroForte Sementes');
    return res.json({ ... });
  }
  ```
* **MCP Integration Spec:** `PROJECT.md` (lines 38-45) indicates that the server communicates with the Meta Ads MCP Server subprocess using JSON-RPC 2.0 over standard I/O (stdio).
* **AI Integration Proposal:** `explorer_setup_3/analysis.md` describes the Anthropic Message creation loop using `anthropic.messages.create` with tools listed from the MCP server.
* **Testing Setup:** The repository currently has no active tests or testing configuration files (e.g., `playwright.config.js`).

---

## 2. Logic Chain
1. **HTTP/REST Interception:** Since the backend communicates with Google (Drive/Sheets) and Meta (Graph/Pixel/OAuth) via outbound HTTPS REST requests, we can intercept all HTTP traffic within the main Node process using **Mock Service Worker (MSW) for Node** (`setupServer`). This intercepts calls at the network layer, ensuring no real external network requests are sent.
2. **Subprocess Network Mocking Isolation:** The backend coordinates tool execution by spawning an external Meta Ads MCP Server process (`node mcp-servers/meta-ads-mcp.js`) via standard I/O. Because child processes run in separate V8 instances, Node-side MSW or Nock running inside the main `server.js` process **will not** intercept the child process's outgoing HTTP requests to the Meta Graph API.
3. **Process-Level Mocking Solution:** To run the E2E tests 100% offline without hitting Meta's Graph API, the backend must redirect child process execution to a mock MCP script (`mock-meta-ads-mcp.js`) during E2E tests. This mock script implements the MCP JSON-RPC protocol over stdio and returns static/dynamic mock payloads, bypassing the need for network-level child process interception.
4. **Claude Loop Emulation:** The MSW Anthropic handler intercepts `https://api.anthropic.com/v1/messages`. It monitors the list of messages: if no `tool_result` is present, it returns a mock `tool_use` request. If a `tool_result` is present, it returns the final analysis. This mimics Claude's reasoning loop.
5. **Unified Playwright Execution:** By configuring Playwright's `webServer` block to boot the backend using environment variables like `NODE_ENV=test` and `USE_MOCK_MCP=true`, the backend initializes MSW interceptors and points the MCP transport to the mock script, allowing offline execution.

---

## 3. Caveats
* **API Implementations:** The `/api/pixel-events` and `/api/ai/insights` endpoints are currently planned and not yet written in `server.js`. The mock strategy assumes they will conform to the schemas specified in `PROJECT.md` and the design in `explorer_setup_3/analysis.md`.
* **MSW Integration Overhead:** Running MSW in the backend requires installing devDependencies (`msw`, `cross-env`) and loading MSW node handlers in the server code conditional on `process.env.NODE_ENV === 'test'`.
* **MCP Stdio Pathing:** The location of the MCP script and mock script must be resolved correctly relative to the project root in `server.js`.

---

## 4. Conclusion
A 100% offline E2E Playwright testing environment is achievable and should be implemented as follows:
1. **Network Interception (MSW)** for Claude, Google Drive/Sheets, and Meta Graph/Pixel APIs.
2. **Process Interception** for the Meta Ads MCP Server subprocess via a mock stdio script.
3. **Demo Mode fallback** for pure frontend verification.

---

## 5. Verification Method
To independently verify this mocking strategy once implemented:
1. Run the backend in test mode: `cross-env NODE_ENV=test USE_MOCK_MCP=true node server.js`.
2. Disable internet connection on the test machine.
3. Make an HTTP request to `/api/leads?demo=false&clientId=some-id` and check that it returns the mocked data defined in `googleHandler.js` (e.g. Carlos Mendes, Felipe Agro) instead of timing out.
4. Make an HTTP request to `/api/ai/insights` and check that the backend successfully spawns the mock MCP server, processes the tool request, and responds with the mock Claude recommendations.
5. Run the E2E test suite: `npx playwright test`. Check that all tests pass without hitting external APIs.
