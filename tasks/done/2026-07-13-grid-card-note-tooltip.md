# Grid Card Note Tooltip

## Summary
When hovering a grid-mode session card in Recent Sessions, show the session note in a native browser tooltip.

## Behavior
- Grid card (`.session-card-grid`) gets a `title` attribute containing `session.notes`
- If no notes exist, no `title` attribute (avoids empty tooltip flicker)
- List mode unchanged (notes already visible inline)
- Native browser tooltip — consistent with existing `title`-based tooltips in calendarView and today-status banner

## Files
- `src/app/uiManager.js` — `renderRecentSessions()` grid template (line 648)
- `src/app/uiManager.test.js` — `renderRecentSessions` grid tests (line 413)

## Acceptance
- Grid card with notes shows tooltip on hover
- Grid card without notes shows no tooltip
- List mode unaffected
- All tests pass
