# Changelog

## Unreleased (2026-07-04)

### Added
- **Tag Bucket System — Phase 2: Settings Tree View & Drag-and-Drop** — Interactive tag bucket management in settings tab. See `tasks/pending/20260704-tag-bucket-p2-settings-dnd.md`.
  - Tree view: buckets displayed as collapsible groups with ▼/▶ expand/collapse toggle
  - Native HTML5 DnD: drag subtags between buckets with dashed highlight on drag-over
  - Ctrl+drag: duplicate subtag into another bucket (keeps source copy); green outline visual indicator
  - Remove (X) button: removes subtag from individual bucket without affecting other buckets
  - Empty bucket placeholder: shows "(no subtags)" when bucket has no assigned subtags
  - New `tagManager.js` functions: `moveSubtagBetweenBuckets()`, `removeTagFromBucket()`
  - `setOnTagBucketsChange()` callback wired to `saveState()` for persistence
- **Tag Bucket System — Phase 1: Data Model & Backward Compatibility** — Introduced tag hierarchy where default tags act as top-level buckets with assigned subtags. See `tasks/done/2026-07-04-tag-bucket-p1-data-model.md`.
  - `DEFAULT_TAGS` expanded from `[work, rest]` to `[work, rest, study, sport, other]`
  - `DEFAULT_BUCKET_MAP` replaces `PRESET_TAGS` with 5 buckets and their subtag arrays
  - `PRESET_TAGS` removed; bootstrapping derives from `DEFAULT_BUCKET_MAP` via deduped `Set` of all subtag names
  - `tagBuckets` in `INITIAL_STATE`, persisted to storage, restored on load, seeded from `DEFAULT_BUCKET_MAP` when empty
  - `resolveSessionBucket()` infers bucket from `session.tags` for legacy sessions with no stored bucket
  - New `tagManager.js` with `getSubtagsForBucket`, `getAvailableBuckets`, `getParentBuckets`, `getUnassignedTags`
  - Tags settings UI grouped by bucket (`#tag-bucket-settings`) replacing 3 separate containers
  - Custom tags auto-assigned to `tagBuckets.other`; delete removes from all bucket arrays
  - Full test coverage — `tagManager.js` and `constants.js` at 100%

## Unreleased (2026-06-27)

### Fixed
- **Calendar legend swatches synced to cell styling** — holiday/swapped legend swatches updated to `#fce5dc` (were `#dcfce7`). Memoriam legend swatches changed to border-only with transparent background to match cell style (were solid `#fce7f3`). Dark theme memoriam legend also fixed to border-only. All other legend colors audited and consistent.

## Unreleased (2026-06-26)

### Changed
- **Tracker UI fluid layout** — action buttons and timer cards now scale responsively. Buttons collapse to icon-only below 640px. Timer value text uses `clamp()` for smooth sizing across viewport widths. Cards stay in 3-column row down to 500px before stacking vertically. When stacked, cards shrink to fit content with uniform width. Removed redundant subtitle and "Current Session" heading. (branch `tracker-ui-timer-control-display-size-fluid-fix`, per `tasks/done/2026-06-26-fluid-timer-controls.md`)

### Fixed
- **Pause/Resume button text visible on narrow screens** — JS-set innerHTML now wraps label in responsive `hidden sm:inline` span, matching the template buttons. (branch `tracker-ui-timer-control-display-size-fluid-fix`)

### Added
- **WIP: Grid/list toggle for Recent Sessions** — toggle button in the header switches between full-width list cards and a compact multi-column grid (2-3 columns depending on viewport). Grid mode hides notes, uses smaller padding, and stacks info vertically. (branch `tracker-ui-recent-sessions-grid-list-layout`)
- **Crash auto-backup** — running session state is periodically persisted (default 5 min, configurable in Settings → Backup) to the existing storage file. On startup, a running session is restored if less than 24h old; stale backups are silently discarded. A recovery banner is shown on restored sessions. (branch `crash-auto-backup`)

### Fixed
- **June 22 swapped_day_off short-day propagation** — swapped_workday (June 27) now inherits `isShortDay` from the `swap_source` entry's `is_short_day` field. The holidays JSON was updated from `type: "pre_holiday_short"` to `type: "workday"` + `"is_short_day": true`; `normaliseEntry` now detects `is_short_day` generically on any entry type instead of relying on a dedicated `pre_holiday_short` type.

### Removed
- **`pre_holiday_short` type** — Replaced by `is_short_day: true` field on `workday` / `swapped_day_off` entries in holidays JSON. `normaliseEntry` `case 'pre_holiday_short'` removed; generic `if (entry.is_short_day)` handles all types.

### Changed
- **Calendar color system redesigned per feedback** (`tasks/done/2026-06-26-calendar-color-design-feedback.txt`):
  - Neutral days: WHITE background (no bg color) — only actual day categories get colored backgrounds
  - Today: `#2563eb` blue outline only, no fill. Day number turns blue.
  - Tracked: `#2563eb` blue dot only, no cell coloring. Dot ring removed (white bg no longer needs it).
  - Other-month: `#e5e7eb` bg + `#6b7280` text (~4:1 contrast) — visible and readable
  - Holiday: `#dcfce7`/`#166534`, memorial: `#fce7f3`/`#9d174d`, short: `#fef3c7`/`#92400e`
  - Weekends: same as weekdays (no special background)
  - Legend swatches and `cal-information` updated to match new palette
- **Calendar legend** — Dynamic legend below the grid shows colored swatches for Holiday, Memorial, Swapped, Short day, Vacation states and a dot for tracked sessions. Only states present in the current month are shown.
- **Other-month cells opacity** — Added `opacity: 0.5` to `.cal-day-other` for clearer disabled/faded visual.
- **Calendar footer layout** — Short day count text removed (total hours still accounts for short days internally). Details button moved to the right side on the same line as the workday summary.
- **Dark theme calendar colors** per `tasks/done/2026-06-26-calendar-color-design-dark-theme-feedback.txt`:
  - Card background: `#1e2535`
  - Workday: `#252e45` bg, `#c8d0e8` number, transparent border
  - Weekend: `#1d2438` bg, `#8090b0` number
  - Holiday: `#0d3d35` bg + `#1a6b5e` 1.5px border, `#4ecfb5` number
  - Memorial: `#2a2050` bg + `#5046a0` 1.5px border, `#a899f5` number
  - Short/swapped: `#3a2d10` bg + `#7a5a1a` 1.5px border, `#f0b840` number
  - Other-month: `opacity: 0.35`
  - Today: `#5b8df5` outline + number
  - Tracked dot: `#5b8df5`
  - Legend: `#8898bb` text, swatches with matching borders
- **Dark theme holiday colors** — Holiday/swap-day-off background changed from teal `#0d3d35` to dark red `#680a0a` with `#845959` border and `#fca5a5` number.
- **`.cal-swapped` split into `.cal-swapped-day-off` and `.cal-swapped-workday`** — Swapped day-offs get `cal-swapped-day-off` (holiday styling). Swapped workdays get `cal-swapped-workday` (normal workday bg with short-day-style amber border). `isShortDay` CSS class no longer applied to swapped workdays.
- **`.cal-memoriam` background removed** — Light mode: `#f9a8d4` border + `#9d174d` text. Dark mode: `#5046a0` border + `#a899f5` text. No fill.
- **Tailwind dark variant scoped to `.dark-mode` class** — Added `@variant dark (&:where(.dark-mode, .dark-mode *))` so Tailwind's `dark:` classes respond to the app's toggle (not `prefers-color-scheme`). Fixes Electron having no way to switch theme when the OS is in dark mode. (per `tasks/done/2026-06-25-tailwind-dark-variant-scope.md`)

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
- **Stop after pause loses break session** — `stopSession()` now creates a break session (tags: rest) and updates accumulatedPauseTime before populating form fields. (per `tasks/done/2026-06-25-stop-after-pause-break-session.md`)
- **Pause timer shows total rest instead of current piece** — Now defaults to current rest piece (starts at 0), clickable to toggle between "Current Rest" and "Total Rest".
- **Timer negative after pause/resume** — `accumulatedPauseTime` (ms) was subtracted from seconds in `updateTimerDisplay` and `saveSession`. Fixed both.
- **Edit session with breaks stores wrong duration** — `handleSessionFormSubmit` calculated duration as `endTime - startTime` without subtracting `accumulatedPauseTimeSec`, causing sessions with breaks to store total elapsed time instead of net work time.
- **README release build docs** — Added Linux standalone build instructions.
- **Release builds broken on Node v24** — `@electron/packager` 18.3.6 incompatible with Node 24; updated to 20.0.1. Holiday files now load from user data dir first with bundled fallback.

### Added
- **Calendar tab view** — Month grid with prev/next navigation, holiday (green), memoriam (pink), weekend (gray), vacation (purple), short-day (yellow) coloring, today ring, session-dot indicator, and graceful null-calendarService degradation. (TDD: 22 tests, 99% coverage) (per `tasks/done/2026-06-25-calendar-tab-view.md`)
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
