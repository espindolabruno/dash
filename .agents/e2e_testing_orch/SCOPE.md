# Scope: E2E Testing Track

## Architecture
- **Test Runner**: Playwright E2E Test Suite.
- **Directory Layout**:
  - Tests: `tests/e2e/` (e.g. `tests/e2e/navigation.spec.js`, `tests/e2e/dashboard.spec.js`, etc.)
  - Config: `playwright.config.js`
- **Mocks Integration**:
  - Express Server: Integrates Mock Service Worker (MSW) or custom endpoint interception when `NODE_ENV=test` to stub Google Sheets and Meta Ads REST APIs.
  - Subprocess MCP: Custom mock stdio script (`mock-meta-ads-mcp.js` or equivalent) intercepts JSON-RPC calls.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Framework & Mocks | Setup Playwright, MSW / custom mock server, mock MCP subprocess, and directory structure. Verify server runs in test mode. | none | DONE |
| 2 | M2: Tiers 1 & 2 Tests | Implement Tier 1 (40 happy-path tests) and Tier 2 (40 boundary/corner tests) for F1-F8. | M1 | IN_PROGRESS |
| 3 | M3: Tiers 3 & 4 Tests | Implement Tier 3 (8 cross-feature combinations) and Tier 4 (5 real-world workloads). | M2 | PLANNED |
| 4 | M4: Execution & Publication | Execute all 93 tests, resolve failures, publish TEST_READY.md, and send handoff message to parent. | M3 | PLANNED |

## Interface Contracts
- Tests must execute fully offline via `npx playwright test`.
- All tests must pass with exit code 0.
