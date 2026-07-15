## 2026-07-13T04:38:49Z
You are the teamwork_preview_worker.
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
1. Implement the expandable/collapsible glassmorphic sidebar layout and view-switching logic in index.html, js/app.js, styles.css, and agro.html.
2. Views to support:
   - Geral (default): Contains the KPI metrics cards grid, evolution timeline & platform charts (charts-row-1), devices chart, and conversion heatmap.
   - Campaign Analysis: Contains Top Campaigns bar chart, and the complete "Auditoria & Raio-X Meta Ads" section (explorer table, funnel SVG, Meta platforms pie chart).
   - Video Analysis: Contains a beautiful styled glassmorphic placeholder card/section for video retention curves, hold/hook rates, and other video metrics.
   - Leads Analysis: Contains the large "Desempenho de Criativos (Anúncios)" table (spreadsheet grid) and the "Ranking UTMs" selector and chart.
   - Event Analysis: Contains Google Drive & Meta Ads connection status cards, mock Pixel events timeline, and the log console.
3. CSS Styling:
   - index.html (styles.css): Append styles matching the Outfit neon blue/purple premium dark mode glassmorphic look. Use existing CSS variables (--panel-bg, --panel-border, --primary, --primary-glow, etc.).
   - agro.html: Add internal CSS inside the style block matching the Space Grotesk/Inter organic forest green & gold glassmorphic look.
4. Transitions and State:
   - js/app.js: Add state variables currentView ('view-geral') and isSidebarExpanded (false). Add switchView(viewId) method. Ensure on view switch, hidden class is toggled and window.dispatchEvent(new Event('resize')) is called after 100ms to force ApexCharts width recalculation. Bind click listeners to sidebar nav items and the toggle chevron button. Move the header's user profile details to the sidebar footer profile.
   - agro.html: Add React state hooks [activeView, setActiveView] (default 'view-geral') and [isSidebarExpanded, setIsSidebarExpanded] (default false). Render sidebar and conditional views. Force Recharts to mount/unmount cleanly. Update user profile display location.
5. Verify changes: run node server.js (or dev) and check syntax correctness. Ensure the file changes are complete and clean.

File paths:
- index.html: c:\Users\Bruno Espíndola\OneDrive\Documentos\Dash\index.html
- js/app.js: c:\Users\Bruno Espíndola\OneDrive\Documentos\Dash\js\app.js
- styles.css: c:\Users\Bruno Espíndola\OneDrive\Documentos\Dash\styles.css
- agro.html: c:\Users\Bruno Espíndola\OneDrive\Documentos\Dash\agro.html

Write a progress report when completed, specifying files modified, what was done, and confirm execution verification.
