# src/app — Module Conventions

## calendarService
- `normaliseEntry` maps JSON `type` → internal `dayType`: `swapped_day_off` → `'holiday'`, `swapped_workday` → `'workday'`. Read `type` does not directly predict classification.
- Overrides (`setOverride`/`clearOverride`) are in-memory only — lost when a new `createCalendarService(rawData)` is created. Persist only `state.markedDays` in the store.
- Tooltip segments (all optional, joined by ` — `): `name` → `note` → `(moved from date)` → `marked.description`. Note is from `dayInfo.note`, distinct from `dayInfo.name`. Visible cell text shows only name, never category.

## calendarView
- `buildCellClass` merges two independent sources: `dayInfo` (from calendarService JSON) and `markedDays` (from store). System holidays take precedence over user-marked vacations in the if/else chain. `memoriam`, `shortDay`, `information` classes stack on top regardless.
- `collectMonthEvents` reads only from `calendarService.getDayInfo()` — user-marked days with descriptions but no name/note in calendar JSON are NOT surfaced in the Details panel.
- All UI text must be English. Locale-specific strings require explicit isolation in a future i18n layer.

## saveMarkedDay sync (app.js)
- Must clear all overrides for a date, then re-apply all user-marked days for that date (handles edits correctly). One-override-at-a-time fails for edits.

## handleSessionFormSubmit (app.js)
- `durationSec` is calculated from `endTime - startTime - accumulatedPauseTimeMs`. When editing, `accumulatedPauseTimeSec` is read from the existing session (the edit modal has no field for it) and must be subtracted — otherwise sessions with breaks store total elapsed time instead of net work time.
- The edit path in `sessionManager.updateSession` uses spread `{ ...existing, ...data }` so fields not in the edit form (like `accumulatedPauseTimeSec`) are preserved automatically.

## Testing
- Date-dependent tests: `vi.useFakeTimers()` + `vi.setSystemTime()` in `beforeEach`, restore with `vi.useRealTimers()` in `afterEach`.
- `setupDOM` must include elements under test in `innerHTML` string (e.g. `#today-status` for today-status tests).
- `storage.loadCalendar()` returns `{}` in browser-only dev mode (no Electron IPC). Test by mocking `window.api.loadCalendar` or injecting a calendarService directly.
- Tests for `updateTodayStatus` pass `calendarService` as second arg; no-calendar-service path tests today from `state.markedDays` only.
