# WorkTimeManager — Agent Conventions

## Vite, not CDN
All dependencies (Chart.js, TailwindCSS, Font Awesome) are npm imports, not CDN scripts. Never use `window.Chart`, `window.tailwind`, or similar. `storage.js` falls back to `localStorage` when `window.api` is unavailable.

## State flow
- DOM events call handlers in `app.js` (inside `createEventHandlers`)
- Handlers call managers (`sessionManager`, `configManager`, etc.)
- State mutations go through `store.setState()` → triggers subscribers
- UI reads state via `store.getState()` — never reads DOM for data

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
