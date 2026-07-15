# Handoff Report: AI Integration and System Flow

This report outlines the observations, logic chain, and proposed system design for integrating the external Meta Ads MCP server with Claude and establishing a testing strategy.

---

## 1. Observation

- **Backend Architecture (`server.js`):**
  - Line 22: Serves `agro.html` as the main application page.
    ```javascript
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'agro.html')));
    ```
  - Lines 153-167: Declares `COLUMN_MAPPINGS` to normalize Google Sheets column headers dynamically.
  - Lines 224-280: The `/api/leads` route fetches Google Sheets leads data or uses `mockData.js` generators for demo mode.
  - Lines 735-804: The `/api/meta-accounts` route retrieves Facebook Ad accounts using tokens stored in `mappings.json` (mapped client accounts) or `process.env.META_ACCESS_TOKEN`.
  - Lines 619-731: The `/api/meta-insights` route proxies raw HTTP requests to the Facebook Graph API (`https://graph.facebook.com/v25.0/`) in parallel.
- **Frontend Architecture (`agro.html`):**
  - Lines 16-24: Loads React, ReactDOM, Recharts, and Babel Standalone via unpkg CDNs.
  - Lines 1162-1192: Employs a `useMemo` block called `insights` to calculate static, rules-based patterns (e.g., comparing Device/Platform ratios) in the browser.
  - Lines 1500-1516: Renders these basic client-side insights inside a styled card.
- **Workspace State:**
  - `package.json` contains no test dependencies (`devDependencies` is empty) and only 5 runtime dependencies (`axios`, `cors`, `dotenv`, `express`, `googleapis`).
  - No physical test files (Jest, Playwright, Mocha, Cypress) exist anywhere in the project.

---

## 2. Logic Chain

1. **Backend Integration Hub:** Based on the observation that the Express backend (`server.js`) manages the security and routing of Google Sheets API and Meta Ads API credentials, it should also host the **MCP Client** rather than doing so client-side. This keeps Meta access tokens and the Anthropic API Key hidden from the browser console.
2. **MCP Tool Loop:** Based on the Model Context Protocol specifications, Claude must be aware of the tools available on the Meta Ads MCP Server. The backend will query the MCP Server's tool definitions using `listTools()`, transform them into Anthropic's tool schema format, and supply them to Claude. When Claude requests a tool execution via a `tool_use` response, the backend routes the request to the MCP server, gets the data, and returns the result back to Claude to complete the reasoning loop.
3. **UI/UX Visual Harmony:** Since `agro.html` uses a dark-theme glassmorphism CSS design system defined in `styles.css` (variables like `--primary-gradient` and `--panel-bg`), the new AI Insights panel should be styled using these exact same CSS attributes, showing card categories colored according to system warnings (e.g., `var(--error)` for critical recommendations).
4. **Testing Isolation:** Since there are no current tests and the application integrates external services (Google Sheets, Meta Ads, Anthropic Claude), an offline mocking strategy is critical. Using **MSW** or **Nock** to intercept HTTP traffic ensures that E2E tests in **Playwright** can run deterministically without incurring API usage costs or failing due to expired access tokens.

---

## 3. Caveats

- **External Schema Assumption:** The exact tool signatures of the external Meta Ads MCP server were assumed based on standard Graph API requirements. If the external MCP server has different tool names (e.g. `query_campaigns` instead of `get_campaign_performance`), the backend tool-mapping logic must be adjusted.
- **Single-File React Compilation:** Since `agro.html` compiles JSX on the fly using Babel Standalone, directly running Unit tests on JSX components would require modularizing `agro.html` into a standard build system (like Vite). The current recommendations focus on E2E testing (Playwright) as a non-intrusive alternative.
- **Read-Only Mode:** No code modifications were implemented in the source code files (`server.js`, `agro.html`, `package.json`).

---

## 4. Conclusion

Integrating the Meta Ads MCP server requires establishing a Node.js-based MCP Client within `server.js` that intercepts Claude's `tool_use` events and coordinates data fetching securely. The frontend UI should expose this functionality through a glowing, glassmorphic "AI Insights" dashboard component with actionable recommendation cards and an interactive chat box. To secure this architecture, we recommend a testing stack consisting of **Jest** for backend utility unit tests, **Playwright** for complete user scenario E2E tests, and **MSW** for offline integration mocking.

---

## 5. Verification Method

To verify the integration and proposal details:
1. **Inspect Analysis Report:** Review `c:\Users\Bruno Espíndola\OneDrive\Documentos\Dash\.agents\explorer_setup_3\analysis.md` which contains the architectural diagrams, component mockups, code templates, and testing blueprints.
2. **Validate Mock Mappings:** Check `data/mappings.json` and ensure it maintains the correct structure for client names to ad account IDs.
3. **Simulation Verification:** Run E2E test scripts (once installed) in headless mode:
   ```bash
   npx playwright test
   ```
   Confirm that mock API interception triggers correct rendering of the proposed UI cards.
