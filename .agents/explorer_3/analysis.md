# E2E Test Proposal: Connect Agro Advanced Analytics Dashboard

This document proposes a comprehensive suite of 93 End-to-End (E2E) test cases for the Connect Agro Analytics Dashboard. The tests are structured across four tiers (Tier 1: Happy-path, Tier 2: Boundary/Edge, Tier 3: Cross-feature combinations, and Tier 4: Real-world workloads) to cover features F1 through F8 as defined in `TEST_INFRA.md`.

---

## E2E Testing Stack Overview
- **Runner**: Playwright
- **Network Interception**: Mock Service Worker (MSW) for Node
- **Mock MCP Subprocess**: Custom JSON-RPC stdio mock script (`mcp-servers/mock-meta-ads-mcp.js`)
- **Execution Mode**: 100% offline, deterministic, zero API cost.

---

## Tier 1: Happy-Path Feature Coverage (40 Test Cases)
Five test cases per feature (F1 to F8). These verify core functionality under normal operating conditions.

### F1: Sidebar Menu Toggle
1. **TC-F1-01: Collapse Sidebar Menu**
   - *Description*: Verify that the user can collapse the sidebar to maximize workspace.
   - *User Actions*: Click the sidebar hamburger/toggle button.
   - *Assertions*: Sidebar container element (`.sidebar`) has the `.collapsed` class; text labels are hidden (`display: none` or opacity `0`), and only icon glyphs remain visible.
2. **TC-F1-02: Expand Sidebar Menu**
   - *Description*: Verify that the user can expand a collapsed sidebar menu.
   - *User Actions*: Click the sidebar hamburger/toggle button when collapsed.
   - *Assertions*: Sidebar container loses the `.collapsed` class; text labels are fully visible; layout transitions smoothly.
3. **TC-F1-03: Route Navigation Selection**
   - *Description*: Verify that clicking sidebar items changes active route highlighting.
   - *User Actions*: Collapse sidebar, hover/click on the "Leads Table" icon.
   - *Assertions*: Clicking adds `.active` class to the clicked navigation item, removes it from others, and shifts the visual accent line.
4. **TC-F1-04: Multi-Dashboard State Sync**
   - *Description*: Verify that sidebar collapse state is synced between general (`index.html`) and React-based agro (`agro.html`) dashboards.
   - *User Actions*: Collapse sidebar in `index.html`, click "Agro Dashboard" link.
   - *Assertions*: The React dashboard (`agro.html`) loads with its sidebar already collapsed.
5. **TC-F1-05: Persistence Across Reloads**
   - *Description*: Verify that sidebar state is saved in LocalStorage.
   - *User Actions*: Collapse sidebar, refresh the browser page.
   - *Assertions*: Sidebar remains collapsed immediately upon page load without flickering.

### F2: Tab View Switching
6. **TC-F2-01: Switch Tab Panel**
   - *Description*: Verify that clicking tab navigation buttons displays the correct view container.
   - *User Actions*: Click "Campaign Performance" tab button.
   - *Assertions*: Overview container has `hidden` or `display: none`; Campaign container is visible; class `.active` is added to the tab button.
7. **TC-F2-02: URL Hash Integration**
   - *Description*: Verify that tab switches update the URL hash.
   - *User Actions*: Click "Leads Spreadsheet" tab.
   - *Assertions*: URL in browser matches `http://localhost:3000/#leads`.
8. **TC-F2-03: Chart Re-render on Tab Show**
   - *Description*: Verify ApexCharts resize correctly when their tab becomes visible.
   - *User Actions*: Click "Campaign Performance" tab.
   - *Assertions*: ApexChart canvas height and width match parent container bounding box (not collapsed to 0px).
9. **TC-F2-04: Back/Forward Browser History**
   - *Description*: Verify that browser back/forward buttons navigate between tabs.
   - *User Actions*: Click Overview tab, click Leads tab, click browser Back button.
   - *Assertions*: Overview tab becomes active again.
10. **TC-F2-05: Tab Toggle Keyboard Focus**
    - *Description*: Verify that tabs are accessible via keyboard navigation.
    - *User Actions*: Press `Tab` key to focus on the tab headers, press `Right Arrow` then `Enter`.
    - *Assertions*: Focus outlines are visible, and pressing Enter displays the corresponding tab content.

### F3: Drag & Drop Comparison
11. **TC-F3-01: Drag Campaign to Dropzone A**
    - *Description*: Verify a campaign card can be dragged into comparison Slot A.
    - *User Actions*: Drag Campaign A card from the left-hand list and drop it into comparison Slot A.
    - *Assertions*: Slot A changes from "Vazio" state to display Campaign A's name, ID, and basic metrics.
12. **TC-F3-02: Drag Creative to Dropzone B**
    - *Description*: Verify a creative card can be dragged into comparison Slot B.
    - *User Actions*: Drag Creative B card and drop it into comparison Slot B.
    - *Assertions*: Slot B displays Creative B's thumbnail, title, and impressions.
13. **TC-F3-03: Render Side-by-Side Table**
    - *Description*: Verify that dropping items in both slots renders comparison details.
    - *User Actions*: Drag Campaign A into Slot A, Campaign B into Slot B.
    - *Assertions*: A side-by-side comparison table is displayed underneath, showing deltas for Clicks, Cost, CPL, and conversions.
14. **TC-F3-04: Clear Single Comparison Slot**
    - *Description*: Verify that an item can be removed from a comparison slot.
    - *User Actions*: Click "Remover" icon (X) on Slot A.
    - *Assertions*: Slot A reverts to the "Vazio" placeholder state; the comparison table updates to hide Campaign A.
15. **TC-F3-05: Reset Dropzone Comparison**
    - *Description*: Verify that the "Limpar Tudo" button resets both drop zones.
    - *User Actions*: Drop items into Slot A and B, click "Limpar Comparação" button.
    - *Assertions*: Both slots show the default empty state, and the comparison grid/table is hidden.

### F4: Period-over-Period (PoP) Variance
16. **TC-F4-01: Enable PoP Comparison**
    - *Description*: Verify that enabling PoP comparison displays delta indicators.
    - *User Actions*: Click the "Compara com período anterior" checkbox.
    - *Assertions*: KPIs display percentage deltas (e.g. `+15.2%`) underneath the main values.
17. **TC-F4-02: Color-Coded Positive Variance**
    - *Description*: Verify that positive performance changes show in green.
    - *User Actions*: Load dataset with higher leads in the current period vs prior.
    - *Assertions*: Leads KPI delta shows a green arrow pointing up and class `.text-success` is present.
18. **TC-F4-03: Color-Coded Negative Variance**
    - *Description*: Verify that negative performance changes (like CPL increasing) show in red.
    - *User Actions*: Load dataset with higher CPL in current period vs prior.
    - *Assertions*: CPL KPI delta displays red text `.text-danger` with an up arrow (since CPL cost increase is negative).
19. **TC-F4-04: Shifting Date Navigation Backwards**
    - *Description*: Verify date range buttons shift back by the exact period length.
    - *User Actions*: Select "Últimos 7 dias" range, click "Período Anterior" button.
    - *Assertions*: Date labels update to the preceding 7-day calendar block.
20. **TC-F4-05: Populating Custom Date Ranges**
    - *Description*: Verify PoP calculations function correctly with custom dates.
    - *User Actions*: Set start to `2026-06-01`, end to `2026-06-15`, enable PoP.
    - *Assertions*: Prior period metrics are calculated based on `2026-05-17` to `2026-05-31`.

### F5: Video Funnel Charts
21. **TC-F5-01: Render 5-Step Video Funnel**
    - *Description*: Verify the watch funnel (25%, 50%, 75%, 95%, 100%) renders for videos.
    - *User Actions*: Select a video creative from the performance list.
    - *Assertions*: Chart displays 5 horizontal segments matching video play milestones.
22. **TC-F5-02: Display Drop-off Math**
    - *Description*: Verify drop-off calculations match source metrics.
    - *User Actions*: Inspect the label between the 50% and 75% steps.
    - *Assertions*: Retention and drop-off percentages correspond mathematically to `views_75 / views_50`.
23. **TC-F5-03: Video Chart Hover Tooltip**
    - *Description*: Verify hovering displays metrics.
    - *User Actions*: Hover mouse over 95% watch segment.
    - *Assertions*: Tooltip element is visible and displays total views and percentage of play.
24. **TC-F5-04: Toggle Views/Percentages**
    - *Description*: Verify toggling between absolute numbers and percentages.
    - *User Actions*: Click the "Mostrar Valores Absolutos" toggle button.
    - *Assertions*: Segment labels change from `%` representation to view counts (e.g. `1,250 views`).
25. **TC-F5-05: Update Funnel on Client Change**
    - *Description*: Verify video funnel syncs when changing client.
    - *User Actions*: Switch client dropdown from "AgroForte" to "Tratores Connect".
    - *Assertions*: Video funnel chart updates immediately with Tratores Connect's video metrics.

### F6: Leads Spreadsheet & Thumbnails
26. **TC-F6-01: Render CRM Leads Table**
    - *Description*: Verify spreadsheet rows are loaded and styled.
    - *User Actions*: Click "Leads Spreadsheet" tab.
    - *Assertions*: Leads table displays rows; columns map to Name, Phone, Platform, Device, Status, Date.
27. **TC-F6-02: Text Search Filtering**
    - *Description*: Verify typing filters leads reactively.
    - *User Actions*: Type "Silveira" in the spreadsheet search box.
    - *Assertions*: Table row count decreases; all visible rows contain "Silveira" in the name column.
28. **TC-F6-03: Column Sorting**
    - *Description*: Verify columns sort ascending and descending.
    - *User Actions*: Click the "Data/Hora" column header once.
    - *Assertions*: Rows are sorted descending by date; clicking again sorts them ascending.
29. **TC-F6-04: Leads Table Pagination**
    - *Description*: Verify pagination controls function correctly.
    - *User Actions*: Click the "Próxima" pagination arrow.
    - *Assertions*: Table body displays rows 11-20; page number label updates to "Página 2".
30. **TC-F6-05: Thumbnail Preview Lightbox**
    - *Description*: Verify clicking an ad thumbnail opens creative preview.
    - *User Actions*: Click on the image thumbnail in row 1.
    - *Assertions*: A modal lightbox overlay (`#modal-lightbox`) appears showing the full-sized ad preview.

### F7: Event Pixel API Fetching
31. **TC-F7-01: Submit Pixel Query**
    - *Description*: Verify that fetching pixel stats renders metrics.
    - *User Actions*: Enter a Pixel ID in Settings, click "Carregar Eventos Pixel".
    - *Assertions*: Pixel metrics section displays PageView, Lead, and Purchase counts.
32. **TC-F7-02: Render Event Timeline**
    - *Description*: Verify that fetched pixel events are plotted on a timeline.
    - *User Actions*: Click Pixel tab, trigger fetch.
    - *Assertions*: Timeline chart renders showing daily event counts.
33. **TC-F7-03: Sync Date Parameters**
    - *Description*: Verify date filters update pixel fetch request query.
    - *User Actions*: Select "Últimos 15 dias" in date picker, click fetch pixel.
    - *Assertions*: Outgoing API call uses correct date query parameters (`?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`).
34. **TC-F7-04: Discrepancy Margin Calculation**
    - *Description*: Verify that discrepancy percentage is displayed.
    - *User Actions*: Fetch pixel events for a period.
    - *Assertions*: UI displays a card showing the lead discrepancy ratio (e.g. `12% de diferença`).
35. **TC-F7-05: Clear Fetch State**
    - *Description*: Verify that pixel view can be reset.
    - *User Actions*: Click "Limpar Eventos" button.
    - *Assertions*: Pixel metrics cards and timeline return to "Nenhum dado consultado" placeholder state.

### F8: Claude & MCP AI Insights
36. **TC-F8-01: Trigger IA Diagnostics**
    - *Description*: Verify that clicking "Gerar Insights" initiates AI analysis.
    - *User Actions*: Select client "AgroForte Sementes", click "Gerar Insights com IA".
    - *Assertions*: App displays loading spinner and progressive checklist messages.
37. **TC-F8-02: Progressive Loading Tracker**
    - *Description*: Verify progressive messages update.
    - *User Actions*: Trigger AI insights.
    - *Assertions*: Text updates from "Conectando MCP..." -> "Consultando Meta Ads..." -> "Claude Analisando...".
38. **TC-F8-03: Render Urgency Panels**
    - *Description*: Verify Claude output is grouped into colored severity boxes.
    - *User Actions*: Wait for Claude response.
    - *Assertions*: Critical cards have a red left-border; Warning cards have yellow; Opportunity cards have green.
39. **TC-F8-04: Interactive AI Chat Box**
    - *Description*: Verify chat functionality with Claude.
    - *User Actions*: Type "Como posso otimizar a campanha Milho?" in the AI chat input, click Send.
    - *Assertions*: Question is appended to chat log; loading bubble appears; Claude replies with advice.
40. **TC-F8-05: Focus Area Selection**
    - *Description*: Verify that selecting a focus modifies Claude prompt.
    - *User Actions*: Select "Foco: Custo/CPL", click "Gerar Insights".
    - *Assertions*: Payload sent to the backend includes custom focus directive, and returned diagnostic centers on CPL cost analysis.

---

## Tier 2: Boundary/Edge and Corner Cases (40 Test Cases)
Five test cases per feature (F1 to F8). These cover boundary inputs, empty states, error states, and invalid parameters.

### F1: Sidebar Menu Toggle
41. **TC-F1-06: Desktop Default State**
    - *Description*: Verify sidebar starts expanded on desktop viewports.
    - *User Actions*: Set viewport to 1440x900, load page.
    - *Assertions*: Sidebar is expanded by default (does not have `.collapsed` class).
42. **TC-F1-07: Mobile Auto-Collapse**
    - *Description*: Verify sidebar starts collapsed on mobile screens.
    - *User Actions*: Set viewport to 375x812 (mobile), load page.
    - *Assertions*: Sidebar is collapsed by default.
43. **TC-F1-08: Outside Click Dismissal on Mobile**
    - *Description*: Verify sidebar collapses when clicking outside on mobile.
    - *User Actions*: On mobile viewport, click sidebar toggle to expand, then click anywhere on the main dashboard content area.
    - *Assertions*: Sidebar collapses immediately.
44. **TC-F1-09: Rapid Click Stress Test**
    - *Description*: Verify rapid clicks do not break sidebar animation state.
    - *User Actions*: Double-click or click toggle button 10 times in 2 seconds.
    - *Assertions*: Sidebar animation finishes in a clean state, and DOM classes match the final state without lag.
45. **TC-F1-10: Persistent State on Tab Switching**
    - *Description*: Verify sidebar state remains unchanged when switching tabs.
    - *User Actions*: Collapse sidebar, click through all tab items.
    - *Assertions*: Sidebar remains collapsed on every tab.

### F2: Tab View Switching
46. **TC-F2-06: Invalid Hash Redirection**
    - *Description*: Verify invalid hash values default to Overview.
    - *User Actions*: Navigate to `http://localhost:3000/#nonexistent-tab`.
    - *Assertions*: Page loads with Overview tab active.
47. **TC-F2-07: Tab Switch under Active API Fetch**
    - *Description*: Verify switching tabs during slow loads.
    - *User Actions*: Click a slow-loading client, switch tabs immediately.
    - *Assertions*: App does not crash; loading indicators cancel or display appropriately.
48. **TC-F2-08: Persistence Across Page Reloads**
    - *Description*: Verify current active tab remains active on browser refresh.
    - *User Actions*: Switch to "AI Insights" tab, click reload.
    - *Assertions*: Dashboard page reloads with the AI Insights tab selected.
49. **TC-F2-09: Modal/Tab Switch Conflict**
    - *Description*: Verify switching tabs with open settings modal.
    - *User Actions*: Open Settings modal, click "Leads Table" tab in background sidebar.
    - *Assertions*: Settings modal remains open or is auto-closed; active tab background changes.
50. **TC-F2-10: Tab Switching with Empty Data**
    - *Description*: Verify switching tabs when client has no data.
    - *User Actions*: Switch to "Tratores Connect" (which has empty lead rows), switch tabs.
    - *Assertions*: Tab switches; empty states ("Nenhum lead disponível") render without JS runtime errors.

### F3: Drag & Drop Comparison
51. **TC-F3-06: Reject Dragging Invalid Type**
    - *Description*: Verify dropzones reject dragging other page elements.
    - *User Actions*: Try to drag the client logo or datepicker text and drop it into Slot A.
    - *Assertions*: Dropzone rejects drag, background does not highlight, and slot remains empty.
52. **TC-F3-07: Duplicate Item Rejection**
    - *Description*: Verify same campaign cannot be compared to itself.
    - *User Actions*: Drag Campaign A to Slot A, then drag Campaign A to Slot B.
    - *Assertions*: Slot B rejects Campaign A, showing a validation warning ("Item já está em comparação").
53. **TC-F3-08: Slots Limit Boundary (Max 3)**
    - *Description*: Verify comparison rejects more than maximum slots.
    - *User Actions*: Drop campaigns into Slot A, B, and C, try to drag a fourth campaign onto the comparison grid.
    - *Assertions*: Drag-over is blocked, and slot displays no change.
54. **TC-F3-09: Drag Cancellation Handling**
    - *Description*: Verify releasing drag outside slot resets state.
    - *User Actions*: Drag Campaign A, hover over Slot A, move cursor out of slot area, release mouse button.
    - *Assertions*: Slot A returns to empty state; card remains in original list.
55. **TC-F3-10: Mobile Touch Drag Emulation**
    - *Description*: Verify drag and drop works using mobile touch events.
    - *User Actions*: Emulate touch pointer, trigger `touchstart` on Campaign A, move to Slot A, trigger `touchend`.
    - *Assertions*: Campaign A is placed in Slot A successfully.

### F4: Period-over-Period (PoP) Variance
56. **TC-F4-06: Prior Period Division by Zero**
    - *Description*: Verify delta calculation when prior period has zero conversions.
    - *User Actions*: Set dates. Prior period leads = 0; current period leads = 15.
    - *Assertions*: Delta badge displays `+100%` or `N/A` instead of showing `Infinity` or crashing the thread.
57. **TC-F4-07: Current Period Zero Value**
    - *Description*: Verify delta calculation when current period has zero conversions.
    - *User Actions*: Prior leads = 12, current leads = 0.
    - *Assertions*: Delta badge displays `-100%` in red.
58. **TC-F4-08: Extremely Large Delta (Outliers)**
    - *Description*: Verify layout when delta is extremely large.
    - *User Actions*: Prior leads = 1, current leads = 50,000.
    - *Assertions*: Delta displays `+5,000,000%` without text overflow or breaking container borders.
59. **TC-F4-09: Leap Year Date Calculations**
    - *Description*: Verify date ranges shift correctly over leap year boundaries.
    - *User Actions*: Set range to Feb 2024, click "Período Anterior".
    - *Assertions*: Prior period is calculated correctly using 29 days for February.
60. **TC-F4-10: Equal Value Neutral Delta**
    - *Description*: Verify delta styling when values are equal.
    - *User Actions*: Prior leads = 100, current leads = 100.
    - *Assertions*: Delta badge displays `0%` styled with neutral gray (`.text-muted` or similar).

### F5: Video Funnel Charts
61. **TC-F5-06: Render Static Creative Fallback**
    - *Description*: Verify funnel shows appropriate state for static ads.
    - *User Actions*: Select a static image creative.
    - *Assertions*: Video funnel chart displays warning: "Formato estático - sem dados de vídeo".
62. **TC-F5-07: Video Drop-off to Absolute Zero**
    - *Description*: Verify funnel rendering when views drop to zero.
    - *User Actions*: Mock creative with 25% views = 100, 50% views = 0.
    - *Assertions*: 50%, 75%, 95%, and 100% steps display `0` views and `0%` width without NaN errors.
63. **TC-F5-08: Complete 100% Retention**
    - *Description*: Verify funnel math when all views complete the video.
    - *User Actions*: Mock dataset where all steps have equal view counts.
    - *Assertions*: Every step displays `100%` retention.
64. **TC-F5-09: Video Play Count Exceeding Impressions**
    - *Description*: Verify funnel handles inconsistent API counts.
    - *User Actions*: Mock dataset where 25% views > impressions count (common with replays).
    - *Assertions*: Funnel caps the first step percentage at `100%` or displays raw values gracefully without rendering charts outside the container box.
65. **TC-F5-10: Negative Watch Time Input**
    - *Description*: Verify negative input values from corrupted API.
    - *User Actions*: Mock creative with negative watch count.
    - *Assertions*: Frontend displays `0` views, ignoring negative inputs.

### F6: Leads Spreadsheet & Thumbnails
66. **TC-F6-06: No Results Search Found**
    - *Description*: Verify spreadsheet behaves gracefully when search returns nothing.
    - *User Actions*: Type "NoMatchingQuery999" in the search box.
    - *Assertions*: Spreadsheet displays placeholder message: "Nenhum lead correspondente encontrado".
67. **TC-F6-07: Broken Image Lightbox Fallback**
    - *Description*: Verify image error handling in thumbnail preview.
    - *User Actions*: Hover over row with broken ad preview link.
    - *Assertions*: Lightbox displays placeholder "Imagem indisponível" icon instead of standard broken file icon.
68. **TC-F6-08: Special Characters/HTML Injection in Search**
    - *Description*: Verify search escapes regex and HTML.
    - *User Actions*: Type `<div>` or `[a-z]` in spreadsheet search input.
    - *Assertions*: Table filters safely without scripting execution or JavaScript syntax crashes.
69. **TC-F6-09: Empty Fields Rendering**
    - *Description*: Verify row formatting when columns are empty.
    - *User Actions*: Mock row with missing phone number and status.
    - *Assertions*: Table displays empty cell (`—` or blank) without page break.
70. **TC-F6-10: Pagination Extreme Boundary**
    - *Description*: Verify page selection buttons are disabled at bounds.
    - *User Actions*: Navigate to page 1.
    - *Assertions*: "Anterior" button is disabled; Navigate to last page -> "Próxima" button is disabled.

### F7: Event Pixel API Fetching
71. **TC-F7-06: Validation of Empty Pixel ID**
    - *Description*: Verify error when submitting blank Pixel ID.
    - *User Actions*: Leave Pixel input blank, click "Carregar Eventos Pixel".
    - *Assertions*: Input border glows red, and a message ("Insira um ID de Pixel válido") is shown.
72. **TC-F7-07: Invalid Non-Numeric Pixel ID**
    - *Description*: Verify error when submitting text Pixel ID.
    - *User Actions*: Input "PixelAgro" in ID field, click fetch.
    - *Assertions*: Error toast: "ID do Pixel precisa ser apenas números".
73. **TC-F7-08: Mocking API Timeout (504)**
    - *Description*: Verify handling of slow response.
    - *User Actions*: Mock `/api/pixel-events` to timeout.
    - *Assertions*: Loading state displays timeout message: "Tempo limite esgotado. Verifique a conexão com a Meta API".
74. **TC-F7-09: Mocking API Bad Request (400)**
    - *Description*: Verify handling of API validation errors.
    - *User Actions*: Mock `/api/pixel-events` with 400 Bad Request.
    - *Assertions*: UI displays specific error string returned by Meta (e.g. "Pixel inativo ou não cadastrado").
75. **TC-F7-10: Discrepancy Margin Extreme Bounds**
    - *Description*: Verify discrepancy math under extreme margins.
    - *User Actions*: Mock 0 Pixel Leads and 500 CRM Leads.
    - *Assertions*: Discrepancy shows as `100%` mismatch, highlighted with a high-priority warning label.

### F8: Claude & MCP AI Insights
76. **TC-F8-06: Unmapped Client AI Trigger Block**
    - *Description*: Verify AI insights cannot be run without Meta account.
    - *User Actions*: Select client "Tratores Connect" (unmapped), navigate to AI panel.
    - *Assertions*: "Gerar Insights" button is disabled, and banner instructs to map accounts.
77. **TC-F8-07: Claude API Overload (429 Rate Limit)**
    - *Description*: Verify error display under rate limit conditions.
    - *User Actions*: Mock `/api/ai/insights` response as HTTP 429.
    - *Assertions*: UI displays message: "Serviço ocupado no momento. Tente novamente em alguns minutos".
78. **TC-F8-08: Claude Response Formatting Crash**
    - *Description*: Verify formatting when Claude returns unstructured text.
    - *User Actions*: Mock Claude response with missing markdown indicators.
    - *Assertions*: UI renders text in a fallback container without breaking dashboard layout.
    - *Note*: Ensure the text remains readable.
79. **TC-F8-09: AI Panel Empty Spreadsheet Diagnostic**
    - *Description*: Verify AI output when client sheet has no data.
    - *User Actions*: Select client with empty spreadsheet, trigger AI insights.
    - *Assertions*: Diagnostic panel displays message: "Dados insuficientes no Google Sheets para diagnóstico de IA".
80. **TC-F8-10: MCP Server Process Crashing**
    - *Description*: Verify error handling when local MCP process dies.
    - *User Actions*: Mock backend MCP stdio subprocess to crash.
    - *Assertions*: Server logs error, and frontend displays: "Erro na integração com o servidor Meta MCP".

---

## Tier 3: Cross-Feature Combination Test Cases (8 Test Cases)
These verify complex interactions between two or more distinct features.

81. **TC-COM-01: Sidebar Collapsed Tab Resize (F1 + F2)**
    - *Features*: Sidebar menu toggle (F1), Tab view switching (F2).
    - *User Actions*: Collapse sidebar (F1), switch from Overview tab to Campaign tab (F2), expand sidebar (F1), switch back to Overview.
    - *Assertions*: Tabs display correctly; active indicators update; layouts adjust width dynamically.
82. **TC-COM-02: Tab Switch Spreadsheet State Retention (F2 + F6)**
    - *Features*: Tab view switching (F2), Leads spreadsheet & thumbnails (F6).
    - *User Actions*: Navigate to Leads tab (F2), paginate spreadsheet to Page 3 (F6), click Overview tab (F2), click Leads tab again.
    - *Assertions*: Leads table displays Page 3 (pagination state is preserved, not reset).
83. **TC-COM-03: Drag & Drop Comparison with PoP Metrics (F3 + F4)**
    - *Features*: Drag & drop comparison (F3), Period-over-Period variance (F4).
    - *User Actions*: Drag Campaign A and B to comparison slots (F3), toggle "Compara período anterior" (F4).
    - *Assertions*: Side-by-side comparison table displays current PoP percentage variance indicators for both items simultaneously.
84. **TC-COM-04: Creative Table Lightbox Video Funnel Shortcut (F5 + F6)**
    - *Features*: Video funnel charts (F5), Leads spreadsheet & thumbnails (F6).
    - *User Actions*: Open Leads tab, click ad thumbnail to open preview modal (F6), click "Diagnóstico de Funil de Vídeo" link in modal.
    - *Assertions*: Lightbox closes; page switches to Campaign tab; video funnel chart (F5) is pre-filtered for that creative.
85. **TC-COM-05: AI Chat Navigation Persistence (F2 + F8)**
    - *Features*: Tab view switching (F2), Claude & MCP AI Insights (F8).
    - *User Actions*: Trigger AI insights, type a question in chat (F8), switch to Overview tab (F2), return to AI Insights tab.
    - *Assertions*: Diagnostic report and the conversational chat history are fully preserved.
86. **TC-COM-06: Spreadsheet Filtering Tailors AI Prompt (F6 + F8)**
    - *Features*: Leads spreadsheet & thumbnails (F6), Claude & MCP AI Insights (F8).
    - *User Actions*: In Leads Spreadsheet, select platform filter "Instagram Only" (F6). Navigate to AI Insights, trigger diagnostic (F8).
    - *Assertions*: Outgoing API call payload contains lead summary restricted to Instagram data; returned AI output centers on Instagram insights.
87. **TC-COM-07: Spreadsheet Date Filter Syncs Pixel Discrepancy (F6 + F7)**
    - *Features*: Leads spreadsheet & thumbnails (F6), Event Pixel API fetching (F7).
    - *User Actions*: Select custom date filter in spreadsheet (F6), open Pixel tab, click fetch events (F7).
    - *Assertions*: Discrepancy margin card compares spreadsheet row count (F6) against pixel leads count (F7) for that exact date period.
88. **TC-COM-08: Sidebar Toggle Dynamic Dropzone Layout (F1 + F3)**
    - *Features*: Sidebar menu toggle (F1), Drag & drop comparison (F3).
    - *User Actions*: Open Campaign comparison view (F3), click Sidebar toggle button to collapse menu (F1).
    - *Assertions*: Side-by-side comparison slot columns expand horizontally, adapting without text wrapping or clipping.

---

## Tier 4: Real-World Workload Scenarios (5 Test Cases)
Complex, multi-step workflows representing actual business operations as defined in `TEST_INFRA.md`.

89. **TC-WRK-01: Full Client Onboard & Audit (F1, F2, F6, F7)**
    - *Features*: F1 Sidebar, F2 Tabs, F6 Leads table, F7 Pixel API.
    - *Workflow*:
      1. Log in via mock credentials.
      2. Click Sidebar hamburger (F1) and navigate to settings modal.
      3. Map a new client folder ("VM Equipamentos") to a Meta Ad Account ID, click Save.
      4. Navigate to Leads Spreadsheet tab (F2). Verify leads are parsed and populated (F6).
      5. Navigate to Pixel tab (F2), enter Pixel ID, fetch conversion data (F7).
    - *Assertions*: Mapping is written to filesystem (`mappings.json`); Leads list is populated; Pixel PageView and Lead counts fetch successfully.
90. **TC-WRK-02: Campaign Comparison & Budget Audit (F2, F3, F4, F8)**
    - *Features*: F2 Tabs, F3 Drag-and-drop comparison, F4 PoP variance, F8 Claude AI.
    - *Workflow*:
      1. Navigate to Campaign tab (F2).
      2. Set date picker to "Últimos 30 dias" and enable PoP variance comparison (F4).
      3. Drag the two highest CPL campaigns from the sidebar list into Slot A and Slot B (F3).
      4. Audit side-by-side CPA and Cost deltas.
      5. Switch to AI Insights tab (F2) and trigger Claude diagnostic (F8) to request budget reallocation options.
    - *Assertions*: PoP percentage badges render; side-by-side campaign comparative loads; Claude returns budget reallocation report.
91. **TC-WRK-03: Creative Performance Video Funnel Audit (F2, F5, F6, F8)**
    - *Features*: F2 Tabs, F5 Video funnel, F6 Leads table, F8 Claude AI.
    - *Workflow*:
      1. Navigate to Leads Spreadsheet (F2).
      2. Click on video creative thumbnails (F6) to verify visual preview lightbox loads.
      3. Close lightbox, switch to Campaign tab (F2), select the video creative to load its 5-step watch funnel (F5).
      4. Inspect drop-off rates at 50% and 75% steps.
      5. Navigate to AI Insights, trigger diagnostic with focus on "Criativos" (F8) to get copy improvements.
    - *Assertions*: Lightbox renders; video funnel SVG segments display correct retention counts; Claude returns specific hook suggestions.
92. **TC-WRK-04: Pixel Events Tracking Discrepancy Resolving (F2, F6, F7, F8)**
    - *Features*: F2 Tabs, F6 Leads table, F7 Pixel API, F8 Claude AI.
    - *Workflow*:
      1. Open Pixel Event tab (F2), trigger Meta Pixel Leads fetch (F7).
      2. Switch to Leads Spreadsheet (F2), filter by status "Lead" (F6).
      3. Compare sheet count against pixel leads count, noting a 25% discrepancy.
      4. Open AI Insights tab (F2).
      5. Ask Claude chat assistant: "Por que temos 25% mais leads no pixel do que na planilha de CRM no último mês?" (F8).
    - *Assertions*: Pixel metrics fetch is successful; spreadsheet filters correctly; Claude provides troubleshooting checklist (e.g. duplicated pixels, script loading issues).
93. **TC-WRK-05: Complete Workspace Navigation & Settings Recovery (F1, F2, F6)**
    - *Features*: F1 Sidebar, F2 Tabs, F6 Leads table.
    - *Workflow*:
      1. Log in to dashboard.
      2. Collapse sidebar (F1) to maximize layout, click through all tabs in sequence (Overview -> Campaigns -> Leads -> Pixel -> AI) (F2).
      3. Click Settings (F2), disconnect Google Drive. Assert that the client selection shows "Conexão pendente".
      4. Click Connect Google Drive in settings modal, authorize via mock OAuth, and map client folders.
      5. Close modal, verify that client selector is updated and Leads Spreadsheet is populated (F6).
    - *Assertions*: All tabs render without errors; Google connection status toggles to disconnected; mock OAuth reconnects successfully; client leads reload.
