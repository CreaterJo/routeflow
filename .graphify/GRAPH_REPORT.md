# Graph Report - RouteFlow (2026-08-31)

## Summary
- 27 nodes · 35 edges · density 0.0997 · avg degree 2.59
- Extraction: AST + semantic merged
- Token cost: 0 input · 0 output

## Top Hubs
1. `haversine()` — distance helper, degree 4
2. `nearestNeighbor2Opt()` — TSP optimizer, degree 4
3. `parseExcel()` — Excel parser (A/B variants), degree 4
4. `Liefern.md` — Vault project note, degree 3
5. `edgeDist()` — edge distance, degree 3

## Architecture
- **Frontend**: `src/App.jsx` → `src/main.jsx` (React 19 + Vite + PWA)
- **Core**: `src/lib/routing.js` (Excel parse → Geocode → TSP → OSRM)
- **Backend**: `src/lib/supabase.js` (Cloud storage)
- **Config**: `vite.config.js` (Workbox PWA), `package.json` (deps)
- **Docs**: `SUPABASE-SETUP.md`, `README.md`, `vault:Liefern.md`

## Key Relationships
- `main.jsx` → `App.jsx` (renders)
- `App.jsx` → `routing.js`, `supabase.js` (imports)
- `routing.js` → `package.json` (dependencies)
- `Liefern.md` → `App.jsx`, `routing.js`, `SUPABASE-SETUP.md` (describes/references)
