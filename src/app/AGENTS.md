# src/app — Module Conventions

## calendarService
- `normaliseEntry` maps JSON `type` → internal `dayType`: `swapped_day_off` → `'holiday'`, `swapped_workday` → `'workday'`. Read `type` does not directly predict classification.
- **Swapped_workday short status from swap_source**: `buildDayInfo:114-119` propagates `isShortDay` from the `swap_source` entry's `is_short_day` field to the `swapped_workday`. Requires the JSON entry pointed to by `swap_source` to have `"is_short_day": true`. The `calendar2json` module must set this field when the source date was pre-holiday short.
- Overrides (`setOverride`/`clearOverride`) are in-memory only — lost when a new `createCalendarService(rawData)` is created. Persist only `state.markedDays` in the store.
- Tooltip segments (all optional, joined by ` — `): `name` → `note` → `(moved from date)` → `marked.description`. Note is from `dayInfo.note`, distinct from `dayInfo.name`. Visible cell text shows only name, never category.

## calendarView
- `buildCellClass` merges two independent sources: `dayInfo` (from calendarService JSON) and `markedDays` (from store). System holidays take precedence over user-marked vacations in the if/else chain. `memoriam`, `shortDay`, `information` classes stack on top regardless.
- Swap-source check must come before normal category checks: `swapSource` replaces `.cal-holiday`/`.cal-short` with `.cal-swapped-day-off`/`.cal-swapped-workday`. A CSS class in `styles.css` that `buildCellClass` never pushes (like the old bare `.cal-swapped`) is dead code — the legend check for it returns false too.
- Memoriam cells use border-only styling (no background fill) in both light and dark themes — unlike holiday/short/vacation which use background colors. This is enforced in CSS, not in JS class logic.
- `collectMonthEvents` reads only from `calendarService.getDayInfo()` — user-marked days with descriptions but no name/note in calendar JSON are NOT surfaced in the Details panel.
- All UI text must be English. Locale-specific strings require explicit isolation in a future i18n layer.

## saveMarkedDay sync (app.js)
- Must clear all overrides for a date, then re-apply all user-marked days for that date (handles edits correctly). One-override-at-a-time fails for edits.

## handleSessionFormSubmit (app.js)
- `durationSec` is calculated from `endTime - startTime - accumulatedPauseTimeMs`. When editing, `accumulatedPauseTimeSec` is read from the existing session (the edit modal has no field for it) and must be subtracted — otherwise sessions with breaks store total elapsed time instead of net work time.
- The edit path in `sessionManager.updateSession` uses spread `{ ...existing, ...data }` so fields not in the edit form (like `accumulatedPauseTimeSec`) are preserved automatically.

## State aggregates
- Break sessions (`isBreak: true`) are stored in `state.sessions` alongside work sessions. Any `durationSec` aggregate (tracked hours, calendar totals, chart data) must filter `!s.isBreak`. `uiManager.js:93` follows this pattern.

## Testing
- Date-dependent tests: `vi.useFakeTimers()` + `vi.setSystemTime()` in `beforeEach`, restore with `vi.useRealTimers()` in `afterEach`.
- `setupDOM` must include elements under test in `innerHTML` string (e.g. `#today-status` for today-status tests).
- `storage.loadCalendar()` returns `{}` in browser-only dev mode (no Electron IPC). Test by mocking `window.api.loadCalendar` or injecting a calendarService directly.
- Tests for `updateTodayStatus` pass `calendarService` as second arg; no-calendar-service path tests today from `state.markedDays` only.
