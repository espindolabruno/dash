# UI Architecture Analysis & Recommendations: Expandable/Collapsible Sidebar (R1)

## Executive Summary
This report analyzes the frontend architecture of the Connect Agro dashboard and provides a detailed layout, styling, and logic plan for implementing an expandable/collapsible sidebar menu (R1). 

The application currently has two separate entry points with different UI technologies and styling systems:
1. **General Dashboard (`index.html`)**: Built with vanilla JS (`js/app.js`, `js/charts.js`) and styled with utility/layout classes inside `styles.css`. It features a premium neon dark glassmorphism design (blue, purple, orange gradients, cyan highlights, backdrop filters).
2. **Agro Sector Dashboard (`agro.html`)**: Built as a React application running directly in the browser (using React, Babel Standalone, and Recharts CDN). It uses React inline styles mapping to a local config object (`COLORS`) combined with internal CSS inside a `<style>` block. It features an organic forest green and gold theme.

Currently, both dashboards use a top-down horizontal layout where a header occupies the top 100% width and all KPIs, graphs, explorer tables, heatmaps, and creative grids are stacked vertically on a single, long scrolling page. We propose refactoring this layout to support a vertical sidebar menu, which will structure the dashboard into clean, tabbed views.

---

## 1. Architectural & Layout Analysis

### Current Layout Structure
Currently, both screens are structured as follows:
```html
<!-- index.html structure -->
<div id="dashboard-screen" class="app-screen">
  <header class="main-header glass-panel">...</header>
  <main class="dashboard-content">...</main>
</div>
```
The content within `.dashboard-content` overflows vertically. Visual blocks include:
*   KPI Metrics grid
*   Lead Evolution line chart & Platform participation pie chart
*   Device share, UTM rankings, Top Campaigns charts
*   Auditoria & Raio-X Meta Ads section (Interactive Explorer & Funnel SVG)
*   Heatmap and Creative Performance Table with CSV export
*   Settings & real-time log viewer (currently in a modal overlay `#settings-modal`)

### Proposed Sidebar Layout Structure
To introduce a sidebar, we must change the layout of the dashboard from a vertical stack to a horizontal layout (sidebar on the left, main content on the right). 

The new layout for the `#dashboard-screen` container should be:
```html
<!-- Proposed index.html structure -->
<div id="dashboard-screen" class="app-screen dashboard-layout">
  <!-- 1. Collapsible Sidebar Menu -->
  <aside id="sidebar" class="sidebar collapsed glass-panel">
    <!-- Brand / Logo -->
    <div class="sidebar-header">
      <div class="header-logo">
        <i class="fa-solid fa-leaf brand-icon"></i>
        <span class="brand-name">Connect <span class="gradient-text font-bold">Agro</span></span>
      </div>
      <button id="btn-toggle-sidebar" class="sidebar-toggle-btn">
        <i class="fa-solid fa-chevron-right toggle-icon"></i>
      </button>
    </div>

    <!-- Navigation Items -->
    <nav class="sidebar-nav">
      <button class="nav-item active" data-view="view-overview">
        <i class="fa-solid fa-chart-pie nav-icon"></i>
        <span class="nav-text">Geral</span>
      </button>
      <button class="nav-item" data-view="view-meta-audit">
        <i class="fa-brands fa-facebook nav-icon"></i>
        <span class="nav-text">Auditoria Meta</span>
      </button>
      <button class="nav-item" data-view="view-creatives">
        <i class="fa-solid fa-images nav-icon"></i>
        <span class="nav-text">Criativos</span>
      </button>
      <button class="nav-item" data-view="view-settings">
        <i class="fa-solid fa-server nav-icon"></i>
        <span class="nav-text">VPS & Logs</span>
      </button>
    </nav>

    <!-- Sidebar Footer (Profile and Logout) -->
    <div class="sidebar-footer">
      <div class="user-profile">
        <img id="user-avatar" src="" alt="Avatar" class="avatar-img">
        <div class="user-details">
          <span id="user-name" class="user-name">Administrador</span>
          <span id="user-email" class="user-email">admin@connectagro...</span>
        </div>
      </div>
      <button id="btn-logout" class="action-btn btn-logout" title="Sair">
        <i class="fa-solid fa-right-from-bracket"></i>
      </button>
    </div>
  </aside>

  <!-- 2. Main Content Container -->
  <div class="main-container">
    <!-- Header (holds only client selection, date picker and quick link to agro) -->
    <header class="main-header glass-panel">
      <div class="header-left">
        <span id="demo-badge" class="badge-demo hidden">MODO DEMO</span>
      </div>
      <div class="header-center">
        <!-- Client Selector & Date Navigation Wrapper -->
      </div>
      <div class="header-right">
        <!-- Quick Switcher to Agro / General -->
        <a href="/agro.html" id="btn-goto-agro" class="action-btn" title="Dashboard Setor Agro">
          <i class="fa-solid fa-wheat-awn"></i>
        </a>
      </div>
    </header>

    <!-- Views Area -->
    <main class="dashboard-content">
      <!-- View 1: Overview / Geral -->
      <div id="view-overview" class="dashboard-view active">
        <!-- KPI Grid -->
        <!-- Evolution Timeline & Platform charts -->
        <!-- Device share chart & peaks heatmap -->
      </div>

      <!-- View 2: Auditoria Meta Ads -->
      <div id="view-meta-audit" class="dashboard-view hidden">
        <!-- Banner Account desvinculada -->
        <!-- Auditoria Meta sub-KPIs -->
        <!-- Explorer panel + funnel panel + Meta platforms chart -->
      </div>

      <!-- View 3: Desempenho de Criativos -->
      <div id="view-creatives" class="dashboard-view hidden">
        <!-- Top campaigns + UTM rankings -->
        <!-- Creative performance table -->
      </div>

      <!-- View 4: VPS Control Panel & Logs -->
      <div id="view-settings" class="dashboard-view hidden">
        <!-- Google Drive connection card -->
        <!-- Meta connection status card -->
        <!-- Real-time Console Log logs-console-container -->
      </div>
    </main>
  </div>
</div>
```

---

## 2. Dark Mode Glassmorphism Styling (R1)

To integrate perfectly with the premium dark glassmorphic look, we must construct CSS styles that preserve the backdrop blur, translucent shadows, and glow borders, while adjusting variables for the two themes.

### Theme A: Neon Blue & Violet Theme (`styles.css` for `index.html`)
The sidebar styles should be appended to `styles.css`. They use the CSS variables defined in `:root` (`--panel-bg`, `--panel-border`, `--primary`, `--accent-1`, `--transition-smooth`, etc.).

```css
/* Sidebar Layout Container */
.dashboard-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.main-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Sidebar Structure */
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: rgba(18, 22, 38, 0.65); /* Translucent panel background */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: none;
  border-right: 1px solid var(--panel-border);
  border-radius: 0; /* Reset border radius to fill screen edge */
  width: 80px; /* Collapsed width */
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  flex-shrink: 0;
  box-shadow: 10px 0 30px -10px rgba(0, 0, 0, 0.5);
}

.sidebar.expanded {
  width: 260px; /* Expanded width */
}

/* Sidebar Header / Toggle Button */
.sidebar-header {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.sidebar-header .brand-name {
  font-family: var(--font-main);
  font-size: 1.25rem;
  font-weight: 800;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  pointer-events: none;
}

.sidebar.expanded .brand-name {
  opacity: 1;
  pointer-events: auto;
}

.sidebar-toggle-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-smooth);
}

.sidebar-toggle-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(0, 242, 254, 0.08);
  box-shadow: 0 0 10px rgba(0, 242, 254, 0.2);
}

.sidebar.expanded .toggle-icon {
  transform: rotate(180deg); /* Flips chevron left/right */
}

/* Navigation Items */
.sidebar-nav {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 14px;
  background: transparent;
  border: none;
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  text-decoration: none;
  transition: var(--transition-smooth);
  overflow: hidden;
  position: relative;
}

.nav-item .nav-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  transition: var(--transition-smooth);
}

.nav-item .nav-text {
  font-family: var(--font-main);
  font-size: 0.95rem;
  font-weight: 500;
  margin-left: 16px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

.sidebar.expanded .nav-text {
  opacity: 1;
}

/* Nav Item Hover & Active States */
.nav-item:hover {
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-main);
}

.nav-item.active {
  background: rgba(0, 242, 254, 0.06);
  color: var(--primary);
  font-weight: 600;
  box-shadow: inset 0 0 12px rgba(0, 242, 254, 0.05);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 15%;
  height: 70%;
  width: 3px;
  background: var(--primary-gradient);
  border-radius: 0 4px 4px 0;
  box-shadow: 0 0 10px var(--primary-glow);
}

.nav-item.active .nav-icon {
  color: var(--primary);
  filter: drop-shadow(0 0 5px var(--primary-glow));
}

/* Sidebar Footer & Profile */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.sidebar-footer .user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  background: transparent;
  border: none;
  padding: 0;
}

.sidebar-footer .user-details {
  display: flex;
  flex-direction: column;
  opacity: 0;
  width: 0;
  transition: opacity 0.2s ease-in-out;
  overflow: hidden;
}

.sidebar.expanded .user-details {
  opacity: 1;
  width: auto;
}

.sidebar-footer .btn-logout {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: rgba(244, 63, 94, 0.04);
  border: 1px solid rgba(244, 63, 94, 0.1);
  color: var(--error);
}

.sidebar-footer .btn-logout:hover {
  background: rgba(244, 63, 94, 0.1);
  border-color: var(--error);
  box-shadow: 0 0 10px rgba(244, 63, 94, 0.2);
}

/* Hide Logout Text when collapsed */
.sidebar:not(.expanded) .btn-logout span {
  display: none;
}
```

### Theme B: Forest Green & Gold Theme (`agro.html`)
For the React Agro dashboard, the styling should align with the green and gold design. In React, we define classes inside the `<style>` block of `agro.html` to handle the grid, transitions, and indicators:

```css
/* Append inside <style> of agro.html */
.dashboard-layout-react {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #12201A;
}

.main-container-react {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-react {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1B2B22; /* COLORS.surface */
  border-right: 1px solid rgba(243, 241, 231, 0.10); /* COLORS.border */
  width: 80px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  flex-shrink: 0;
}

.sidebar-react.expanded {
  width: 260px;
}

.sidebar-react-header {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid rgba(243, 241, 231, 0.06);
}

.sidebar-react-toggle-btn {
  background: #24382C; /* COLORS.surfaceHi */
  border: 1px solid rgba(243, 241, 231, 0.10);
  color: #AFBBAA; /* COLORS.textSoft */
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.sidebar-react-toggle-btn:hover {
  border-color: #D8A73D; /* COLORS.gold */
  color: #F3F1E7; /* COLORS.text */
  background: rgba(216, 167, 61, 0.08);
}

.sidebar-react-nav {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px 12px;
}

.react-nav-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 14px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: #AFBBAA; /* COLORS.textSoft */
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  text-align: left;
}

.react-nav-item:hover {
  background: rgba(243, 241, 231, 0.03);
  color: #F3F1E7;
}

.react-nav-item.active {
  background: rgba(216, 167, 61, 0.06);
  color: #D8A73D; /* COLORS.gold */
  font-weight: 600;
}

.react-nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 15%;
  height: 70%;
  width: 3px;
  background: #D8A73D; /* COLORS.gold */
  border-radius: 0 4px 4px 0;
  box-shadow: 0 0 10px rgba(218, 167, 61, 0.4);
}

.react-nav-item.active i {
  color: #D8A73D;
}
```

---

## 3. View-Switching Architecture

### A. Vanilla JavaScript Implementation (`index.html` + `js/app.js`)
In the vanilla JS implementation, the active screen is toggled by changing classes.

#### Step 1: Update App State
Add `currentView` to `App.state` in `js/app.js`:
```javascript
state: {
  // ... existing states
  currentView: 'view-overview',
  isSidebarExpanded: false,
}
```

#### Step 2: Establish `switchView` Logic
Add the `switchView` method to the `App` object:
```javascript
switchView: function(viewId) {
  // 1. Hide all views
  document.querySelectorAll('.dashboard-view').forEach(view => {
    view.classList.add('hidden');
    view.classList.remove('active');
  });

  // 2. Show target view
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.remove('hidden');
    targetView.classList.add('active');
  }

  // 3. Update Nav Button active classes
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.dataset.view === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // 4. Update state
  this.state.currentView = viewId;
  this.log('INFO', 'Navigation', `Visualização alterada para o módulo: '${viewId}'.`);

  // 5. CRITICAL FIX: Trigger ApexCharts render adjustments
  // ApexCharts rendering inside hidden containers results in 0px widths.
  // Dispatching a window resize event forces visible charts to redraw correctly.
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 100);
}
```

#### Step 3: Event Listeners Setup
Inside `App.setupEventListeners()`, wire up the navigation and sidebar toggles:
```javascript
// Sidebar Toggle Event
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('btn-toggle-sidebar');
if (toggleBtn && sidebar) {
  toggleBtn.addEventListener('click', () => {
    this.state.isSidebarExpanded = !this.state.isSidebarExpanded;
    if (this.state.isSidebarExpanded) {
      sidebar.classList.add('expanded');
      sidebar.classList.remove('collapsed');
    } else {
      sidebar.classList.remove('expanded');
      sidebar.classList.add('collapsed');
    }
    // Dispatch resize to adjust charts when width transitions
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  });
}

// Navigation View Switcher Event
const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (btn) {
      const viewId = btn.dataset.view;
      this.switchView(viewId);
    }
  });
});
```

---

### B. React Implementation (`agro.html`)
In the React application inside `agro.html`, view switching is controlled via state variables, which conditionally mount components. This avoids DOM manipulation and naturally resets Recharts containers.

#### Step 1: Initialize States inside the React `Dashboard` Component
```javascript
function Dashboard() {
  const [activeView, setActiveView] = useState('view-overview'); // view-overview, view-meta-audit, view-creatives, view-settings
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  
  // ... existing state definitions
```

#### Step 2: Render Sidebar and Layout JSX
In the return statement of the `Dashboard` component, wrap the dashboard in the flexbox container and render the sidebar:

```jsx
return (
  <div className="dashboard-layout-react">
    {/* Sidebar Container */}
    <aside className={`sidebar-react ${isSidebarExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-react-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <i className="fa-solid fa-wheat-awn" style={{ color: COLORS.gold, fontSize: 20 }}></i>
          {isSidebarExpanded && (
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: COLORS.text, whiteSpace: 'nowrap' }}>
              Connect <span style={{ color: COLORS.gold }}>Agro</span>
            </span>
          )}
        </div>
        <button className="sidebar-react-toggle-btn" onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}>
          <i className={`fa-solid fa-chevron-${isSidebarExpanded ? 'left' : 'right'}`}></i>
        </button>
      </div>

      <nav className="sidebar-react-nav">
        <button 
          className={`react-nav-item ${activeView === 'view-overview' ? 'active' : ''}`} 
          onClick={() => setActiveView('view-overview')}
        >
          <i className="fa-solid fa-chart-pie"></i>
          {isSidebarExpanded && <span style={{ marginLeft: 14 }}>Geral</span>}
        </button>
        
        <button 
          className={`react-nav-item ${activeView === 'view-meta-audit' ? 'active' : ''}`} 
          onClick={() => setActiveView('view-meta-audit')}
        >
          <i className="fa-brands fa-facebook"></i>
          {isSidebarExpanded && <span style={{ marginLeft: 14 }}>Auditoria Meta</span>}
        </button>

        <button 
          className={`react-nav-item ${activeView === 'view-creatives' ? 'active' : ''}`} 
          onClick={() => setActiveView('view-creatives')}
        >
          <i className="fa-solid fa-images"></i>
          {isSidebarExpanded && <span style={{ marginLeft: 14 }}>Criativos</span>}
        </button>

        <button 
          className={`react-nav-item ${activeView === 'view-settings' ? 'active' : ''}`} 
          onClick={() => setActiveView('view-settings')}
        >
          <i className="fa-solid fa-server"></i>
          {isSidebarExpanded && <span style={{ marginLeft: 14 }}>Configurações</span>}
        </button>
      </nav>

      {/* Footer Profile & Logout */}
      <div style={{ padding: 16, borderTop: '1px solid rgba(243, 241, 231, 0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80" alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${COLORS.gold}` }} />
          {isSidebarExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap' }}>Demo User</span>
              <span style={{ fontSize: 10, color: COLORS.textSoft, whiteSpace: 'nowrap' }}>demo@connectagro...</span>
            </div>
          )}
        </div>
        <button 
          onClick={handleLogout} 
          style={{ width: '100%', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          {isSidebarExpanded && <span>Sair</span>}
        </button>
      </div>
    </aside>

    {/* Main Container */}
    <div className="main-container-react">
      {/* Header element (same, but remove user profile from it) */}
      <div className="rows-bg" style={{ padding: '20px 22px', borderRadius: 14, border: `1px solid ${COLORS.border}`, margin: '28px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        {/* Title & Client Select & Date picker elements (Global) */}
      </div>

      {/* Conditionally Render Active View */}
      <div style={{ padding: '24px', flexGrow: 1 }}>
        {activeView === 'view-overview' && (
          <div className="animate-fade-in">
            {/* 1. KPIs */}
            {/* 2. Platform BarChart, Device PieChart */}
            {/* 3. Peaks Heatmap, Trend lines */}
          </div>
        )}

        {activeView === 'view-meta-audit' && (
          <div className="animate-fade-in">
            {/* 1. Meta Ads desvinculado warning banner */}
            {/* 2. Funil de vendas (WhatsApp clicks -> convertidos) */}
            {/* 3. Auditoria explorer grid */}
          </div>
        )}

        {activeView === 'view-creatives' && (
          <div className="animate-fade-in">
            {/* 1. Top Campaigns list */}
            {/* 2. Detailed Creative performance grid & export buttons */}
          </div>
        )}

        {activeView === 'view-settings' && (
          <div className="animate-fade-in">
            {/* 1. Google Drive Integration connection controls */}
            {/* 2. Meta accounts OAuth configurations */}
            {/* 3. Log console viewer */}
          </div>
        )}
      </div>
    </div>
  </div>
);
```

---

## 4. Key Implementation Details & Edge Cases

1.  **ApexCharts Width Recalculation (Vanilla JS)**:
    As stated in section 3A, ApexCharts cannot calculate correct container widths if they are rendered inside `display: none` containers. Dispatching `window.dispatchEvent(new Event('resize'))` immediately after toggling the `.hidden` class resolves this issue.
2.  **Date and Client Filters persistence**:
    The date navigation controls and client select remain in the global header (not in individual views) because they are designed to filter the *entire dataset* across all views. If a user switches from "Overview" to "Creatives", the selected date range and client must persist. Keeping these variables in the global header guarantees consistent behavior.
3.  **Active Tab State preservation inside Views**:
    For the "Auditoria Meta" explorer table, the active tab state (`explorerLevel`: 'campaign' / 'adset' / 'creative') should be maintained in `App.state` so that switching views does not reset their explorer context.
4.  **Mobile Support (Off-Canvas Drawer)**:
    On screens below `768px`, the sidebar should fold completely to `0px` and be toggled via a hamburger button in the global header. A `.sidebar-backdrop` overlay class can be added to cover the dashboard content when the menu is open on mobile.
