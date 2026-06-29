# Save on Pause — Design Spec

**Date:** 2026-06-29
**Status:** New

## Objective

Save each work segment when Pause is pressed, eliminating `accumulatedPauseTime` from new sessions. Group related segments (work + breaks) in the UI via a shared `workBlockId`. Existing history remains readable without migration.

## Schema

- New field on session: `workBlockId: string | null`
- **New work segments**: share `workBlockId` generated at Start time
- **New break segments**: carry the same `workBlockId` as their parent work session
- **Legacy sessions**: treated as `workBlockId = id` at runtime (group of one, rest from `accumulatedPauseTimeSec || 0`)
- `accumulatedPauseTimeSec` kept on legacy records for correct rest display; new records omit it
- All display paths default with `accumulatedPauseTimeSec || 0`

## Tracker state

Replace `accumulatedPauseTime` with `workBlockId: string | null` and `segmentStartTime: number`.

## Event handlers

| Event | Action |
|---|---|
| **Start** | Generate `workBlockId`, set `segmentStartTime = now` |
| **Pause** | Save work segment `{workBlockId, segmentStartTime → now, isBreak: false}`. Reset `segmentStartTime = now`. Set `isPaused = true` |
| **Resume** | Save break segment `{workBlockId, pauseStart → now, isBreak: true}`. Set `isPaused = false` |
| **Stop** (running) | Save work segment `{workBlockId, segmentStartTime → now}`. Reset tracker. Open edit form |
| **Stop** (paused) | Save break segment `{workBlockId, pauseStart → now, isBreak: true}`. Reset tracker. _(No work segment — already saved at Pause)_ |

Edit form after Stop: allow editing tags/notes on the **last segment only** (simplest path; full multi-segment edit is future work).

## Tracker state machine

```
Start ──→ [Running] ──→ Pause ──→ [Paused] ──→ Resume ──→ [Running] ──→ Stop
                    (save work)               (save break)
```

State properties:
- `startTime: number` — remains the overall session wall-clock start (for display)
- `segmentStartTime: number` — start of current work segment (advances on each Pause)
- `workBlockId: string` — shared UUID across all related segments
- `isPaused: boolean`
- `pauseStart: number | null`

## UI grouping

**Recent Sessions**: group entries by `workBlockId`. Show:

```
┌─ 09:00–10:15 (65 min work, 10 min rest) ──────────────────┐
│  ► 09:00–09:25  +25m                                      │
│  ► 09:30–09:50  +20m                                      │
│  ► 09:55–10:15  +20m                                      │
│  Rest: 09:25–09:30, 09:50–09:55  (10 min total)           │
└───────────────────────────────────────────────────────────┘
```

- Default collapsed: one line showing total work + total rest time
- Expand to see individual sub-segments
- Single-segment groups (legacy or short blocks) display flat as today

**Grid mode**: renders groups (same as today but groups replace individual sessions).

## Stats / Aggregates

- No change: already filter `!isBreak` and sum `durationSec`.
- Group-level totals: sum work `durationSec` where `!isBreak` + sum break `durationSec` where `isBreak`, scoped to same `workBlockId`.

## Backward Compatibility

- Zero migration. Legacy sessions interpreted as single-segment groups via runtime `workBlockId = id`.
- Legacy breaks (no `workBlockId`) remain individual entries — no grouping logic applied.
- `accumulatedPauseTimeSec || 0` safety in all display paths for malformed legacy data.

## Files that change together

| File | Change |
|---|---|
| `src/app/constants.js` | Drop `accumulatedPauseTime`, add `workBlockId: null` |
| `src/app/sessionManager.js` | `startTracking` generates workBlockId, no accumulatedPauseTime; `stopTracking` no longer calculates/subtracts it; session object no longer carries `accumulatedPauseTimeSec` |
| `src/app/app.js` | `togglePause` Pause branch saves work segment, Stop branch handles final segment; remove accumulatedPauseTime from all tracker mutations |
| `src/app/uiManager.js` | `renderRecentSessions` groups by workBlockId, expandable sub-segments; `updateTimerDisplay` no longer reads `accumulatedPauseTime`; pause button unchanged |
| `src/app/uiManager.test.js` | Add grouping tests, legacy session display tests, segment-save tests |
| `src/app/app.test.js` | Update tracker mock shapes, add save-on-pause integration tests |
| `src/app/sessionManager.test.js` | Update tracker state assertions |
| `tasks/TODO.md` | Mark task in progress / done |

## Edge Cases

- **Pause <2s after start**: skip saving the work segment (too short to matter), same threshold as breaks.
- **Stop while running, no pauses**: save one work segment — identical duration result as today.
- **Stop while paused**: save break segment, no work segment needed (already saved at Pause).
- **Crash during running segment**: only the current unsaved sub-segment is lost (at most the time since last Pause), not the entire session.
