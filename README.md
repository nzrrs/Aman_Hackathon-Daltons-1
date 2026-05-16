# 💧 Aman
— Morocco Hackathon Base App

A real-time water outage tracker for Morocco. Built as the base app for a hackathon where each team implements one feature.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## What's built

| View | What it does |
|------|-------------|
| 🗺 Map | Interactive Morocco map with color-coded outage pins |
| 📋 List | Filterable list of all reports with upvote + status badges |
| ➕ Report | Form to submit a new outage (city, neighborhood, description) |
| 🧪 Simulation | Starts/stops realistic live activity and controls event frequency |
| ⏱ Timeline Replay | Scrub/play outage history with 1 day / 7 days / 14 days windows |
| 🛡 Admin Panel | Moderation console for status changes, false/duplicate marking, editing, and deletion |

## For hackathon organizers

- **FEATURES.md** — the list of 20 features, one per team
- **SETUP_PROMPT.md** — paste this into any AI to get setup instructions

## State management

All app state lives in `src/store.jsx` (React Context + useReducer).
Seed data is in `src/data/seed.js` — edit this to change initial reports.
Simulation generation logic is in `src/data/simulation.js`.
Timeline replay logic is in `src/data/replay.js`.

## Stack

- React 18 + Vite
- Leaflet (OpenStreetMap tiles, no API key needed)
- date-fns (French locale)
- No backend, no database, no auth

## Admin access model (demo only)

- Admin tools are behind a client-side key prompt (`admin`) and a temporary localStorage session flag.
- This is **not secure** for production use: it can be bypassed by inspecting frontend code or browser storage.
- It exists only to simulate restricted admin access in a frontend-only hackathon environment.
"# aman" 
