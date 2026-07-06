# Save on Pause — Design Spec

**Date:** 2026-06-29
**Status:** New

## Objective

Save each work segment when Pause is pressed, eliminating `accumulatedPauseTime` from new sessions. Group related segments (work + breaks) in the UI via a shared `workBlockId`. Existing history remains readable without migration.

## Decisions (2026-07-06)

- **Timer toggle**: clicking `#active-duration` during running state toggles between current segment duration and total work block duration — same pattern as `_showCurrentRest` toggle during paused state. No separate toggle UI element.
- **All Sessions grouping**: both Recent Sessions and All Sessions views group by `workBlockId`.
- **Delete behavior**: deleting the collapsed group parent removes all segments sharing that `workBlockId`; deleting an expanded sub-segment removes only that segment. Grouping is UI-only (no partial state).
- **Edit form after Stop**: populate from the just-saved segment's data, not from tracker state. Preserve `workBlockId` on edit. Target is the most recent work segment (not the break segment when Stop-while-paused).

## Schema

- New field on session: `workBlockId: string | null`
- **New work segments**: share `workBlockId` generated at Start time
- **New break segments**: carry the same `workBlockId` as their parent work session
- **Legacy sessions**: treated as `workBlockId = id` at runtime (group of one, rest from `accumulatedPauseTimeSec || 0`)
- `accumulatedPauseTimeSec` kept on legacy records for correct rest display; new records omit it
- All display paths default with `accumulatedPauseTimeSec || 0`

## Tracker state

Replace `accumulatedPauseTime` with `workBlockId`, `segmentStartTime`, and `totalSavedDurationMs`.

```
CURRENT_SESSION_INIT = {
  startTime: null,
  isPaused: false,
  pauseStart: null,
  segmentStartTime: null,
  workBlockId: null,
  totalSavedDurationMs: 0,
  isBreak: false,
};
```

## Event handlers

| Event | Action |
|---|---|
| **Start** | Generate `workBlockId`, set `segmentStartTime = now`, `totalSavedDurationMs = 0` |
| **Pause** | Save work segment `{workBlockId, segmentStartTime → now, isBreak: false}`. `totalSavedDurationMs += (now - segmentStartTime)`. Set `isPaused = true` |
| **Resume** | Save break segment `{workBlockId, pauseStart → now, isBreak: true}`. Set `segmentStartTime = now`, `isPaused = false` |
| **Stop** (running) | Save work segment `{workBlockId, segmentStartTime → now}`. Open edit form with segment data. Reset tracker. |
| **Stop** (paused) | Save break segment `{workBlockId, pauseStart → now, isBreak: true}`. Open edit form for the most recent **work** segment. Reset tracker. |

Edit form after Stop: populate from the just-saved segment's data (not tracker state). Preserve `workBlockId` on edit. Full multi-segment edit is future work.

### Timer display formulas

| State | `_showSegmentOnly=true` (default) | `_showSegmentOnly=false` (toggled) |
|---|---|---|
| Running | `now - segmentStartTime` | `(now - segmentStartTime) + totalSavedDurationMs` |
| Paused | Current rest: `now - pauseStart` | Total rest: `(now - pauseStart) + accumulatedPauseTime` |

Click `#active-duration` during running toggles `_showSegmentOnly`; during paused toggles `_showCurrentRest` (same as today).

## Tracker state machine

```
Start ──→ [Running] ──→ Pause ──→ [Paused] ──→ Resume ──→ [Running] ──→ Stop
                    (save work)               (save break)
```

State properties:
- `startTime: number` — overall session wall-clock start (for display)
- `segmentStartTime: number` — start of current work segment (advances on each Pause)
- `workBlockId: string` — shared UUID across all related segments
- `isPaused: boolean`
- `pauseStart: number | null`
- `totalSavedDurationMs: number` — sum of all completed work segment durations in this block (for timer toggle display)

## UI grouping

**Both Recent Sessions and All Sessions** group entries by `workBlockId`. Within each date block (`renderAllSessions`), sessions sharing a `workBlockId` render as a single collapsible group. Show:

```
┌─ 09:00–10:15 (65 min work, 10 min rest) ──────────────────┐
│  ► 09:00–09:25  +25m                                      │
│  ► 09:30–09:50  +20m                                      │
│  ► 09:55–10:15  +20m                                      │
│  Rest: 09:25–09:30, 09:50–09:55  (10 min total)           │
└───────────────────────────────────────────────────────────┘
```

- Default collapsed: one line showing total work + total rest time
- Expand to see individual sub-segments with their own edit/delete buttons
- Single-segment groups (legacy or short blocks) display flat as today

**Grid mode** (Recent Sessions only): renders groups (same as today but groups replace individual sessions).

### Delete behavior

- **Collapsed group parent delete**: removes all sessions sharing that `workBlockId` — confirm with "Delete N segments?" dialog.
- **Expanded sub-segment delete**: removes only that single segment. Group recalculates (remaining segments, or collapses to flat if one left).
- Grouping is UI-only — `workBlockId` is a stored field, but grouping/ungrouping never mutates it. No partial-state issues.

## Stats / Aggregates

- No change: already filter `!isBreak` and sum `durationSec`.
- Group-level totals: sum work `durationSec` where `!isBreak` + sum break `durationSec` where `isBreak`, scoped to same `workBlockId`.

## Backward Compatibility

- Zero migration. Legacy sessions interpreted as single-segment groups via runtime `workBlockId = id`.
- Legacy breaks (no `workBlockId`) remain individual entries — no grouping logic applied.
- `accumulatedPauseTimeSec || 0` safety in all display paths for malformed legacy data.

## Files that change together

| File | Change |
|---|---|---|
| `src/app/constants.js` | Replace `accumulatedPauseTime` with `workBlockId: null`, `segmentStartTime: null`, `totalSavedDurationMs: 0` |
| `src/app/sessionManager.js` | `startTracking` generates workBlockId, no accumulatedPauseTime; `stopTracking` no longer calculates/subtracts it; session object no longer carries `accumulatedPauseTimeSec`; `pauseTracking`/`resumeTracking` don't touch accumulatedPauseTime |
| `src/app/app.js` | `togglePause` Pause branch saves work segment + increments `totalSavedDurationMs`, Resume branch saves break; `stopSession` saves final segment, opens edit form with segment data (not tracker); edit populates from saved segment, preserves `workBlockId` |
| `src/app/uiManager.js` | `renderRecentSessions` groups by workBlockId, collapsible accordion, sub-segment edit/delete; `renderAllSessions` same grouping within each date block; `updateTimerDisplay` uses `segmentStartTime` + `totalSavedDurationMs`, click-to-toggle during running (`_showSegmentOnly`); delete handler: parent → delete all by workBlockId, sub-segment → delete single |
| `src/app/uiManager.test.js` | Grouping tests, legacy flat fallthrough, sub-segment delete, timer toggle, segment-save UI wiring |
| `src/app/app.test.js` | Update tracker mock shapes, save-on-pause integration, edit-form-from-segment |
| `src/app/sessionManager.test.js` | Update tracker state assertions (no accumulatedPauseTime, workBlockId present) |
| `src/index.html` | No changes needed (toggle uses existing `#active-duration` click) |
| `tasks/TODO.md` | Mark task in progress / done |

## Edge Cases

- **Pause <2s after start**: skip saving the work segment (too short to matter), same threshold as breaks.
- **Stop while running, no pauses**: save one work segment — identical duration result as today.
- **Stop while paused**: save break segment, edit form opens for the most recent work segment (not the break).
- **Crash during running segment**: only the current unsaved sub-segment is lost (at most the time since last Pause), not the entire session. (should be already covered by failure-recovery system)
- **Double-click Pause/Resume**: idempotent guards — `if (isPaused)` early-return in Pause, `if (!isPaused)` early-return in Resume.
- **Delete collapsed parent with one segment**: no special case — "delete N segments" where N=1 is just a normal single delete, no confirmation increase needed.
- **Edit sub-segment start/end times**: user can adjust sub-segment times in the edit modal. No cross-segment validation yet (future work).
- **No `accumulatedPauseTimeSec` on new sessions**: `handleSessionFormSubmit` must not read `restInput` value for new-style sessions (those with `workBlockId`). Legacy edit preserves existing `accumulatedPauseTimeSec` via `updateSession` spread.
