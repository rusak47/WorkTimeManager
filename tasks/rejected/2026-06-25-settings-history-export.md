# Settings History Export — Rejected

## Original Idea
Export full session JSON backup to user-selected directory, with correct session linkage (work time vs rest) on config changes.

## Status
**Rejected** — the core bug (accumulatedBreakTime breaking after editing a session via edit form) was fixed. The remaining issue is the break-time-accumulation approach itself, which is superseded by the save-on-pause feature (`tasks/new/20260629-save-on-pause-spec.md`) — that task eliminates break-time accumulation entirely by saving work segments on each pause.

## Reason
No longer relevant. The fundamental design flaw (accumulating break time on a session span rather than persisting discrete segments) is being replaced by save-on-pause, which makes the export linkage problem moot.
