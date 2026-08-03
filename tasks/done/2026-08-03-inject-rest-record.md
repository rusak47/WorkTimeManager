# Inject Rest Record (retroactive break) — Spec

> **Status**: done
> **Date**: 2026-08-03
> **TODO reference**: `TODO.md` line 7 (Tracker) — `[x]` (2026-08-03)

## Goal

While a work session is running (active, **not** in break/pause mode), let the
user inject a retroactive rest/break record. A popup asks for the **rest start
time** and **duration**. Based on that:

1. The current work segment is saved: `[segmentStartTime → rest_start]`
2. A break session is saved: `[rest_start → rest_end (= rest_start + duration)]`
3. The running timer continues from `rest_end` — `segmentStartTime` is moved to
   `rest_end`, and `totalSavedDurationMs` is advanced by the elapsed work time.

No stop, no pause. The tracker keeps running.

## Current state

`togglePause()` (`app.js:302-370`) is the existing live break flow: it saves a
work segment ending at `Date.now()`, then (on resume) saves a break session
`[pauseStart → now]` and calls `sessionManager.resumeTracking()`
(`sessionManager.js:105-117`) which sets `segmentStartTime = now`.

This feature is the same operation with **user-specified timestamps instead of
`now`**, applied to a **running (unpaused)** tracker. No data-model change:
work + break segments sharing a `workBlockId` already coexist in
`store.getState().sessions` (see `src/app/AGENTS.md` — state aggregates + break
sessions stored alongside work sessions).

Timer display math that already handles saved segments:
`uiManager.js:424-444` — running elapsed = `segSec + savedMs/1000` where
`segSec = now - segmentStartTime`; `totalSavedDurationMs` is advanced as work
segments are committed (`app.js:358`).

## Design

### Trigger / UI

**Long-press (hold ~500ms) on the Pause button** opens the inject-rest modal —
mirroring the existing Start-button long-press pattern (`app.js` start-btn
handlers). A short press still toggles pause/resume. No separate button.

The pause button's press handlers are wired in `setupEventListeners()`:

```
mousedown:  if (!tracker.startTime || tracker.isPaused) return;
            500ms timer → pauseLongPress = true; ui.showInjectRestModal()
mouseup:    if (pauseLongPress) { pauseLongPress = false; return; }  // no toggle
            else togglePause()
mouseleave/touchcancel: clear timer
touchstart/touchend: same as mousedown/mouseup ({ passive: true })
```

Guards: the long-press only fires while a session is running and **not**
paused (paused = already in break mode — no injection).

The modal (patterned on `session-modal`, id `inject-rest-modal`):

```html
<div id="inject-rest-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
  <div class="bg-white dark:bg-gray-700 rounded-xl p-6 w-90% max-w-md">
    <h3 class="text-lg font-bold mb-4">Inject Rest Record</h3>
    <div id="inject-rest-error" class="text-sm text-red-500 mb-3 hidden"></div>
    <label>Duration (minutes)
      <input type="number" id="inject-rest-duration" min="1" value="15" class="w-full mt-1 ...">
    </label>
    <div class="flex justify-end gap-2 mt-4">
      <button id="inject-rest-cancel" ...>Cancel</button>
      <button id="inject-rest-confirm" ...>Confirm</button>
    </div>
  </div>
</div>
```

**No rest-start input.** The rest start is derived: `restStartMs = Date.now() - durationSec * 1000`
(rest ends now, start = duration ago). Because rest end always equals `now`, the
"break ends in the future" guard can no longer trigger from the UI; the
"rest start before segment start" guard becomes "duration exceeds the current
segment's elapsed time".

### Duration input

`inject-rest-duration` is a `<input type="number" min="1" value="15">` in minutes.
The handler multiplies by 60 → seconds before calling `injectRest`.

### Logic

`sessionManager.injectRest(restStartMs, durationSec, formValues)` — new method,
mirrors `stopTracking`/`stopSession` shapes. Pure store logic (no DOM).

```
restEndMs = restStartMs + durationSec * 1000
now = Date.now()
validate:
  tracker.startTime                                 -> else { error: 'not running' }
  !tracker.isPaused                                 -> else { error: 'pause first' }
  restStartMs >= tracker.segmentStartTime           -> else { error: 'before current segment start' }
  durationSec > 0                                   -> else { error: 'invalid duration' }
  restEndMs <= now                                  -> else { error: 'break ends in the future' }
1. work segment (isBreak:false, tags/mood/notes from formValues):
   { startTime: segmentStartTime, endTime: restStartMs,
     durationSec: (restStartMs - segmentStartTime)/1000,
     workBlockId, dayType, ...formValues }        -> sessionManager.addSession(...)
2. break session (isBreak:true, tags ['rest']):
   { startTime: restStartMs, endTime: restEndMs,
     durationSec, workBlockId, dayType, ... }     -> sessionManager.addSession(...)
3. tracker update:
   totalSavedDurationMs += (restStartMs - segmentStartTime)
   segmentStartTime = restEndMs
   -> store.setState({ tracker })   (keep running: no isPaused change)
return { workSession, breakSession }
```

Notes / mood for the break fall back to manager defaults
(`{ notes:'Break session', tags:['rest'], mood:5 }`) with a `dayType` override
computed from the rest-start date — keeps the popup to two fields as specced.
The **work** segment uses `readTrackerFormValues()` (`app.js:151-173`) so
currently-typed notes/tags/mood attach to the just-closed work slice.

> **Work segment duration**: the work segment's `duration`/`durationSec` MUST be
> computed as `(restStartMs - segmentStartTime) / 1000`, NOT the break's
> `durationSec`. (Caught by E2E: a 29.9s work window was recorded as 60s.)

### App.js handler

`injectRestBreak()` (inside `createEventHandlers`):

```
read duration (number, minutes) -> *60 sec
restStartMs = Date.now() - durationSec * 1000   (rest ends now)
formValues = readTrackerFormValues() + dayType (from segmentStartTime date)
breakValues = { dayType } (from restStart date)
result = sessionManager.injectRest(restStartMs, durationSec, formValues, breakValues)
if result.error -> show in #inject-rest-error, return
hide modal, clear error, persistAndRender() (saves backup mid-session)
```

Event wiring (createEventHandlers):
- Pause button press handlers → long-press opens modal / short-press toggles pause
- `#inject-rest-cancel` click → `ui.hideInjectRestModal()`
- `#inject-rest-confirm` click → `injectRestBreak()`

### Persistence

Mid-session `saveState()` (`app.js:102-125`) already clones `s.tracker` with
`backupNotes`/`backupMood` when `tracker.startTime` is truthy — the injected
break mutates `segmentStartTime`/`totalSavedDurationMs` on the tracker object,
so the next backup interval captures the new lap start automatically. No extra
persistence work.

## Files to modify

| File | Change |
|------|--------|
| `src/app/sessionManager.js` | add `injectRest(restStartMs, durationSec, formValues, breakValues)` |
| `src/app/app.js` | `injectRestBreak()` handler; pause long-press handlers in `setupEventListeners`; wiring for `#inject-rest-cancel`/`#inject-rest-confirm` |
| `src/app/uiManager.js` | `showInjectRestModal()` (pre-fill rest start = now, duration = 15), `hideInjectRestModal()` |
| `src/index.html` | `inject-rest-modal` markup (no extra button — long-press on Pause) |
| `src/app/sessionManager.test.js` | validation (4 error paths), segment split with distinct work/break durations, `totalSavedDurationMs`+`segmentStartTime` mutation |
| `src/app/app.test.js` | setupDOM modal ids; long-press opens modal / short-press pauses; confirm writes two sessions + `persistAndRender`; error shown on bad input |
| `src/app/uiManager.test.js` | setupDOM modal ids; `showInjectRestModal`/`hideInjectRestModal` prefill + error clear |

## Files to create

| File | Purpose |
|------|---------|
| (none beyond tests above) | logic lives in existing tested modules |

## Testing strategy (TDD)

1. `sessionManager.test.js`: with `vi.useFakeTimers` + fixed `Date.now` —
   - rest_end in future → error
   - rest_start before segmentStartTime → error
   - paused tracker → error
   - duration <= 0 → error
   - valid call → work session endTime == rest_start, break session startTime == rest_start, endTime == rest_end, tracker.segmentStartTime == rest_end, tracker.totalSavedDurationMs == elapsed work
2. `app.test.js`: setupDOM mirrors production (modal ids); long-press on
   `#pause-btn` (mousedown → 500ms+ → mouseup) opens modal without pausing;
   short press still toggles pause; long-press while paused opens nothing;
   confirm flow writes two sessions + `persistAndRender` called; bad input
   surfaces error text and does not mutate state.
3. `uiManager.test.js`: setupDOM adds modal ids; `showInjectRestModal` prefills
   rest start/duration and clears error; `hideInjectRestModal` hides + clears.

## Out of scope

- Editing the injected rest record later (reuse existing `editSession`).
- Undo of an injection (sessions are appended — delete via existing flow).
- Multiple simultaneous rest intervals (call the popup repeatedly).
- `isBreak` (startTracking break-mode) path — unused in the current start flow; guarded by `!isPaused` only.
