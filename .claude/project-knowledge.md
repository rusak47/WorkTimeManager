# WorkTimeManager — Project Knowledge

## Domain
Electron desktop app for tracking work sessions, computing stats, and managing time. Users clock in/out, tag sessions, annotate with mood/notes, and view charts and income projections.

---

## Data Model

### Session (`sessions[]`)
```js
{
  id: number,                   // Date.now()
  date: string,                 // "YYYY-MM-DD"
  startTime: string,            // ISO 8601
  endTime: string,              // ISO 8601
  duration: string,             // "HH:MM:SS" via utils.formatDuration()
  durationSec: number,          // total seconds (end - start minus pauses)
  dayType: string,              // 'Workday' | 'Weekend' | 'Holiday' | 'Vacation'
  notes: string,                // free text
  tags: string[],               // e.g. ['work'], ['rest', 'read']
  mood: number,                 // 1-5 float (0.5 increments)
  accumulatedPauseTimeSec?: number,
  isBreak?: boolean,            // true for auto-generated break sessions
}
```

### Config (`configs[]`, newest first)
```js
{
  id: number,
  timestamp: string,            // ISO 8601
  workingHours: number,         // default 8
  breakDuration: number,        // minutes, default 60
  weekStart: number,            // 0=Sun … 6=Sat, default 1 (Mon)
  salaryType: string,           // 'hourly' | 'monthly'
  salaryTaxType: string,        // 'net' | 'brutto'
  salaryValue: number,          // default 15.00
  salaryTax: number,            // percentage, default 20
  untaxedMin: number,           // default 500.00
  inflationRate: number,        // percentage, default 2.5
  darkMode: boolean,
}
```

### Marked Day (`markedDays[]`)
```js
{
  date: string,                 // "YYYY-MM-DD"
  dayType: string,              // 'Holiday' | 'Vacation' | 'Workday' | 'Weekend'
  description: string,
}
```

### Tag (`tags[]`)
```js
{
  name: string,
  isDefault: boolean,
  isEnabled: boolean,
  isCustom: boolean,
}
```

### Tracker (`currentSession`)
```js
{
  startTime: number | null,     // Date.now() timestamp
  isPaused: boolean,
  pauseStart: number | null,    // Date.now() timestamp
  accumulatedPauseTime: number, // total paused ms
  isBreak: boolean,
}
```

---

## Storage

| Key | Content | Module |
|---|---|---|
| `workTimeSessions` | `JSON.stringify(sessions[])` | localStorage |
| `workTimeConfigs` | `JSON.stringify(configs[])` | localStorage |
| `workTimeMarkedDays` | `JSON.stringify(markedDays[])` | localStorage |
| `workTimeTags` | `JSON.stringify(tags[])` | localStorage |
| `darkMode` | `'true'` or `'false'` (string) | localStorage |

New IPC path (Phase 2+3): data stored at `app.getPath('userData')/work-time-data.json`, calendar in `resources/{year}-holidays.json`.

---

## Calendar Service (Phase 0)

Source of truth for day classification. Loads from `resources/{year}-holidays.json` with country wrapper (`"LV": { ... }`). CalendarService API:

- `classifyDate(dateStr)` → `{ type, isHoliday, isWeekend, ... }`
- `getDayInfo(dateStr)` → same + markedDays-based override
- `getYearCalendar(year)` → all 365/366 days classified
- `setOverride(dateStr, dayType)` / `clearOverride(dateStr)`
- `getRawCalendar()` → unwrapped calendar data
- `classifyWithOverride(dateStr)` → classify + check override

Types: `workday` | `weekend` | `holiday` | `swapped_day_off` | `swapped_workday`
Booleans: `isHoliday`, `isWeekend`, `isVacation`, `isMemoriam`, `isShortDay`

`is_memoriam` is additive boolean, NEVER a separate type. Only present when `true` in JSON (absent = false, normalised at load).

---

## Core Business Logic (Phase 5)

### configManager
- `createConfigManager(store)` → `{ getConfig, addConfig, restoreConfig, resetConfig, getConfigHistory }`
- Configs stored as versioned array (newest first), `restoreConfig(id)` promotes historical to latest

### sessionManager
- `createSessionManager(store)` → `{ getSessions, addSession, updateSession, deleteSession, resetSessions, getSessionsByFilter, startTracking, pauseTracking, resumeTracking, stopTracking, getTracker, resetTracker }`
- `stopTracking()` creates a session from the tracker state with `durationSec` computed from elapsed time minus pauses
- `getSessionsByFilter({ date, year, month, dayType, tag, mood })` — date-based or exact match filtering

### statsManager
- `createStatsManager(store)` → `{ computeTodayTotal, computePeriodStats, computeYearlyTable, computeIncome, getWorkDaysInMonth }`
- `computePeriodStats(period, refDate, opts)` returns `{ labels, data, totalSec }` for chart rendering
  - daily: last 7 days; weekly: last 8 weeks; monthly: last 6 months; yearly: current year 12 months
- `computeYearlyTable(year)` returns 12-month stats: totalHours, workDays, avgHoursPerDay, percentOverExpected, holidays, vacations
- `computeIncome(year)` returns monthly income for hourly (hours × rate) or monthly (prorated) salary, with optional tax adjustment

---

## Architecture

```
main.js (Electron) → IPC → preload.js (contextBridge) → renderer
                                                             │
                          store (state.js pub/sub) ◄─────────┤
                           │                                 │
              ┌────────────┼────────────┐                    │
         configManager  sessionManager  statsManager       uiManager
              │              │              │                  │
              └──────────────┴──────────────┴──────────────────┘
                                    │
                              storage.js (IPC)
                                    │
                              app.getPath('userData')
```

- All managers take a store instance (DI), operate on `store.getState()` / `store.setState()`
- No manager touches localStorage directly — that's the storage module's job
- UI layer subscribes to store and re-renders on changes

---

## Key Architectural Decisions

1. **`createX(store)` factory pattern** — all modules are factories taking a store for dependency injection; testable by injecting a `createStore()` instance
2. **Flat state** — `store.setState()` does shallow merge via `Object.assign`; no deep merge, nested paths must be set explicitly
3. **Tracker is in the store** — `store.getState().tracker` contains `startTime, isPaused, pauseStart, accumulatedPauseTime, isBreak`; reactive so UI can subscribe
4. **stopTracking() both creates session AND resets tracker** — single atomic state update with `[{ ...CURRENT_SESSION_INIT }, ...sessions]`
5. **Same-reference guard** — `setState` skips notification if every key in `partial` is `===` to current state value
6. **Data flows one way**: user action → manager → store.setState() → subscribers re-render → storage saves via orchestrator

---

## Conventions

- Test files co-located with source: `src/app/foo.js` → `src/app/foo.test.js`
- `// @vitest-environment jsdom` pragma for browser-dependent tests (storage, state)
- Sessions stored newest-first (unshift/prepend)
- Configs stored newest-first (index 0 = active config)
- All duration values in seconds internally, displayed as "HH:MM:SS"
- Pure computation functions return data; no DOM side effects in managers
- `getSessionsByFilter()` returns filtered array, does not sort
- `utils.js` functions are imported as `* as utils` — keep import convention
- `SECONDS_PER_HOUR = 3600` in constants.js, not magic numbers inline
- `DEFAULTS` object in constants.js for all config default values
- `CURRENT_SESSION_INIT` in constants.js for tracker initial state
