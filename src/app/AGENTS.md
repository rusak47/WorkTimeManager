# src/app — Module Conventions

## calendarService
- `normaliseEntry` maps JSON `type` → internal `dayType`: `swapped_day_off` → `'holiday'`, `swapped_workday` → `'workday'`. Read `type` does not directly predict classification.
- Overrides (`setOverride`/`clearOverride`) are in-memory only — lost when a new `createCalendarService(rawData)` is created. Persist only `state.markedDays` in the store.
- Note field is appended to tooltip with ` — ` separator; visible text shows only name, never category.

## saveMarkedDay sync (app.js)
- Must clear all overrides for a date, then re-apply all user-marked days for that date (handles edits correctly). One-override-at-a-time fails for edits.

## Testing
- Date-dependent tests: `vi.useFakeTimers()` + `vi.setSystemTime()` in `beforeEach`, restore with `vi.useRealTimers()` in `afterEach`.
- `setupDOM` must include elements under test in `innerHTML` string (e.g. `#today-status` for today-status tests).
- `storage.loadCalendar()` returns `{}` in browser-only dev mode (no Electron IPC). Test by mocking `window.api.loadCalendar` or injecting a calendarService directly.
- Tests for `updateTodayStatus` pass `calendarService` as second arg; no-calendar-service path tests today from `state.markedDays` only.
