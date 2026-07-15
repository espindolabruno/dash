# Scope: Milestone 2 (M2) - R1 Sidebar navigation layout

## Architecture
- **index.html & js/app.js**: Refactor the vanilla layout of `#dashboard-screen` into a horizontal layout with an expandable/collapsible sidebar menu. Create 5 content views: Geral, Campaign Analysis, Video Analysis, Leads Analysis, Event Analysis, showing/hiding them via vanilla class toggles and state transitions. Maintain filter state across view changes and trigger resize event for ApexCharts redrawing.
- **agro.html**: Refactor the React application's visual tree to place the sidebar layout. Bind view switching to state variable toggles, mounting and unmounting the corresponding section components (Geral, Campaign Analysis, Video Analysis, Leads Analysis, Event Analysis) and updating standard styles.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M2.1: Sidebar CSS & Layout Refactoring | Implement responsive glassmorphic sidebars and layout containers in index.html/styles.css and agro.html | none | PLANNED |
| 2 | M2.2: Vanilla state & View-switching logic | Implement view switching in js/app.js for index.html | M2.1 | PLANNED |
| 3 | M2.3: React state & View-switching logic | Implement React-based view switching and styles in agro.html | M2.1 | PLANNED |

## Interface Contracts
- Navigation selectors: `data-view` attribute on nav buttons mapping to corresponding view IDs.
- State fields: `App.state.currentView`, `App.state.isSidebarExpanded`.
