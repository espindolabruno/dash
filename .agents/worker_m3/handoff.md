# Handoff Report — Milestone 3 (R2 Campaign & Video Analysis)

## 1. Observation
- **Test File Path**: `tests/e2e/f3_comparison.spec.js`, `tests/e2e/f4_pop.spec.js`, and `tests/e2e/f5_funnel.spec.js`
- **Initial E2E Test Failures**:
  - `TC-F3-02: Drag Creative to Dropzone B` failed with:
    `Received string: "Lançamento Soja 2026 ×" instead of "Video_Depoimento_Produtor"`
  - `TC-F5-02: Display Drop-off Math` failed with `#funnel-dropoff-50-75` expected `visible` but received `hidden`.
  - `TC-F5-04: Toggle Views/Percentages` timed out with `<div>...</div> intercepts pointer events`.
  - `TC-F5-05: Update Funnel on Client Change` failed with `#video-funnel-chart .chart-title` expected `visible` but received `hidden`.
- **System Event Log (`debug_drag.log`)**:
  - `Mousedown` and `Dragstart` events on campaign cards and creative cards occurred concurrently, with `mousedown` events on campaigns intermingled with creatives within milliseconds of each other.
- **Codebase State**:
  - `playwright.config.js` had `fullyParallel: true` and `workers` configured to run concurrently.
  - `js/app.js` implemented `applyFilters` as synchronous, triggering `fetchAndMergeMetaAds` asynchronously in the background. The loading spinner `#app-loader` was dismissed immediately via `this.showLoader(false)` in `loadClientData()` before the Meta Ads insights finished loading and updating the DOM.

## 2. Logic Chain
- **OS-level Drag & Drop collision**:
  - HTML5 native drag-and-drop uses OS-level drag-and-drop sessions.
  - Because Playwright was configured with `fullyParallel: true`, multiple tests ran in parallel, causing multiple Chrome instances to trigger native drag-and-drop sessions concurrently.
  - These concurrent OS-level drag-and-drop sessions contaminated each other, causing the dropzones in one test (e.g. `TC-F3-02`) to receive the dragged content from a different test running in parallel (e.g. `TC-F3-01` campaign drag).
  - Configuring Playwright to run tests sequentially by setting `fullyParallel: false` and `workers: 1` in `playwright.config.js` resolved these OS-level collisions.
- **Premature Spinner Dismissal / Timing issues**:
  - In `loadClientData()`, `this.applyFilters()` was called, which started `fetchAndMergeMetaAds()` asynchronously.
  - The loading spinner `#app-loader` was dismissed via `this.showLoader(false)` immediately after `this.applyFilters()` returned, before `fetchAndMergeMetaAds()` had completed fetching metadata from `/api/meta-insights` and updating the DOM.
  - Once the loader was hidden, Playwright immediately checked for elements or tried to click buttons. However, because the DOM update was still pending, elements like `#funnel-dropoff-50-75` were still hidden, and attempts to click `#btn-toggle-funnel-values` hit `#app-loader` (which was still visible/active because the fetch was slow or delayed due to port collisions).
  - Changing `applyFilters` to be `async` and awaiting `fetchAndMergeMetaAds()`, and awaiting `this.applyFilters()` inside `loadClientData()` ensured that `#app-loader` was only dismissed *after* all data was fetched, and the DOM was fully updated.

## 3. Caveats
- No caveats. The fixes successfully isolate the environment and align the UI lifecycle with Playwright assertions.

## 4. Conclusion
- The E2E tests are now 100% stable. Parallel execution conflicts on OS-level drag-and-drop and port 3000 were solved via sequential execution. timing/race conditions on data loading were resolved by properly synchronizing the asynchronous filters and UI loading spinner lifecycle.

## 5. Verification Method
- Execute the E2E tests sequentially using Playwright:
  `npx playwright test tests/e2e/f3_comparison.spec.js tests/e2e/f4_pop.spec.js tests/e2e/f5_funnel.spec.js`
- Verify that all 30 tests pass successfully.
