# Break Form Fields — Design Spec

## Problem
The tracker form (notes, tags, mood) is shared between work and break sessions. When the user pauses, the form values captured for the break segment are whatever was typed for the work session. Break segments always get hardcoded `'Break session'` / `['rest']` / `5` instead of reading from dedicated fields. The user wants to edit break-specific notes/tags/mood during a pause.

## Design

### New HTML block
A second form block `#break-session-notes` cloned from `#session-notes`:
- `#break-notes` (textarea)
- `#break-session-tags` (tag chip container)
- `#break-session-mood` (star display) + `#break-mood-value` (text)
- `#break-session-mood-input` (hidden input)

Both forms use the same CSS classes. No new CSS needed.

### Visibility toggling

| App state | Work form | Break form |
|---|---|---|
| No session | hidden | hidden |
| Session running | visible | hidden |
| Session paused | hidden | visible |
| After stop | hidden | hidden |

### Data flow

**Pause** (running → paused):
1. Read work form via `readTrackerFormValues()` (unchanged)
2. Save work segment with work form values
3. Hide `#session-notes`, show `#break-session-notes`
4. Initialize break tags (default `'rest'`) + break mood (default `5`)

**Resume** (paused → running):
1. Read break form values → create break segment (notes from textarea, tags from chips, mood from input)
2. If notes are empty, save empty string (no constant `'Break session'` placeholder)
3. Hide `#break-session-notes`, show `#session-notes`

**Stop (running)**:
1. Read work form values (unchanged)
2. Create final work segment
3. Hide both forms
4. Reset

**Stop (paused)**:
1. Read break form values → create break segment
2. Find latest work segment for edit form population (unchanged logic)
3. Hide both forms
4. Reset

### Crash recovery
- `saveState()` reads from whichever form is **currently visible**:
  - `tracker.isPaused` is false → read `#notes` / `#current-session-mood-input`
  - `tracker.isPaused` is true → read `#break-notes` / `#break-session-mood-input`
- `init()` recovery restores based on `recoveredTracker.isPaused`:
  - Show the corresponding form
  - Restore `backupNotes` / `backupMood` to the corresponding form fields
  - Recovery block runs AFTER all `initialize*` calls

### New/Modified functions

**uiManager.js**:
- `initializeBreakSessionTags()` — same logic as `initializeCurrentSessionTags()` but targets `#break-session-tags` container, defaults to `'rest'` bucket
- `initializeBreakSessionMood()` — same logic as `initializeCurrentSessionMood()` but targets `#break-session-mood` / `#break-session-mood-input` / `#break-mood-value`
- `createStarsForBreakSession()` — same as `createStarsForCurrentSession()` but targets break containers
- New `readBreakFormValues()` in app.js or parameterize `readTrackerFormValues()` to accept form prefix

**app.js**:
- `togglePause` — pause branch: add form toggle + init calls after saving work segment; resume branch: read break form values instead of hardcoded constants
- `stopSession` — paused branch: read break form values instead of hardcoded constants; hide both forms
- `saveState()` — read active form based on `tracker.isPaused`
- `init()` — restore active form based on `recoveredTracker.isPaused`

### Constants
- `'Break session'` constant removed. Break segments store whatever is in the break notes textarea (empty string if blank).

## File changes
- `src/index.html` — add `#break-session-notes` HTML block
- `src/app/uiManager.js` — add break-specific init functions, update exports
- `src/app/app.js` — update `togglePause`, `stopSession`, `saveState`, `init`
- `src/app/app.test.js` — update setupDOM, add togglePause/stopSession/crash-recovery tests for break form
- `src/app/uiManager.test.js` — add tests for break init functions
