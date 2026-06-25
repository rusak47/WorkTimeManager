# WorkTimeManager — Agent Conventions

## Vite, not CDN
All dependencies (Chart.js, TailwindCSS, Font Awesome) are npm imports, not CDN scripts. Never use `window.Chart`, `window.tailwind`, or similar. `storage.js` falls back to `localStorage` when `window.api` is unavailable.

## Electron production mode
- `main.js:37` loads from `dist/index.html` (Vite build output), not `src/index.html`. Run `npm run build` before `npm start`.
- Dev mode: Electron picks up `VITE_DEV_SERVER_URL` env var set by `npm run dev`.
- Calendar JSON files live in `resources/` and are loaded via IPC (`window.api.loadCalendar`).

## State flow
- DOM events call handlers in `app.js` (inside `createEventHandlers`)
- Handlers call managers (`sessionManager`, `configManager`, etc.)
- State mutations go through `store.setState()` → triggers subscribers
- UI reads state via `store.getState()` — never reads DOM for data

## Today-status banner
- `#today-status` sits above the "Current Session" header in the tracker tab
- Priority: Holiday+Memoriam > Holiday > Memoriam-only > Swapped workday > Short day > User-marked Holiday > User-marked Vacation > hidden
- Display: emoji + name (no category text). Full info in `title` tooltip.
  - `🌿 Name` — holiday, `🕯️ Name` — memorial, `🔁 🌿 Name` — swapped holiday, `🔁 🔧` — swapped workday, `⚠️` — short day
- Calendar data via `calendarService.getDayInfo()` merges `resources/YYYY-holidays.json` with user `markedDays` overrides
- `calendarService` is injected via closure in `app.js`, not stored in the store

## Testing
- TDD: write test first, then implement. Target 80%+ coverage.
- All test files co-located: `src/app/*.test.js`, `src/storage/*.test.js`
- Run: `npm test`
- `accumulatedPauseTime` in tracker is in **milliseconds**. Convert to seconds with `/ 1000`.
- jsdom quirk: `<select>` options must exist in DOM before setting `.value`.

## File layout
- Business logic managers in `src/app/` (pure functions, no DOM)
- UI rendering in `src/app/uiManager.js` (DOM reads/writes, Chart.js)
- State in `src/app/state.js` (flat store, no deep merge)
- Persistence in `src/storage/storage.js`
- Entry point: `src/app/entry.js` (not `main.js`)

## Commands
```bash
npm test           # vitest run --coverage
npm run dev        # vite dev server
npm run build      # vite build
```
