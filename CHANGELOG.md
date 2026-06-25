# Changelog

## 2026-06-25 — Bug fixes & modularization

### Fixed
- **Stop after pause loses break session** — `stopSession()` now creates a break session (tags: rest) and updates accumulatedPauseTime before populating form fields.
- **Pause timer shows total rest instead of current piece** — Now defaults to current rest piece (starts at 0), clickable to toggle between "Current Rest" and "Total Rest".
- **Timer negative after pause/resume** — `accumulatedPauseTime` (ms) was subtracted from seconds in `updateTimerDisplay` and `saveSession`. Fixed both.

### Added
- **Today's total clickable toggle** — Click to switch between "Today's Work" (excluding breaks) and "Today's Total" (all sessions).
- **Rest time in session list** — `accumulatedPauseTimeSec` now visible in recent sessions and all sessions views.

### Changed
- **Commit workflow documented** — Global and project AGENTS.md now define when auto-commits are allowed (multi-step TDD tasks with user approval) and require changelog/TODO updates before any commit.
- **Charts not rendering in Vite** — Removed all `window.Chart` lookups (time, distribution, income charts). Chart.js is imported as ES module.
- **Edit/delete buttons unresponsive** — Added event delegation for `.edit-session` / `.delete-session` clicks.
- **Pause missing timer background** — `updateTimerDisplayEl` now sets `break-mode` class and "Paused" label when paused.
- **`window.api` undefined in browser** — `storage.js` falls back to `localStorage` when Electron IPC unavailable.
- **UI leftover braces** — Two extra `}` from removed `if (Chart)` blocks caused parse errors.

### Changed
- New entry point: `src/app/entry.js` wires all modules, replaces monolithic `src/main.js`.
- `index.html` updated to load from `entry.js`.
- `storage.js` now has localStorage fallback for browser dev mode.
- Removed stale `src/tmp/` directory.

## 2026-06-24 — Phase 5: Core business logic + Phase 7: Vite/npm

### Added
- `sessionManager.js` — session CRUD, tracker state machine, tag/dayType filtering
- `configManager.js` — config CRUD with version history
- `statsManager.js` — stats computation (daily, monthly, yearly, charts data)
- `constants.js` — CURRENT_SESSION_INIT, DEFAULT_TAGS, PRESET_TAGS
- `accessibility.js` — keyboard nav, focus trap, announcements
- `accessibility.test.js` — 9 tests

### Changed
- Replaced CDN TailwindCSS + Chart.js with Vite npm imports (postcss, chokidar, chart.js)
- `vite.config.js` — Vite 8 config targeting Electron renderer
- `vitest.config.js` — coverage thresholds, jsdom environment
- `eslint.config.js` — standard JS + Electron-aware rules

## 2026-06-23 — Phase 0–4: Foundation

### Added
- `calendarService.js` — Latvian holiday classification with 20 tests (98.8% coverage)
- `state.js` — flat pub/sub store (`createStore`)
- `storage.js` — Electron IPC persistence layer
- Vite + Vitest project tooling

### Changed
- Extracted business logic from monolithic `src/main.js` into modular managers
- Replaced `localStorage`-only persistence with Electron IPC (browser fallback kept)
