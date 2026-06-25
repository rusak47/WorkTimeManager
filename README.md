# WorkTimeManager

Electron + Vite time tracking app with session management, statistics, calendar integration, and Chart.js visualizations.

## Stack

- **Runtime:** Electron (main process) / Vite dev server (browser)
- **UI:** Vanilla JS, TailwindCSS, Chart.js
- **Persistence:** Electron IPC → JSON file, with `localStorage` fallback in browser mode
- **Testing:** Vitest (140+ tests, targeting 80%+ coverage)

## Commands

```bash
npm run dev        # Vite dev server on port 5173
npm run build      # Production build to dist/
npm test           # Vitest run with coverage
npm run test:watch # Watch mode
npm run lint       # ESLint
```

## Entry Points

- **Browser:** `src/index.html` → `src/app/entry.js`
- **Electron:** `main.js` → `preload.js` → renderer loads Vite build

## Project Structure

```
src/
├── app/              # Modular application code (state, managers, UI)
│   ├── entry.js      # Module wiring & init
│   ├── app.js        # Event handlers / orchestration
│   ├── uiManager.js  # DOM rendering, Chart.js
│   ├── sessionManager.js, configManager.js, statsManager.js
│   ├── state.js, constants.js, calendarService.js, accessibility.js
├── storage/          # Persistence (Electron IPC or localStorage)
├── js/               # Shared utilities
├── css/              # Styles
└── index.html
```

## Architecture

- **Unidirectional data flow:** DOM events → `app.js` handlers → `sessionManager`/etc → `store.setState` → `ui.render*`
- **State:** Flat pub/sub store (`state.js`). Modules read via `store.getState()`, write via `store.setState()`.
- **Persistence:** Automatic on every state mutation via `persistAndRender()` in `app.js`.
- **Chart.js:** Imported directly as ES module (not `window.Chart`).
