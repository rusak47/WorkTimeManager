# Changelog

## Unreleased (2026-06-26)

### Fixed
- **June 22 swapped_day_off short-day propagation** — swapped_workday (June 27) now inherits `isShortDay` from the `swap_source` entry's `is_short_day` field. The holidays JSON was updated from `type: "pre_holiday_short"` to `type: "workday"` + `"is_short_day": true`; `normaliseEntry` now detects `is_short_day` generically on any entry type instead of relying on a dedicated `pre_holiday_short` type.

### Removed
- **`pre_holiday_short` type** — Replaced by `is_short_day: true` field on `workday` / `swapped_day_off` entries in holidays JSON. `normaliseEntry` `case 'pre_holiday_short'` removed; generic `if (entry.is_short_day)` handles all types.

## 2026-06-25 — Visual polish, tracked hours, holiday data loading

### Added
- **Calendar swapped day-off styling** — `.cal-swapped` class with amber coloring for light and dark themes.
- **Tracked work hours in calendar footer** — Shows actual tracked hours (excluding break sessions) alongside expected work hours. Footer also shows short-day deduction when applicable (e.g., `(1 short day −1h)`).

### Changed
- **`countWorkDays` returns object** — Now returns `{ workDays, shortDays }` instead of plain count. Total hours formula adjusted to account for short days: `(workDays - shortDays) * h + shortDays * (h - 1)`.
- **Holiday data fallback in dev mode** — `storage.loadCalendar()` fetches from Vite dev server `/resources/` when Electron IPC unavailable.

### Fixed
- **Tracked hours included break sessions** — Calendar footer now filters `isBreak` sessions when summing tracked work hours.
- **Vite dev server serves resources** — Added middleware to serve `/resources/*.json` during development.

## 2026-06-25 — Calendar visual polish

### Changed
- **Calendar cell size** — Reduced from `aspect-ratio: 1` to `min-height: 2.5rem` compact padding/font.
- **Calendar light theme** — Uses gray palette (`--lt-color-*` vars), weekend contrast fixed, dark-mode class bleed eliminated.
- **Smaller cell font** — Day headers shrunk to 0.75rem, cells to 0.8rem.
- **Event colors** — Distinct green (holiday), purple (vacation), pink (memoriam), yellow (short-day), blue (information).
- **Tooltip construction** — Now includes `name`, `note`, and `swapSource` with `—` separator.

### Fixed
- **Weekend numbers illegible in light theme** — Replaced `#f3f4f6` background with `--lt-100`, text `--lt-500`.
- **Dark background bleed from dark-mode classes** — Removed stale `.dark-mode` class bleed on `.cal-day` elements.
- **Swapped-day info absent from tooltip** — `swapSource` now included in tooltip.`

## 2026-06-25 — Calendar tab view + bug fixes & modularization

### Fixed
- **Stop after pause loses break session** — `stopSession()` now creates a break session (tags: rest) and updates accumulatedPauseTime before populating form fields.
- **Pause timer shows total rest instead of current piece** — Now defaults to current rest piece (starts at 0), clickable to toggle between "Current Rest" and "Total Rest".
- **Timer negative after pause/resume** — `accumulatedPauseTime` (ms) was subtracted from seconds in `updateTimerDisplay` and `saveSession`. Fixed both.
- **Edit session with breaks stores wrong duration** — `handleSessionFormSubmit` calculated duration as `endTime - startTime` without subtracting `accumulatedPauseTimeSec`, causing sessions with breaks to store total elapsed time instead of net work time.
- **README release build docs** — Added Linux standalone build instructions.
- **Release builds broken on Node v24** — `@electron/packager` 18.3.6 incompatible with Node 24; updated to 20.0.1. Holiday files now load from user data dir first with bundled fallback.

### Added
- **Calendar tab view** — Month grid with prev/next navigation, holiday (green), memoriam (pink), weekend (gray), vacation (purple), short-day (yellow) coloring, today ring, session-dot indicator, and graceful null-calendarService degradation. (TDD: 22 tests, 99% coverage)
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
