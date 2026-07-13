# WorkTimeManager

Electron + Vite time tracking app with session management, statistics, calendar integration, and Chart.js visualizations.

## Stack

- **Runtime:** Electron (main process) / Vite dev server (browser)
- **UI:** Vanilla JS, TailwindCSS, Chart.js
- **Persistence:** Electron IPC → JSON file, with `localStorage` fallback in browser mode
- **Testing:** Vitest (155+ tests, targeting 80%+ coverage)

## Features

- **Session tracking** — Start/stop/pause with real-time timer
- **Holiday & calendar integration** — Loads LV holidays from `resources/YYYY-holidays.json` via Electron IPC. Today-status banner shows holidays, memorial days, swapped workdays, and short days with emoji indicators and hover tooltips.
- **Statistics** — Daily/weekly/monthly/yearly stats with Chart.js visualizations
- **Data management** — Import/export JSON backups, session editing, tag system

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build to dist/
npm start          # Launch Electron app (requires npm run build first)
npm test           # Vitest run with coverage
npm run test:watch # Watch mode
npm run lint       # ESLint

# allow remote debugging for mcp
chromium --remote-debugging-port=9222 --user-data-dir=/tmp/chromium-devtools http://localhost:5173
```

## Release Builds

```bash
npm run build       # Build Vite frontend to dist/
npm run package     # Package into release-builds/
```

Output per platform:
- Linux: `release-builds/org.rusak.worktimemanager-linux-x64/org.rusak.worktimemanager`
- macOS: `release-builds/org.rusak.worktimemanager-darwin-x64/org.rusak.worktimemanager.app`
- Windows: `release-builds/org.rusak.worktimemanager-win32-x64/org.rusak.worktimemanager.exe`

### Adding holiday files after packaging

Each new year, add `<year>-holidays.json` to the app's user data directory, no repackaging needed:

| Platform | Path |
|----------|------|
| Linux | `~/.config/org.rusak.worktimemanager/<year>-holidays.json` |
| macOS | `~/Library/Application Support/org.rusak.worktimemanager/<year>-holidays.json` |
| Windows | `%APPDATA%/org.rusak.worktimemanager/<year>-holidays.json` |

The app checks this directory first, then falls back to the bundled `resources/` shipped with the release.

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
