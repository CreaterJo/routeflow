# RouteFlow

React 19 + Vite single-page application (SPA) for delivery route optimization. Fully local (no cloud/Supabase dependencies).

## Commands
- `npm run dev` — Start Vite dev server
- `npm run build` — Build production bundle
- `npm run lint` — Run Oxlint
- `npm run preview` — Preview production build

## Architecture
- Client-side routing, geocoding (Nominatim/Photon), and TSP optimization (Nearest Neighbor + 2-opt) in `src/lib/routing.js`.
- State persistence via `localStorage`.

## Reliable File Editing
- Always read the latest file contents before editing.
- Never assume previously read file contents are still current.
- When an exact string replacement fails, reread the file.
- Check whitespace, indentation and line endings.
- Do not repeatedly retry the same failed replacement.
- Prefer precise, context-aware edits over large string replacements.
- For larger changes, rewrite the complete affected function or component.
- Verify every change after editing.
- Never claim a change was successful unless it was verified.
