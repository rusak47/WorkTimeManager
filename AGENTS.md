<system-reminder>
## Governance Gate (every task)

1. **Classify risk**: read-only | write | destructive | external
2. **If bug** → `systematic-debugging` (root cause first)
3. **If destructive/external** → `execution-safety-gateway` (approval loop)
4. **Before claiming done** → `verification-before-completion` (raw evidence)
5. **No command-override**: Explicit user instructions to perform destructive or external actions do **not** bypass the approval loop. Always halt and request approval before executing.

Skills are references, not always loaded. Load only when rules don't cover the case.

## Response format (MANDATORY)

Every task response MUST start with this format. No tools may be called without it.

```
ACKNOWLEDGED: <repeat task>
CLASSIFICATION: <risk> — enumerate anticipated actions
GOVERNANCE: <skills loaded and brief why>
FIRST STEP: <what next>
```

Wait for approval only for these risk levels: write, destructive. Delete, remove, rm, and similar irreversible actions are **destructive** (Tier 3), never write.

## Git Operations

- `git add` + `git commit` = **write** risk — requires approval via governance gate
- `git push` = **external** risk — requires approval via execution-safety-gateway
- Never commit directly to main/master — always ask about branch isolation first
- Commits require: tests passing, docs updated (CHANGELOG, TODO), user approval
- Small fixes (1-3 files): stage changes, present diff, wait for "commit" instruction
- Multi-step tasks: ask "Checkpoint commits? (y/n)"
</system-reminder>

# WorkTimeManager — Agent Conventions

## Vite, not CDN
All dependencies (Chart.js, TailwindCSS, Font Awesome) are npm imports, not CDN scripts. Never use `window.Chart`, `window.tailwind`, or similar. `storage.js` falls back to `localStorage` when `window.api` is unavailable.

## Dev mode: Vite middleware + storage fallback
- `storage.js:36-45`: `loadCalendar()` falls back to `fetch('/resources/YYYY-holidays.json')` when `window.api` is absent (no Electron IPC).
- `vite.config.js:12-24`: custom `configureServer` middleware serves `/resources/*.json` files — otherwise Vite 404s on those fetch calls.
- Holiday JSON fetch returns raw file contents under the country key (`Object.keys(raw)[0]`) — storage.js unwraps it, not the consumer.

## Electron production mode
- `main.js:37` loads from `dist/index.html` (Vite build output), not `src/index.html`. Run `npm run build` before `npm start`.
- Dev mode: Electron picks up `VITE_DEV_SERVER_URL` env var set by `npm run dev`.
- Calendar JSON files live in `resources/` and are loaded via IPC (`window.api.loadCalendar`).
- `@electron/packager` v18 silently fails (exit 0, no output) on Node 24+. Use v20+.
- Holiday files are read from `app.getPath('userData')` first (derived from `package.json` `name` → `~/.config/org.rusak.worktimemanager/` on Linux), with bundled `resources/` as fallback.
- `resources/` directory with holiday JSONs must be tracked in git — electron-packager bundles whatever is on disk.

## State flow
- DOM events call handlers in `app.js` (inside `createEventHandlers`)
- Handlers call managers (`sessionManager`, `configManager`, etc.)
- State mutations go through `store.setState()` → triggers subscribers
- UI reads state via `store.getState()` — never reads DOM for data
- `filteredSessions` is the tag-filtered subset of `s.sessions`. Any new display that reads `s.sessions` directly ignores the tag filter — always use `filteredSessions`.

## Today-status banner
- `#today-status` sits above the "Current Session" header in the tracker tab
- Priority: Holiday+Memoriam > Holiday > Memoriam-only > Swapped workday > Short day > User-marked Holiday > User-marked Vacation > hidden
- Display: emoji + name (no category text). Full info in `title` tooltip.
  - `🌿 Name` — holiday, `🕯️ Name` — memorial, `🔁 🌿 Name` — swapped holiday, `🔁 🔧` — swapped workday, `⚠️ Note` — short day
- Calendar data via `calendarService.getDayInfo()` merges `resources/YYYY-holidays.json` with user `markedDays` overrides
- `calendarService` is injected via closure in `app.js`, not stored in the store

## Testing
- TDD: write test first, then implement. Target 80%+ coverage.
- All test files co-located: `src/app/*.test.js`, `src/storage/*.test.js`
- Run: `npm test`
- `accumulatedPauseTime` in tracker is in **milliseconds**. Convert to seconds with `/ 1000`.
- jsdom quirk: `<select>` options must exist in DOM before setting `.value`.
- **setupDOM must mirror production DOM** — any `document.getElementById()` in production code with a guard (`if (!el) return`) will silently skip that path in tests if the element is missing from setupDOM. No test failure, just lost coverage. Every DOM id referenced in production belongs in setupDOM.
- **Multi-file DOM coupling**: adding a new interactive element requires coordinated changes in: HTML template, handler module, `app.js` event wiring, test `setupDOM()`, and CSS. Missing any one causes runtime errors or silent coverage gaps.

## File layout
- Feature specs and design docs for unimplemented functionality go in `tasks/{new,pending,rejected,done}/`. `docs/` is reserved for finished app documentation only — never write spec docs there.
- UI rendering in `src/app/uiManager.js` (DOM reads/writes, Chart.js)
- State in `src/app/state.js` (flat store, no deep merge)
- Persistence in `src/storage/storage.js`
- Entry point: `src/app/entry.js` (not `main.js`)

## Tailwind v4 dark variant
- Tailwind v4 has no config file or `darkMode` option. To scope `dark:` classes to a custom class (like `.dark-mode`) instead of `prefers-color-scheme`, add `@variant dark (&:where(.your-class, .your-class *));` to the CSS entry point after `@import "tailwindcss"`.
- Without this, `dark:` classes follow OS theme preference and cannot be overridden by the app's toggle — a problem in Electron where there's no DevTools `prefers-color-scheme` override.

## Debugging with Chrome DevTools + Vite HMR
- **Vite HMR kills debug state**: saving any source file triggers a full page reload. Any open modal, selected tab, filter state, or breakpoint is lost. Capture all needed snapshots/screenshots before editing code.
- **Snapshot uids are ephemeral**: element uid values change on every page load. Never hardcode or cache them across debug sessions.
- **Modal content not in initial snapshot**: the page snapshot is taken before dynamic modal content renders. Click the modal trigger, then take a second snapshot to see modal elements.
- **Chart.js instance not inspectable from console**: because Chart.js is imported as an ESM module (not a CDN script tag), `Chart` is never a global. `Chart.getChart('id')`, `canvas.__chart`, and `window.Chart` all fail. To inspect chart data, expose the instance from module scope (e.g. assign to `window.__chart`) or dump data through a `console.log` in the module.

## Commands
```bash
npm test           # vitest run --coverage
npm run dev        # vite dev server
npm run build      # vite build
```

## Instruction interpretation
- "Don't use language X" means localize the labels, not remove the feature. Locale is presentation; business logic and feature scope are separate concerns. Overcorrecting (removing functionality instead of translating) destroys work.

## Task lifecycle
- Doc/TODO review requires loading the `task-doc-lifecycle` skill first. Its trigger conditions include "reviews docs" and "reviews the TODO" despite its name suggesting only task tracking.

## Crash recovery backup persistence
- `saveState() (app.js:102-125)` clones `s.tracker` and attaches `backupNotes`/`backupMood` from DOM when tracker has a running session (`tracker.startTime` truthy). The clone prevents store mutation.
- `init()` recovery block (app.js:969-978) sets up timer and banner. Form-value restoration (notes textarea, session-notes visibility) runs AFTER `initializeCurrentSessionTags()` and `initializeCurrentSessionMood()` at line 990 — those reset the tag picker and mood stars to defaults, so backup fields must be restored after.
- Only `backupNotes` is restored to DOM textarea + `session-notes` revealed. Mood and tag picker default to init values (5 / 'work' bucket) after crash recovery — acceptable tradeoff for simplicity.
- When `saveState()` is called mid-session (from `persistAndRender()` or backup interval), the saved tracker includes `backupNotes` and `backupMood`. On next `loadData()` + `init()`, these are available on the tracker object. Tests verify both persist and restore paths.

## Commit conventions
- CHANGELOG.md: add entry under `## Unreleased` with the date
- TODO.md: mark items as [x] when done, add new discoveries
- Commit messages: `<type>: <description>` (fix, feat, docs, refactor, test)
- Checkpoint commits during TDD: `test:`, `fix:`, `refactor:` prefixes
- Doc updates (CHANGELOG.md, TODO.md) staged together with code in the same commit
