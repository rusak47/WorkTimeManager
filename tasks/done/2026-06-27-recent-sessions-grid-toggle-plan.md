# Recent Sessions Grid/List Toggle Plan

## Problem
Recent sessions render as full-width vertical-stack cards (`space-y-3`). On wide displays, each card uses ~400px content but occupies the full ~1152px row — ~60% wasted space.

## Solution
Grid/List toggle button in the "Recent Sessions" header. Two card templates.

**List mode** (default, unchanged): current full-width vertical stack.

**Grid mode**:
- `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3` on `#recent-sessions`
- Compact card — info stacked vertically, notes hidden
- Duration/mood right-aligned in a compact column
- Text sizes via `clamp()` so content shrinks before columns drop

## Implementation

### Files to change
1. **`src/index.html`** — add toggle button in "Recent Sessions" header
2. **`src/app/uiManager.js`** — add `_isGridMode` state, toggle function, dual-template `renderRecentSessions`
3. **`src/app/app.js`** — wire toggle button click handler
4. **`src/app/uiManager.test.js`** — add tests for grid mode rendering

### State
- `let _isGridMode = false` inside uiManager closure (UI-only preference, no store)

### Grid card template
- Remove `flex justify-between items-start` — use vertical stack
- Move duration + mood into a single compact row
- Remove notes line entirely
- Tags + edit/delete buttons at bottom
- Smaller padding: `p-3` instead of `p-4`

## TDD Steps
1. Write failing tests for grid mode (`renderRecentSessions` with `_isGridMode=true`)
2. Implement grid card template in `renderRecentSessions`
3. Add toggle button + wire event
4. Verify all tests pass
