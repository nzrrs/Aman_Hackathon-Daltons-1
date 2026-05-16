# 💧 Aman — Water Outage Tracking Web App (Morocco)

## 1) Product overview

**Aman** is a frontend-only web application for tracking water outages in Morocco in near real-time.

It is designed for hackathon/demo usage and provides:
- A live outage map with clustered markers and optional heatmap
- A list view with filters and per-report actions
- A report submission flow
- Community-style outage resolution flow (with confirmation + short undo window)
- Admin moderation tools (client-side only)
- Simulation mode to generate realistic activity
- Timeline replay to scrub outage history
- Offline/PWA behavior with cached last-known data

> Important: there is **no backend/auth enforcement** for report truth or permissions. Actions like resolving/moderating are UI-level signals in this demo architecture.

---

## 2) What is implemented (cross-checked against `Aman_Features.pdf`)

### Feature-by-feature status (from the PDF list)

| # | Feature (PDF) | Status | How it is implemented |
|---|---|---|---|
| 01 | Mode sombre / clair | ❌ Not implemented | Single dark theme only (`src/index.css`). |
| 02 | Recherche dans la liste | ❌ Not implemented | No list search input in `ListView.jsx` (only admin search exists). |
| 03 | Bouton confirmer la panne | ⚠️ Partial | Upvote confirmation exists on `ReportCard.jsx`, but no per-user duplicate-prevention state. |
| 04 | Traduction Darija | ❌ Not implemented | No Darija translation table or toggle in report cards. |
| 05 | Tri des signalements | ❌ Not implemented | No explicit sort control UI in list view. |
| 06 | Filtres dans l'URL | ❌ Not implemented | Filters are store state only (`store.jsx`), not URL-synced. |
| 07 | Bannière d'alerte critique | ❌ Not implemented | No dedicated critical alert banner component. |
| 08 | Suivi durée des pannes | ⚠️ Partial | Relative time is shown (`timeAgo`), but no dedicated real-time duration column/threshold styling. |
| 09 | Signalement de faux rapports | ✅ Implemented | Admin can set status `false`; status propagates globally (`store.jsx`, `AdminPanel.jsx`, badges/map colors). |
| 10 | Abonnement aux alertes | ❌ Not implemented | No subscription modal/state count in UI. |
| 11 | Recherche quartier sur carte | ❌ Not implemented | No map search + flyTo control in `MapView.jsx`. |
| 12 | Rayon zone affectée | ❌ Not implemented | No severity-based circle overlays around markers. |
| 13 | Upload de photos | ❌ Not implemented | `ReportForm.jsx` has no file upload/preview/storage path. |
| 14 | Ticker temps réel | ❌ Not implemented | No ticker/feed strip component for recent events. |
| 15 | Classement des villes | ❌ Not implemented | No ranked city panel/sidebar. |
| 16 | Mini graphiques SVG | ❌ Not implemented | `StatsBar.jsx` shows numbers, not sparkline/trend SVGs. |
| 17 | Traduction FR / AR (RTL) | ❌ Not implemented | No i18n layer, language switch, or RTL layout handling. |
| 18 | Flux de résolution des pannes | ✅ Implemented | One-click resolve with confirmation modal (`ReportCard`, `AdminPanel`), centralized status update (`MARK_RESOLVED`), short undo window (`resolutionUndo`) and immediate propagation via global store. |
| 19 | Clustering des marqueurs | ✅ Implemented | `leaflet.markercluster` in `MapView.jsx`; severity-based cluster color from child marker severity (`createClusterIcon`). |
| 20 | Panel Admin sécurisé | ✅ Implemented (demo) | Client-side key flow in `Header.jsx` (`admin`) + session flag in localStorage; moderation UI in `AdminPanel.jsx`. |
| 21 | Heatmap des pannes | ✅ Implemented | Custom canvas heatmap layer (`HeatmapLayer.jsx`) with severity weighting and map interaction redraw scheduling; toggled from `FilterBar.jsx`. |
| 22 | Simulation temps réel | ✅ Implemented | Simulation controls in `Header.jsx`; generation/resolution logic in `simulation.js`; periodic dispatch loop in `store.jsx`. |
| 23 | Prédiction des pannes | ✅ Implemented | `computeRisk` in `store.jsx` computes risk score, recovery estimate, and explanatory reasons; surfaced in map popup/tooltip and report cards. |
| 24 | Replay chronologique | ✅ Implemented | Timeline controls in `TimelineReplay.jsx`; deterministic transition dataset and snapshots from `replay.js`; store-driven playback and cursor updates. |
| 25 | Support Hors-ligne / PWA | ✅ Implemented | SW caching strategy in `public/sw.js`, installable manifest in `public/manifest.webmanifest`, and runtime registration in `main.jsx`. |

### Additional implemented platform behavior

- Global city/status filters (`FilterBar.jsx` + derived store collections)
- Status-consistent map/list/admin rendering (`STATUS_CONFIG` + store-derived data)
- Local persistence of app state and last sync timestamp (`store.jsx`, `localStorage`)

---

## 3) Tech stack and runtime

- **React 18** + **Vite**
- **Leaflet** + **leaflet.markercluster**
- **date-fns** (French locale formatting)
- **No backend**, no database, no server auth
- PWA assets + service worker for offline shell/runtime caching

### Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

---

## 4) Architecture and state model

The app uses a **single global store** (`React Context + useReducer`) in `src/store.jsx`.

### Core state slices

- `reports`: source of truth for outage reports
- `filter`: `{ city, status }`
- `view`: `"map" | "list" | "report" | "admin"`
- `showHeatmap`
- `activeReport`
- `simulation` (`running`, `frequencySec`)
- `replay` (`isPlaying`, `speed`, `currentMs`, `windowDays`, `visible`)
- `admin.isAuthenticated` (demo-only local flag)
- `toast`
- `resolutionUndo` (short undo window for community resolution)

### Key actions in reducer

- Report lifecycle: `ADD_REPORT`, `PATCH_REPORT`, `UPDATE_STATUS`, `DELETE_REPORT`
- Community resolution: `MARK_RESOLVED`, `UNDO_RESOLUTION`, `CLEAR_RESOLUTION_UNDO`
- UX/control actions: `SET_FILTER`, `SET_VIEW`, `SET_ACTIVE`, `SET_SHOW_HEATMAP`
- Simulation/replay actions
- Admin session toggle actions

### Derived data pipeline

1. `reports` feed replay dataset (`buildReplayDataset`)
2. Snapshot extraction (`getReplaySnapshot`) for:
   - crisis/playable reports (`active`, `partial`)  
   - full status reports (includes resolved/moderated states)
3. Risk enrichment (`computeRisk`) per report
4. Filtered collections for:
   - `filteredReports` (map markers/status-aware)
   - `filteredHeatmapReports` (crisis-focused heatmap)
   - `filteredListReports` (list rendering)
5. `stats` aggregation for top dashboard bar

---

## 5) UI component responsibilities

### App shell

- **`src/App.jsx`**  
  Orchestrates the main layout: `Header`, `StatsBar`, `FilterBar`, `TimelineReplay`, view body, and `Toast`.

- **`src/main.jsx`**  
  Registers service worker in production; unregisters and clears caches in dev.

### Navigation and controls

- **`Header.jsx`**
  - App branding + live status badges
  - Online/offline indicator
  - PWA install prompt handling
  - Simulation controls (start/stop + frequency)
  - Replay visibility toggle
  - View navigation buttons
  - Admin unlock modal (key: `admin`, demo only)

- **`FilterBar.jsx`**
  - Global city and status filters
  - Heatmap toggle in map view
  - Undo button for recent community resolution window

### Main feature views

- **`MapView.jsx`**
  - Leaflet map init and tile layer
  - Marker cluster layer with severity-based cluster icon color
  - Popup/tooltip report details (risk score, recovery estimate, reasons)
  - Uses filtered store data + syncs active selection

- **`HeatmapLayer.jsx`**
  - Custom canvas weather-style heatmap layer
  - Severity-weighted intensity rendering
  - Handles map movement/zoom and efficient redraw scheduling

- **`ListView.jsx`**
  - Renders `filteredListReports`
  - Displays per-report cards and empty states

- **`ReportCard.jsx`**
  - Report presentation + risk details
  - Upvote action
  - “Mark resolved” action with confirmation modal
  - Community-resolved visual confirmation badge

- **`ReportForm.jsx`**
  - New report submission
  - Validation (city, neighborhood, description length, reporter name)
  - Status/severity selection
  - Auto-jittered coordinates near city center

- **`AdminPanel.jsx`**
  - Moderation console with search
  - Quick status actions (`resolved`, `false`, `duplicate`)
  - Edit flow for selected fields
  - Delete confirmation flow
  - Duplicate heuristics + long-active indicators

- **`TimelineReplay.jsx`**
  - Time window selection (1/7/14 days)
  - Play/pause, speed, scrubber
  - Replays status evolution snapshot over time

### Common utilities/components

- **`StatsBar.jsx`**: global metrics (active, partial, resolved, scheduled, affected cities)
- **`Toast.jsx`**: transient feedback messages
- **`AppModal.jsx`**: reusable modal infrastructure

---

## 6) Data modules

- **`src/data/seed.js`**
  - Seed reports
  - City coordinates, neighborhood lists
  - Status color/label config (`STATUS_CONFIG`)

- **`src/data/simulation.js`**
  - Generates realistic synthetic reports in Moroccan bounds
  - Chooses candidates for partial/resolved transitions

- **`src/data/replay.js`**
  - Builds deterministic transition timelines from current reports
  - Produces snapshots for a selected time cursor

---

## 7) Outage resolution workflow (community signal)

Current flow:
1. User clicks **“Marquer résolu”** on a report (list/admin).
2. Confirmation modal is shown.
3. Store dispatches `MARK_RESOLVED`:
   - sets `status = "resolved"`
   - adds `resolvedAt`
   - tags `resolvedBy = "community"`
4. UI updates immediately across map/list/stats/filters.
5. Short undo window is exposed via FilterBar (`resolutionUndo`).

This is intentionally frontend-trust-based; it is **not authoritative moderation**.

---

## 8) Offline/PWA behavior

- Service worker caches app shell + runtime requests in production.
- Last known state is persisted to localStorage (`aman-offline-cache-v1`).
- On reconnect/offline transitions, UI shows network mode and last sync label.
- Manifest enables installable standalone app experience.

---

## 9) Known demo limitations

- No backend, no user auth, no secure role enforcement.
- Admin “protection” is localStorage/session-key based and bypassable.
- Resolution/moderation actions are vulnerable to user error/malicious input.
- Replay and prediction are synthetic/model-based estimates, not operational truth.

---

## 10) Project structure (high-level)

```txt
src/
  App.jsx
  main.jsx
  store.jsx
  index.css
  data/
    seed.js
    simulation.js
    replay.js
  components/
    Header.jsx
    StatsBar.jsx
    FilterBar.jsx
    TimelineReplay.jsx
    MapView.jsx
    HeatmapLayer.jsx
    ListView.jsx
    ReportCard.jsx
    ReportForm.jsx
    AdminPanel.jsx
    AppModal.jsx
    Toast.jsx
public/
  sw.js
  manifest.webmanifest
```
