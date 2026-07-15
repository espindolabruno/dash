## 2026-07-14T03:30:43Z
You are the Milestone 4 Worker (generation 2). Your working directory is c:\Users\Bruno Espíndola\OneDrive\Documentos\Dash\.agents\worker_m4_gen2 (please create it if it does not exist, and write your BRIEFING.md and progress.md there).

Your mission is to implement/complete Milestone 4: Leads & Event Analysis (styled Leads spreadsheet with thumbnails, search, sorting, pagination, and a Meta Pixel Event Analysis view with API proxy, timeline, setting save/validation, discrepancy margin/warnings, input validation, error handling, React/agro.html sync) in the codebase.
The target files to edit are: server.js, index.html, js/app.js, agro.html.
The success criteria is that all tests in these specs pass cleanly:
- tests/e2e/f6_leads.spec.js
- tests/e2e/f7_pixel.spec.js

Please follow these steps:
1. Initialize your briefing and progress tracker in your directory.
2. Read the spec files tests/e2e/f6_leads.spec.js and tests/e2e/f7_pixel.spec.js to understand all selectors, expected content, IDs, class names, and mock triggers (like pixel ID 9999999999 for 504 timeout, 400400400 for 400 bad request, 100100100 for 100% discrepancy).
3. Inspect index.html, server.js, js/app.js, and agro.html to understand existing structure.
4. Implement the GET /api/pixel-events endpoint in server.js, proxying/handling request query parameters startDate, endDate, pixelId, and demo, returning correct data formats and mock errors/discrepancies for the specific IDs.
5. In index.html, replace or implement the Leads view with a table (#leads-spreadsheet-table) having Nome, WhatsApp/Telefone, Plataforma, Dispositivo, Status, Data/Hora headers, a search input (#leads-table-search), pagination buttons (#leads-pagination-prev, #leads-pagination-next, #leads-pagination-last), a page label (#leads-page-label), a thumbnail image class (.ad-thumbnail) that opens a modal (#modal-lightbox) showing the full image (.lightbox-preview-img), a fallback icon (.thumbnail-fallback) for broken images, and an empty search placeholder (#leads-empty-placeholder).
6. In index.html, implement the Event Analysis view under view-events, including saving numeric pixel ID in settings (modal #settings-modal, input #input-pixel-id, save #btn-save-settings, error validation), #btn-load-pixel-events, #pixel-pageview-count, #pixel-lead-count, #pixel-purchase-count metrics, timeline chart #chart-pixel-timeline, discrepancy margin #discrepancy-margin-val, discrepancy card #pixel-discrepancy-card (adding discrepancy-warning-high class), clear button #btn-clear-pixel-events, and placeholder #pixel-empty-placeholder.
7. Implement all corresponding JavaScript logic in js/app.js. Make sure to handle table sorting (clicking th[data-column="date"] toggles sort and updates row class col-date), searching, paginating, image hover/error (adding fallback element on image load failure), pixel api fetching, discrepancy calculation, settings validation (empty vs non-numeric errors and toasts).
8. Sync the equivalent UI/logic in the React application inside agro.html.
9. Execute Playwright tests to verify:
   npx playwright test tests/e2e/f6_leads.spec.js tests/e2e/f7_pixel.spec.js
10. Once all 20 tests pass cleanly, write handoff.md in your working directory and notify the orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
