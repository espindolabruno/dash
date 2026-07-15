# E2E Test Setup Investigation & Recommendations

## 1. Executive Summary
This report analyzes the backend (`server.js`) and frontend files (`index.html`, `agro.html`, `js/app.js`, `js/charts.js`) of the Connect Agro dashboard to define E2E testing infrastructure using Playwright. E2E tests can run seamlessly against the Node.js backend running in its built-in **Demo Mode**, which generates realistic local mock data without requiring external third-party API keys or OAuth authentication.

---

## 2. Codebase Analysis

### 2.1 Backend Server (`server.js`)
- **Technology**: Node.js and Express.
- **Port**: Default is `3000` (configurable via `process.env.PORT`).
- **Static File Serving**: Serves all static files from the root directory (`__dirname`).
- **Demo Mode**: Endpoints `/api/clients`, `/api/leads`, `/api/meta-insights`, and `/api/meta-accounts` support a `demo=true` query parameter. When active, they return locally generated mock data (using the `generateMockLeads` function and inline JSON structures).
- **OAuth Integrations**: Real data mode requires Google OAuth2 tokens (stored in `data/google_tokens.json`) and Meta Ads tokens (stored in `data/mappings.json` or `data/temp_meta_tokens.json`).

### 2.2 Frontend Files
- **General Dashboard (`index.html`)**:
  - Uses Vanilla JS (`js/app.js`, `js/charts.js`, and `js/mockData.js`).
  - Has two main screens: `#login-screen` (active by default, with custom credentials fields and a dedicated "Acessar Modo Demo" button) and `#dashboard-screen`.
  - Communicates with the backend using standard `fetch` API.
  - State starts in demo mode by default (`state.isDemoMode: true` in `js/app.js`).
- **Agro Sector Dashboard (`agro.html`)**:
  - A React application loaded and compiled in the browser via CDN Babel (`type="text/babel"`).
  - Uses React hooks, Recharts for rendering charts, and font-awesome for icons.
  - Includes date range filtering, clients list dropdown, and mock adapters.

---

## 3. Test execution against the Backend Server
To run E2E tests, the backend server must be active to serve static HTML, CSS, and JS assets and to handle API calls. 
- **Local Dev vs CI**: Locally, the developer can run the tests against an already running server. In a CI environment, the server must be started automatically prior to test suite execution and killed immediately after.
- **Playwright WebServer**: Playwright provides a built-in `webServer` option in its configuration file to spin up Node.js automatically.
- **Mocking Strategy**: Since the backend has a robust built-in demo mode, the test suite can target `http://localhost:3000` directly and bypass the login screen by clicking the "Acessar Modo Demo" (`#btn-login-demo`) button, or E2E tests can use Playwright's native `page.route()` to intercept API calls at the browser level for hermetic testing.

---

## 4. Proposed Directory Structure
Following the `TEST_INFRA.md` guidelines, E2E files should live in `tests/e2e` at the root.

```
Dash/
├── data/
├── js/
│   ├── app.js
│   ├── charts.js
│   └── mockData.js
├── tests/
│   ├── e2e/
│   │   ├── login.spec.js          # Tier 1 & 2: Login screen actions
│   │   ├── navigation.spec.js     # Tier 1 & 2: Menu toggling & tab switching
│   │   └── dashboard.spec.js      # Tier 1, 2, 3, 4: Filters, KPIs, & charts
│   └── fixtures/                  # Optional: JSON mock files for page.route()
├── agro.html
├── index.html
├── package.json
├── playwright.config.js           # Playwright E2E configuration file
└── server.js
```

---

## 5. Playwright Config Recommendation (`playwright.config.js`)
Create a `playwright.config.js` file in the project root:

```javascript
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
```

---

## 6. Recommended `package.json` Additions

### 6.1 DevDependencies
The following devDependencies should be installed:
- `@playwright/test`: The official test runner.
- `msw` (Optional): If Service Worker mock isolation is preferred over Playwright's native `page.route()` interception. Note that Playwright's `page.route` is recommended as it doesn't require injecting files (like `mockServiceWorker.js`) into the public directory of the application.

```json
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
```

### 6.2 NPM Scripts
Add the following commands to the `scripts` section in `package.json`:

```json
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
```

---

## 7. Mocks Strategy Comparison

| Strategy | Implementation Details | Pros | Cons |
|---|---|---|---|
| **Playwright `page.route` (Recommended)** | Uses native Playwright API (e.g. `page.route('/api/clients*', route => route.fulfill({ json: [...] }))`) | - No additional npm packages needed<br>- Highly performant and fast<br>- Configured directly inside tests/fixtures | - Mocks only apply during E2E test runs |
| **Backend Demo Mode** | Runs the real backend server but triggers endpoints with `?demo=true` | - Tests actual server routing & static asset delivery<br>- Minimal mocking logic setup | - Dependent on backend logic stability |
| **MSW (Mock Service Worker)** | Injects a Service Worker to intercept API requests at browser level | - Identical mocks can be reused for unit/component tests | - Requires initialization in public folder (`npx msw init .`) |
