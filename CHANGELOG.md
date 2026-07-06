# Changelog

## Unreleased

### Added
- **Legacy session tag migration** — one-time `migration/v1.0.0-to-v1.1.0.js` script normalizes legacy sessions on first load: extracts `#hashtags` from notes into structured `tags` array, strips them from notes. Runs once, persisted via `_migrationVersion` flag. Does not touch tagBuckets or settings. 313 tests.
- **Subtag-stacked daily bar chart + split tag filters** — Tag filter split into two multi-selects (top-level + subtag). Daily bar chart shows stacked-by-subtag segments when drilling into one bucket or comparing multiple selected subtags. Weekly/monthly/yearly + fallback combos keep simple bars. See `tasks/done/2026-07-06-subtag-stacked-chart.md`.

### Fixed
- **Time by Bucket ignores period filter** — `renderBucketStats()` now receives period-scoped sessions matching the chart's visible window (daily/weekly/monthly/yearly). Previously showed all-time data regardless of selected period. See `tasks/done/2026-07-06-bucket-stats-period-scope.md`.
- **Subtag filter "All Subtags" bypassed entire tag filter** — The `includes('all')` guard was false when `all` was in the combined tag+subtag array, causing the entire filter block to be skipped. Now filters out `all` meta-values before building the active filter list. Fixes: total time showing unfiltered aggregate, wrong tags appearing on chart.
- **Default tag filter selection lost** — `app.js` tag-filter rewrite removed `selected` from the Work option. Now restored so Work + All Subtags is the default filter, not "no filter".
- **Edit session drops legacy subtags not in tagBuckets** — Two bugs: (1) `renderRow2()` had `if (subtags.length === 0) return;` before legacy tag rendering code, so when `tagBuckets[defaultName]` was empty (e.g. `work: []`) the function exited without rendering any legacy subtags. (2) Bucket-switch click handler didn't pass `subtagNames` to `renderRow2`, losing preselected subtags on bucket change. Fix: wrap toggleable subtag rendering in `if (subtags.length > 0)` and run legacy subtag rendering unconditionally. Legacy tags render as `.tag-chip.selected.readonly` so `handleSessionFormSubmit()` preserves them on save. (316 tests)
- **Stacked bar chart double-counts multi-subtag sessions** — sessions with multiple subtags (e.g. `4203+plais`) added full duration to each subtag's series separately, inflating daily totals. Now grouped by unique subtag combination so each session contributes to exactly one stack segment.
- **Mood rating filter pre-selected by default** — removed `selected` from the 5 Stars `<option>` so no mood filter is applied unless user explicitly picks one. All sessions show regardless of mood on initial load.

## 1.1.0 (2026-07-06)

### Fixed
- **P3-E: Long-press bucket lost on stop** — `initializeCurrentSessionTags()` now accepts optional `bucket` parameter and uses it instead of hardcoding `'work'`.
- **Settings tag view stale after new tags added** — `syncHashtagTags()` now calls `ui.renderTagSettings()` immediately after updating the store, ensuring new subtags are always rendered regardless of when the user navigates to settings.
- **Duplicate `[data-settings-tab="tags"]` event handler removed** — The tags tab was registered twice (once in the `forEach` loop, once standalone), causing redundant `renderTagSettings()` calls.
- **Hashtag dropdown below cursor** — `getCursorCoords()` helper places dropdown at cursor position (mirror div overlay); flips above on viewport overflow, shifts left if off-screen right.
- **Hashtag dropdown re-show on subsequent keystrokes** — Removed redundant `input` dispatch from click handler; added `dismissedHash` tracker so Esc/Space/Enter permanently suppress re-show for the same `#` query at the same position.
- **Exact-match guard hiding continuation matches** — `#re` with tags `re`, `rea`, `read` now shows all three instead of hiding the dropdown when `re` is an exact match.
- **Single color dot in hashtag dropdown** — Tags in multiple buckets now render one dot (first bucket's color) instead of one per parent bucket.
- **Start picker not dismissed on short press** — `ui.hideStartPicker()` called on mousedown/touchstart and mouseup/touchend; added click-outside dismissal.
- **Existing `#tags` not stripped from notes or added to session** — `syncHashtagTags` now always strips ALL `#tag` mentions (existing and new) from notes and returns `foundTags` (all found) in addition to `addedTags`; callers add all found tags to `selectedTags` so existing tags from notes are switched on for the session.
- **Start picker positioned at cursor** — `showStartPicker` accepts optional `x, y` coords; app.js captures `clientX/clientY` from mousedown/touchstart and passes them so the picker appears at the press location with overflow flip/shift.
- **Keyboard navigation for hashtag dropdown** — ArrowDown/ArrowUp to navigate, Enter to select highlighted item, single-item auto-select on ArrowDown. `.hashtag-highlighted` CSS class with dark-mode support.

### Added
- **Tag Bucket System — Phase 3: Two-Row Tag Picker & Hashtag Autocomplete** — Ongoing. See `tasks/done/2026-07-06-tag-bucket-p3-picker-hashtag-stats.md`.
  - P3-B: **Store bucket on session save** — `stopTracking()` now passes `meta.bucket` through to the session object. `handleSessionFormSubmit` reads bucket from selected row-1 default tag and includes it in `addSession()`.
  - P3-C: **Two-row tag picker in tracker tab** — `initializeCurrentSessionTags()` rendered as two-row picker: row 1 (5 defaults, radio-style), row 2 (subtags from `tagBuckets`, max 6 visible, `+N more` expander). Click handlers for default switching and subtag toggle. Legacy fallback for sessions without `tagBuckets`.
  - P3-D: **Two-row tag picker in session modal** — `initializeSessionModalTags()` rewritten with two-row layout; `editSession()` refactored to call shared picker; `handleSessionFormSubmit` reads `.tag-chip.selected` and passes `bucket`; warning for multiple default tags in edit. `renderRow2` accepts `selectedSubtags` param for pre-selection.
  - **Visual fix: selected tags color + outline** — Saved session views pass `selected=true` to `getTagBadgeClass` so tags show bucket colors; `renderRow2` click handlers swap `getTagBadgeClass` on toggle so subtags show/hide background; CSS `.tag-chip.selected` adds outline instead of inline ring classes.
  - P3-E: **Long-press on Start button** — ~500ms hold on Start shows floating picker (`rest`/`study`/`sport`/`other`/`work`), short press starts with `work` as before. `startSession(bucket)` accepts optional bucket param; picker positioned below the button with backdrop-neutral styling.
  - P3-F: **Inline hashtag autocomplete + auto-add on session save** — `#`-prefix matching in `#notes` and `#modal-notes` textareas with colored bucket-dot badges via `getBucketColorClass()`. Dropdown positioned above/below cursor, dismiss on Escape/blur. `getAllTagNames()` collects all bucket keys + subtags from `tagBuckets`. `syncHashtagTags(notes, bucket)` extracts `#`-prefixed words from notes and adds unknown ones as custom subtags under the selected parent bucket, wired into both `saveSession()` and `handleSessionFormSubmit()`. Returns `{ addedTags, cleanedNotes }` — new tags auto-appended to session tags array and `#tag` mentions stripped from saved notes. `ui.renderTagSettings()` called immediately after adding tags so settings tab is never stale. 297 tests.
  - P3-G: **Bucketed statistics section in stats tab** — `statsManager.computeBucketStats()` groups sessions by default bucket with subtag accumulation. `uiManager.renderBucketStats()` renders bucket rows with colored borders, duration, and expandable subtag drill-down. Wired into `updateStatistics()`. Container `#bucket-stats` added below income chart. 306 tests.

## Unreleased (2026-07-04)

### Fixed
- **Default tag chips no longer render as subtags in own bucket** — Removed `renderTagSettings` block that inserted the bucket's own default tag (e.g. `work` inside Work) as a subtag chip, causing visual duplication.
- **Unassigned tags delete button now wired** — `setOnDeleteCustomTag` callback and function added; delete button in unassigned section calls `deleteCustomTag` in app.js.
- **`ui is not defined` error in createUIManager** — `setOnDeleteCustomTag` was incorrectly assigned to `ui` variable (non-existent in return-object pattern), changed to standalone function.

### Added
- **Tag Bucket System — Phase 2: Settings Tree View & Drag-and-Drop** — Interactive tag bucket management in settings tab. See `tasks/done/2026-07-06-tag-bucket-p2-settings-dnd.md`.
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
