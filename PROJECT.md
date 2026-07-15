# Project: Connect Agro Advanced Analytics Dashboard

## Architecture
- **Frontend Architecture**:
  - Dual-frontend setup:
    1. **General Dashboard (`index.html`)**: Vanilla JS (`js/app.js`, `js/charts.js`) with utility CSS styles (`styles.css`). Premium neon dark glassmorphism.
    2. **Agro Sector Dashboard (`agro.html`)**: React application in the browser (loaded via CDN Babel/React) using custom styles and internal CSS. Forest green and gold premium aesthetic.
- **Backend Architecture**:
  - Node.js Express server (`server.js`) serving static files and proxying calls to Google Drive/Sheets and Meta Graph APIs.
  - MCP integration layer: node subprocess running the Meta Ads MCP server over standard I/O (stdio transport).
- **Data Flow**:
  - *Lead Data*: Google Sheet -> Backend Parser (aliasing and normalizer) -> Frontend Table / Spreadsheet.
  - *Ad Insights*: Meta API / MCP Server -> Backend -> Frontend charts & comparison tables.
  - *AI Recommendations*: Frontend -> Backend (MCP client calls Claude, executes MCP tools) -> Frontend UI.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: E2E Test Suite Framework | Build E2E test runner, mock API handlers, and write Tier 1 feature coverage tests | none | DONE (Conv ID: 1f9b5d6c-58c6-4bd0-a0bb-e99201c92b74) |
| 2 | M2: R1 Sidebar navigation layout | Collapsible glassmorphic sidebar menu in index.html and agro.html | M1 | DONE (Conv ID: 1f9b5d6c-58c6-4bd0-a0bb-e99201c92b74) |
| 3 | M3: R2 Campaign & Video Analysis | Drag-and-drop comparison, video funnel charts, PoP variations, ID data linking | M2 | DONE (Conv ID: fab2f5b6-2411-41ac-88be-4470dc07f5fa) |
| 4 | M4: R3 Leads & Event Analysis | Leads spreadsheet with thumbnails, Meta Pixel event fetching & timeline view | M3 | DONE (Conv ID: e4f8c5d1-b1ad-45c4-89e7-b733687081c5) |
| 5 | M5: R4 AI Insights Claude + MCP | Backend MCP subprocess, Anthropic Messages API tool loop, Frontend AI insights panel | M4 | DONE (Conv ID: 6bc59494-0f05-4ec6-b89a-e8d8301d5c70) |
| 6 | M6: E2E Validation & Hardening | E2E validation of all tiers, Challenger adversarial testing, and Forensic Auditing | M5 | DONE (Conv ID: 9f30ed4e-eba7-429b-ad38-ad6c2aac002a) |

## Interface Contracts
### Client Browser ↔ Server (`server.js`)
- `GET /api/pixel-events`
  - Request: `?pixelId=<pixel_id>&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&demo=<true|false>`
  - Response: `[{ event: "PageView", count: 1200, date: "2026-07-01" }, { event: "Lead", count: 85, date: "2026-07-01" }]`
- `POST /api/ai/insights`
  - Request: `{ clientName: "AgroForte Sementes", dateRange: { since: "YYYY-MM-DD", until: "YYYY-MM-DD" } }`
  - Response: `{ analysis: "AI generated recommendations text..." }`
- `GET /api/adcreatives`
  - Request: `?accountId=<meta_account_id>&demo=<true|false>`
  - Response: `[{ ad_id: "ad_123", thumbnail_url: "url...", image_url: "url..." }]`

### Server (`server.js`) ↔ Meta Ads MCP Server
- Uses JSON-RPC 2.0 over standard I/O (stdio).
- Tools:
  - `get_campaign_performance(account_id, time_range)`
  - `get_adset_performance(account_id, time_range)`
  - `get_ad_performance(account_id, time_range)`
  - Arguments include `accessToken` mapped to the client account.

## Code Layout
- `index.html`: Main dashboard UI (Vanilla JS).
- `agro.html`: React-based dashboard UI (React).
- `styles.css`: CSS for vanilla dashboard.
- `js/app.js`: JavaScript for vanilla dashboard UI logic and state.
- `js/charts.js`: Chart drawing logic (ApexCharts) for vanilla dashboard.
- `js/mockData.js`: Mock data generator for general dashboard demo mode.
- `server.js`: Node Express backend.
- `data/mappings.json`: Persistent clients to ad accounts & drive mappings.
