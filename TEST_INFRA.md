# E2E Test Infra: Connect Agro Dashboard

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | F1: Sidebar menu toggle | R1. Navigation & Layout | 5 | 5 | ✓ |
| 2 | F2: Tab view switching | R1. Navigation & Layout | 5 | 5 | ✓ |
| 3 | F3: Drag & drop comparison | R2. Campaign & Video | 5 | 5 | ✓ |
| 4 | F4: Period-over-Period variance | R2. Campaign & Video | 5 | 5 | ✓ |
| 5 | F5: Video funnel charts | R2. Campaign & Video | 5 | 5 | ✓ |
| 6 | F6: Leads spreadsheet & thumbnails | R3. Leads & Event | 5 | 5 | ✓ |
| 7 | F7: Event Pixel API fetching | R3. Leads & Event | 5 | 5 | ✓ |
| 8 | F8: Claude & MCP AI Insights | R4. AI Insights | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**: Playwright E2E Test Suite.
- **Invocation**: `npx playwright test`
- **Pass/Fail Semantics**: Standard exit code 0 represents all tests pass, exit code 1 represents failures.
- **Directory Layout**:
  - Tests live in `tests/e2e/` (e.g., `tests/e2e/navigation.spec.js`, `tests/e2e/comparison.spec.js`, etc.).
  - Configuration file: `playwright.config.js`.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full client onboard & audit | F1, F2, F6, F7 | Medium |
| 2 | Campaign comparison and budget audit | F2, F3, F4, F8 | High |
| 3 | Creative performance video funnel audit | F2, F5, F6, F8 | High |
| 4 | Pixel events discrepancy resolving | F2, F6, F7, F8 | High |
| 5 | Complete workspace navigation & settings mapping | F1, F2, F6 | Medium |

## Coverage Thresholds
- Tier 1: 40 test cases (5 per feature, happy-path)
- Tier 2: 40 test cases (5 per feature, edges, empty state, max values, zero/negative, errors)
- Tier 3: 8 test cases (pairwise combination of features)
- Tier 4: 5 realistic application scenarios
- Total: 93 test cases minimum.
