# WorkTimeManager Refactoring Plan v2

**Author:** Claude Code session 2026-06-24  
**Status:** Draft, awaiting implementation start  
**Updated:** 2026-06-24 — calendar2json format finalised (country wrapper, `is_memoriam` flag, `resources/` path)  

---

## Architecture Overview

```
resources/
└── 2026-holidays.json         # Data — calendar2json output with country wrapper + is_memoriam

src/
├── app/                          # Modular application code
│   ├── calendarService.js        # Phase 0 — shared calendar data contract
│   ├── state.js                  # Phase 4 — centralized reactive state
│   ├── sessionManager.js         # Phase 5 — session CRUD + business logic
│   ├── statsManager.js           # Phase 5 — statistics computation
│   ├── configManager.js          # Phase 5 — user preferences
│   ├── uiManager.js              # Phase 6 — UI rendering, event binding
│   ├── accessibility.js          # Phase 6 — a11y helpers
│   ├── app.js                    # Phase 6 — orchestration
│   └── constants.js              # Phase 5 — constants/enums
├── js/
│   └── utils.js                  # Keep, extend — format/parse helpers
├── storage/
│   └── storage.js                # Phase 3 — IPC-driven file persistence
├── main.js                       # Phase 2 — Electron main process (shrunk)
├── preload.js                    # Phase 2 — contextBridge API definition
├── index.html                    # Phase 7 — cleaned up, inline styles removed
├── css/styles.css                # Phase 7 — consolidated styles
└── test/
    └── ...                       # Phase 8 — Vitest tests
```

### Data Flow

```
calendar2json → resources/2026-holidays.json [ { country_code: { date: { ... } } } ]
                       │
                       ▼  unwrap country layer, normalise
                calendarService.js
                       ▼
                  state.js ←──────── storage.js ←→ Electron IPC ←→ JSON file on disk
                  /    \
       sessionManager   uiManager → index.html
            |
       statsManager
```

---

## Phase 0: Calendar Service (`src/app/calendarService.js`)

**Goal:** Shared date classification contract. Used by this app, calendar2json (as spec), and parser (as consumer).

### Why First

The calendar data model affects every other module. Building it first:
- Defines the shape of `DayInfo` consumed by the entire app
- Prevents cascading changes when calendar2json format evolves
- Surfaces design issues before other modules depend on fragile assumptions

### API

```javascript
// --- Type Definitions ---

/**
 * @typedef {Object} DayInfo
 * @property {string} date        — ISO date "YYYY-MM-DD"
 * @property {'workday'|'weekend'|'holiday'|'vacation'} dayType
 *   Core day classification. 'vacation' set by user override only.
 * @property {boolean} isHoliday   — true if dayType is 'holiday'
 * @property {boolean} isWeekend   — true if dayType is 'weekend'
 * @property {boolean} isMemoriam  — commemorative date (additive flag)
 * @property {boolean} isVacation  — user-declared vacation day
 * @property {boolean} isShortDay  — shortened workday
 * @property {string|null} name          — human-readable name
 * @property {string|null} localName     — local-language name
 * @property {string|null} note          — additional note
 * @property {string|null} swapSource    — if swapped, original date
 * @property {string|null} observedDate  — if swapped, observed date
 */

/**
 * @typedef {Object} CalendarService
 * @property {function(string): DayInfo} classifyDate
 *   Classify a single ISO date string. Auto-detects weekend.
 * @property {function(string): DayInfo|null} getDayInfo
 *   DayInfo for a specific date, including user overrides.
 * @property {function(string): Object<string, DayInfo>} getYearCalendar
 *   Full year calendar as date-keyed DayInfo map.
 * @property {function(string, string, *): void} setOverride
 *   Set a user override for a date field.
 *   Fields: 'dayType', 'isVacation', 'isMemoriam', 'note'
 * @property {function(string): void} clearOverride
 *   Remove all overrides for a date.
 * @property {function(): Object} getRawCalendar
 *   Raw loaded calendar data (for stats/export).
 * @property {function(string, string): DayInfo} classifyWithOverride
 *   Classify date respecting user overrides.
 */
```

### Classification Rules

| Condition | dayType | isHoliday | isWeekend | isShortDay | isMemoriam |
|-----------|---------|-----------|-----------|------------|------------|
| Weekend (Sat/Sun) + no override | `weekend` | false | true | false | from data |
| Holiday in calendar JSON | `holiday` | true | – | – | from data |
| Swapped day off | `holiday` | true | – | – | false |
| Swapped workday | `workday` | false | false | – | false |
| Pre-holiday short | same as day | false | – | true | false |
| User-override `vacation` | `vacation` | false | – | – | – |
| Memoriam-only | *base day* | *base* | *base* | false | true |

**Key rule:** `isMemoriam` is purely additive — it does not change `dayType`. A memoriam-only date that falls on a regular workday keeps `dayType: "workday"` with `isMemoriam: true`.

### Calendar File Format (as of calendar2json v2)

File location: `resources/{year}-holidays.json`

```json
{
  "LV": {
    "2026-01-01": {
      "type": "holiday",
      "is_memoriam": true,
      "name": "...",
      "local_name": "...",
      "observed_date": "2026-01-01"
    },
    "2026-01-20": {
      "type": "workday",
      "is_memoriam": true,
      "name": "1991. gada barikāžu aizstāvju atceres diena"
    }
  }
}
```

Key format rules:
- Top-level key is country code (`LV`)
- `is_memoriam` is only present when `true` — absent means `false`
- Memoriam-only dates keep base `type` (`workday`/`weekend`) with `is_memoriam: true`
- Dual-type dates (holiday + memorial) have both `type: "holiday"` and `is_memoriam: true`

### Loader

```javascript
// Loading order:
// 1. Load resources/{year}-holidays.json (primary) — always succeeds or throws
// 2. Unwrap country layer: data["LV"] -> date-keyed map
// 3. Normalise: treat absent is_memoriam as false

// Internal normalised structure:
const normalized = {
  "2026-01-01": {
    type: "holiday", isMemoriam: true, name: "...", ...
  },
  "2026-01-20": {
    type: "workday", isMemoriam: true, name: "...", ...
  },
  ...
};
```

### Normalisation Rules

| Input `type` | Input `is_memoriam` | Normalised `dayType` | Normalised `isMemoriam` |
|---|---|---|---|
| `holiday` | absent | `holiday` | `false` |
| `holiday` | `true` | `holiday` | `true` |
| `workday` | `true` | `workday` | `true` |
| `weekend` | `true` | `weekend` | `true` |
| `swapped_day_off` | absent | `holiday` | `false` |
| `swapped_workday` | absent | `workday` | `false` |
| `pre_holiday_short` | absent | *(base day)* + `isShortDay: true` | `false` |

### Tests

```javascript
describe('calendarService', () => {
  it('classifies weekend as weekend')
  it('classifies holiday from 2026-holidays.json')
  it('classifies swapped day off as holiday')
  it('classifies swapped workday as workday')
  it('classifies pre-holiday short with isShortDay flag')
  it('honors user override for vacation')
  it('honors user override for dayType')
  it('honors user override for isMemoriam')
  it('classifies memoriam-only date with base dayType + isMemoriam flag')
  it('returns null for unknown date')
  it('handles empty calendar gracefully')
  it('normalises absent is_memoriam as false')
  it('unwraps country layer from calendar file')
  it('classifies memoriam-only workday as workday + isMemoriam flag')
  it('classifies dual-type holiday+memoriam as holiday + isMemoriam flag')
})
```

---

## Phase 1: Project Tooling

**Goal:** Vite bundling, Vitest testing, ESLint linting.

### Changes

- `package.json`: add Vite, Vitest, ESLint devDependencies; add scripts: `dev`, `build`, `test`, `lint`
- `vite.config.js`: configure Electron renderer target, resolve aliases
- `vitest.config.js`: configure test environment, coverage thresholds (80%)
- `eslint.config.js`: standard JS config with Electron-aware rules
- Convert `index.html` to Vite entry point — load `src/app/app.js` as module

### Vite Config

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
```

### Scripts (package.json)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run --coverage",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  }
}
```

### TailwindCSS Migration

- Replace CDN with PostCSS plugin via Vite
- `postcss.config.js` with TailwindCSS + autoprefixer
- Add `@tailwind` directives to `styles.css`
- Keep custom styles alongside Tailwind utilities

---

## Phase 2: Electron IPC Wiring

**Goal:** Secure bridge between renderer and main process for file I/O.

### preload.js

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

const API = {
  // Data persistence
  loadData: ()     => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),

  // Calendar data
  loadCalendar: (year) => ipcRenderer.invoke('calendar:load', year),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:version'),
};

contextBridge.exposeInMainWorld('api', API);
```

### main.js (new IPC handlers)

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(app.getPath('userData'), 'work-time-data.json');
const DATA_FILE = path.join(app.getPath('userData'), 'work-time-data.json');
const RESOURCES_DIR = path.join(__dirname, 'resources');

ipcMain.handle('data:load', async () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
    return null;
  } catch (err) {
    console.error('Failed to load data:', err);
    return null;
  }
});

ipcMain.handle('data:save', async (_, data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return true;
});

ipcMain.handle('calendar:load', async (_, year) => {
  const calendarPath = path.join(RESOURCES_DIR, `${year}-holidays.json`);
  return tryRead(calendarPath);
});
```

### Storage Migration

On first launch after update, check for localStorage data and migrate:

1. Before `app.whenReady()`, check if `DATA_FILE` exists
2. If not, inject a script via `webContents.executeJavaScript` to read `localStorage`
3. Write retrieved data to `DATA_FILE`
4. Mark migration complete in a migration flag file

---

## Phase 3: Storage Abstraction (`src/storage/storage.js`)

**Goal:** Single module encapsulating all IPC calls. UI code never calls IPC directly.

```javascript
// storage.js — renderer-side
const api = window.api;

export const storage = {
  async loadState() {
    return await api.loadData();
  },

  async saveState(state) {
    return await api.saveData(state);
  },

  async loadCalendar(year) {
    return await api.loadCalendar(year);
  },
};
```

---

## Phase 4: State Management (`src/app/state.js`)

**Goal:** Centralized observed state with pub/sub for reactivity.

```javascript
class State {
  constructor() {
    this._data = {
      sessions: [],
      config: { workHours: 8, workDays: ['mon','tue','wed','thu','fri'], ... },
      markedDays: {},  // date-keyed overrides
      today: new Date().toISOString().split('T')[0],
    };
    this._listeners = {};
    this._calendarService = null;
  }

  async init(calendarService) {
    this._calendarService = calendarService;
    const saved = await storage.loadState();
    if (saved) this._data = { ...this._data, ...saved };
  }

  get data() { return this._data; }

  set(path, value) { /* deep set + notify */ }
  get(path) { /* deep get */ }

  on(event, fn) { /* subscribe to changes */ }
  off(event, fn) { /* unsubscribe */ }

  async addSession(sessionData) { /* add + classify + save + notify */ }
  async removeSession(id) { /* remove + save + notify */ }

  async setDayOverride(date, field, value) { /* set + reclassify */ }

  async save() { return storage.saveState(this._data); }
}
```

### Day Classification at Save Time

When a session is saved, `calendarService.classifyWithOverride(date)` enriches the session with:
- `dayType`
- `isHoliday`, `isWeekend`, `isMemoriam`, `isVacation`, `isShortDay`
- `dayName` (from calendar if available)

User overrides in `markedDays` take precedence over auto-classification.

---

## Phase 5: Core Business Logic Modules

### sessionManager.js

```javascript
export const sessionManager = {
  createSession(state, { date, startTime, endTime, project, note }) {
    // Create session object with auto-classification
    // Calculate totalTime from startTime/endTime
    // Return new session (do NOT save yet — caller's responsibility)
  },

  updateSession(state, sessionId, updates) { /* ... */ },
  deleteSession(state, sessionId) { /* ... */ },
  getSessionsByDate(state, date) { /* ... */ },
  getSessionsByMonth(state, year, month) { /* ... */ },
  getTotalTimeByDate(state, date) { /* ... */ },
  validateSession(session) { /* ... */ },
};
```

### statsManager.js

```javascript
export const statsManager = {
  calculateDailyStats(sessions) { /* ... */ },
  calculateMonthlyStats(sessions) { /* ... */ },
  calculateYearlyStats(sessions) { /* ... */ },
  calculateProjectStats(sessions) { /* ... */ },
  calculateTrend(sessions, days) { /* weekly trend */ },
};
```

### configManager.js

```javascript
export const configManager = {
  defaults: {
    workHours: 8,
    workDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    startOfWeek: 'monday',
    theme: 'light',
    breakExclusionMinutes: 0,
  },

  load() { /* from state.config */ },
  update(key, value) { /* validate + update */ },
  reset() { /* restore defaults */ },
};
```

### constants.js

```javascript
export const DAY_TYPES = ['workday', 'weekend', 'holiday', 'vacation'];
export const DAYS_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DATA_VERSION = '2.0';
export const STORAGE_KEY = 'workTimeManager';
```

---

## Phase 6: UI Modules

### uiManager.js

Render functions for each tab. One-way data flow: uiManager reads from state, never writes directly.

```javascript
export const uiManager = {
  init(container) { /* bind to DOM, set up event delegation */ },

  renderTab(tabName) { /* switch visible tab */ },

  renderTrackerTab(state) { /* clock, date, project fields */ },
  renderSessionsTab(state) { /* session list, filters */ },
  renderStatsTab(state) { /* charts, summaries */ },
  renderConfigTab(state) { /* settings form */ },

  renderCalendar(state) { /* calendar grid with day badges (stretch goal) */ },

  showNotification(message, type) { /* toast */ },
  showConfirm(message) { /* confirm dialog */ },
};
```

### accessibility.js

```javascript
export const accessibility = {
  setupKeyboardNav() { /* tabindex, key handlers */ },
  setupFocusTrap(modalEl) { /* modal focus management */ },
  announce(message) { /* aria-live region */ },
  setTheme(theme) { /* light/dark */ },
};
```

### app.js (orchestration)

```javascript
import { calendarService } from './calendarService.js';
import { state } from './state.js';
import { uiManager } from './uiManager.js';
import { storage } from '../storage/storage.js';

async function init() {
  const calService = calendarService();
  await state.init(calService);
  uiManager.init(document.getElementById('app'));
  uiManager.renderAll(state.data);
}

document.addEventListener('DOMContentLoaded', init);
```

---

## Phase 7: index.html Cleanup

- Move all inline `<style>` blocks to `css/styles.css`
- Replace CDN scripts with Vite module imports
- Add semantic HTML attributes for accessibility
- Wire `data-*` attributes for event delegation

### Script Loading (Before → After)

```html
<!-- BEFORE: CDN scripts -->
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://kit.fontawesome.com/xxx.js"></script>
<script src="src/js/utils.js"></script>
<script src="src/main.js"></script>

<!-- AFTER: Vite modules -->
<script type="module" src="/src/app/app.js"></script>
```

### TailwindCSS (Before → After)

```html
<!-- BEFORE: CDN -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- AFTER: PostCSS plugin -->
<!-- tailwind directives in styles.css -->
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Phase 8: Testing

### Unit Tests (Vitest)

| Module | Tests | Priority |
|--------|-------|----------|
| calendarService | 11+ tests | Critical |
| sessionManager | 8+ tests | Critical |
| statsManager | 6+ tests | High |
| state | 5+ tests | High |
| utils | 4+ tests | Medium |
| configManager | 4+ tests | Medium |

### Integration Tests

- Calendar loading + enrichment pipeline
- State → Storage round-trip (with mocked IPC)
- Session creation → classification → persistence

### E2E Tests (future)

- Playwright for full Electron app flows

### Coverage Target

- 80%+ global (lines, branches, functions, statements)
- 100% on calendarService core classification

---

## Implementation Order

```
Phase 0 ─→ Phase 1 ─→ Phase 2 ─→ Phase 3 ─→ Phase 4 ─→ Phase 5 ─→ Phase 6 ─→ Phase 7 ─→ Phase 8
  CalSvc     Tooling     IPC       Storage     State      Core       UI        HTML       Tests
```

Phases within a tier can be parallelized:

```
Tier 1 (no deps):       Phase 0, Phase 1
Tier 2 (needs IPC):     Phase 2, Phase 3
Tier 3 (needs storage): Phase 4
Tier 4 (needs state):   Phase 5, Phase 6
Tier 5 (needs UI):      Phase 7
Tier 6 (needs code):    Phase 8
```

Phase 0 must start first (it defines the shared contract). Phase 1 can run in parallel. Everything else waits for Phase 0 + Phase 2.
