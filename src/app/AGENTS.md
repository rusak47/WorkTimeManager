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
- **Legend swatches (`cal-legend-*`) are independent CSS classes, not auto-derived from cell classes.** Changing `.cal-holiday` background does not update `.cal-legend-holiday` — both must be edited independently. Border-only cells (memoriam, swapped-workday) need corresponding legend swatches with `border: 1px solid ...; background: transparent;` rather than `background-color`.
- `collectMonthEvents` reads only from `calendarService.getDayInfo()` — user-marked days with descriptions but no name/note in calendar JSON are NOT surfaced in the Details panel.
- All UI text must be English. Locale-specific strings require explicit isolation in a future i18n layer.

## saveMarkedDay sync (app.js)
- Must clear all overrides for a date, then re-apply all user-marked days for that date (handles edits correctly). One-override-at-a-time fails for edits.

## handleSessionFormSubmit (app.js)
- `durationSec` is calculated from `endTime - startTime - accumulatedPauseTimeMs`. When editing, `accumulatedPauseTimeSec` is read from the existing session (the edit modal has no field for it) and must be subtracted — otherwise sessions with breaks store total elapsed time instead of net work time.
- The edit path in `sessionManager.updateSession` uses spread `{ ...existing, ...data }` so fields not in the edit form (like `accumulatedPauseTimeSec`) are preserved automatically.

## State aggregates
- Break sessions (`isBreak: true`) are stored in `state.sessions` alongside work sessions. Any `durationSec` aggregate (tracked hours, calendar totals, chart data) must filter `!s.isBreak`.
- **Today's Work on tracker tab** filters by `tags.includes('work')`, not by `!isBreak`, so only sessions explicitly tagged "work" count toward the work total. `uiManager.js:94` follows this pattern.

## Session tags structure
- `session.tags` is a flat string array (e.g. `['work', '4203', 'plais']`). Subtags are identified by exclusion from `DEFAULT_TAGS` — there is no nesting or hierarchy in the stored data. `tagBuckets` config defines the hierarchy, not the session data.

## Stacked chart subtag computation (uiManager.js:1575-1630)
- When computing per-subtag hours for the stacked bar chart, a session with multiple matching subtags (e.g. `4203+plais`) must contribute its full duration to **one** unique subtag-combination key, not once per subtag. Adding `durationSec` to each matching subtag individually inflates daily totals — the session is counted N times.
- **Filter gap guard**: if `subtagsInBucket` is empty (session subtags from tags that aren't the bucket name or `#`-prefixed), the stacking block is skipped entirely. This is correct — no subtags to stack by.

## renderRow2 guard order (uiManager.js:985-1050)
- Legacy subtag rendering must run **unconditionally** after the toggleable bucket subtag block. Early returns (`if (subtags.length === 0) return;`) before legacy code silently drop non-bucket tags when `tagBuckets[bucket]` is empty. Fix: wrap the toggleable block in `if (subtags.length > 0)`, keep fallthrough code outside.

## Multi-select default filter trap
- A `<select multiple>` with `selected` on any `<option>` silently activates that filter on first page load. The statistics mood filter was filtering to 5-star sessions only because `<option value="5" selected>` pre-selected it. No option should be pre-selected unless the user explicitly wants that filter active by default.

## Testing
- Date-dependent tests: `vi.useFakeTimers()` + `vi.setSystemTime()` in `beforeEach`, restore with `vi.useRealTimers()` in `afterEach`.
- `setupDOM` must include elements under test in `innerHTML` string (e.g. `#today-status` for today-status tests).
- `storage.loadCalendar()` returns `{}` in browser-only dev mode (no Electron IPC). Test by mocking `window.api.loadCalendar` or injecting a calendarService directly.
- Tests for `updateTodayStatus` pass `calendarService` as second arg; no-calendar-service path tests today from `state.markedDays` only.
