# 💧 Aman — Water Outage Tracking Web App (Morocco)

> Forked from a **hackathon-winning project (1st place 🏆)**.  
> This repository is an extended frontend implementation of the original prototype.

---

## 1. Product overview

**Aman** is a frontend-only web application for tracking water outages in Morocco in near real-time.

It was built for a hackathon/demo setting and provides:
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

## 2. What is implemented (cross-checked against `Aman_Features.pdf`)

| # | Feature | Status | Implementation |
|---|--------|--------|---------------|
| 01 | Mode sombre / clair | ❌ | Not implemented |
| 02 | Recherche dans la liste | ❌ | No search in list view |
| 03 | Bouton confirmer la panne | ⚠️ | Partial upvote-based confirmation |
| 04 | Traduction Darija | ❌ | Not implemented |
| 05 | Tri des signalements | ❌ | Not implemented |
| 06 | Filtres dans l'URL | ❌ | Store-only filters |
| 07 | Bannière d'alerte critique | ❌ | Not implemented |
| 08 | Suivi durée des pannes | ⚠️ | Partial (timeAgo only) |
| 09 | Signalement faux rapports | ✅ | Admin status update |
| 10 | Abonnement alertes | ❌ | Not implemented |
| 11 | Recherche quartier carte | ❌ | Not implemented |
| 12 | Rayon zone affectée | ❌ | Not implemented |
| 13 | Upload de photos | ❌ | Not implemented |
| 14 | Ticker temps réel | ❌ | Not implemented |
| 15 | Classement des villes | ❌ | Not implemented |
| 16 | Mini graphiques SVG | ❌ | Not implemented |
| 17 | FR / AR RTL | ❌ | Not implemented |
| 18 | Flux résolution pannes | ✅ | Resolve flow + undo window |
| 19 | Clustering marqueurs | ✅ | Leaflet markercluster |
| 20 | Panel admin sécurisé | ⚠️ | Demo-only local auth |
| 21 | Heatmap pannes | ✅ | Canvas heatmap layer |
| 22 | Simulation temps réel | ✅ | Synthetic event generator |
| 23 | Prédiction pannes | ✅ | Risk scoring model |
| 24 | Replay chronologique | ✅ | Timeline snapshot system |
| 25 | PWA / Offline support | ✅ | Service worker + cache |

---

## 3. Tech stack

- React 18 + Vite
- Leaflet + marker clustering
- date-fns
- PWA (service worker + manifest)
- No backend (frontend-only architecture)

---

## 4. Architecture

Global state managed via Context + useReducer (`store.jsx`).

### Core slices
- reports (main data source)
- filters (city/status)
- view (map/list/report/admin)
- simulation controls
- replay system
- admin session (client-side only)
- undo resolution state

### Flow
reports → filtering → map/list/admin views → derived stats → replay snapshots

---

## 5. Key features

### Map system
- Leaflet map rendering
- Clustered markers
- Severity-based visual encoding
- Risk-based popup details

### Heatmap
- Canvas-based weighted intensity layer
- Real-time toggle

### Timeline replay
- Time scrubbing
- Playback simulation of outage evolution

### Simulation engine
- Generates synthetic outage reports
- Simulates real-world variation

### Admin panel
- Moderate reports (resolve / false / duplicate)
- Edit and delete controls (demo only)

---

## 6. Offline / PWA

- Installable web app
- Service worker caching
- Local persistence via localStorage
- Offline fallback to last known state

---

## 7. Known limitations (hackathon prototype)

This is a frontend-only hackathon project.

- No backend or database
- No real authentication or role security
- Admin access is not secure (demo key only)
- All moderation is client-side and non-authoritative
- Simulation and prediction are synthetic models
- Offline storage is browser-based only

---

## 8. Project structure

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
