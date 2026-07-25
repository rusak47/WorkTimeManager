# Paginated All Sessions List

> **Status**: done
> **Date**: 2026-07-25
> **TODO reference**: `TODO.md` line 9 (partial — "fluid flow - show more on demand")

## Goal

Limit the all sessions list to show an initial batch of top-level items, with a "More" button to load additional batches on demand. Applies to all views (year, month, week).

## Current state

`uiManager.js:903-956` renders all groups into `container` without pagination. With 12+ months or weeks, the list becomes excessively long.

## Design

### Behavior

- Initial render shows `PAGE_SIZE` (8) top-level groups
- If more groups exist, a "More" button appears at the bottom
- Clicking "More" reveals the next batch of `PAGE_SIZE` items
- No "Less" button — once loaded, items stay visible
- Page count resets on view change (year/month/week) or filter change

### Visual

```
[Month/Week/Day group 1]
[Month/Week/Day group 2]
...
[Month/Week/Day group 8]
[More (12)]              ← button with remaining count
```

### Constants

Add `PAGE_SIZE = 8` to `src/app/constants.js`. Configurable via code; UI settings pane is future work.

### State

Add `allSessionsPageCount` variable in `renderAllSessions` closure scope. Defaults to 1 on view/filter change.

### Rendering logic

```
entries = Object.entries(grouped)
visibleCount = allSessionsPageCount * PAGE_SIZE
visibleEntries = entries.slice(0, visibleCount)

for each visibleEntries → renderGroup(...)

if (entries.length > visibleCount) {
  append "More" button showing: More (${entries.length - visibleCount})
}
```

### Click handler

In `app.js:985-991` delegation block, add handler for `.all-sessions-more`:
1. Increment `allSessionsPageCount`
2. Call `renderAllSessions()` to re-render with expanded list

### Reset triggers

`allSessionsPageCount = 1` when:
- View changes (year ↔ month ↔ week)
- Tag filter changes
- Year/month filter changes

## Files to modify

| File | Change |
|------|--------|
| `src/app/constants.js` | Add `PAGE_SIZE = 8` |
| `src/app/uiManager.js` | Paginate rendering in `renderAllSessions`; export `resetAllSessionsPage()` |
| `src/app/app.js` | Handle `.all-sessions-more` click; call reset on view/filter changes |
| `src/css/styles.css` | Style `.all-sessions-more` button |

## Files unchanged

| File | Why |
|------|-----|
| `src/app/allSessionsView.js` | Grouping logic unchanged — pagination is purely a render concern |
| `src/index.html` | Button is dynamically created |

## Testing strategy

- Test: initial render shows at most `PAGE_SIZE` items
- Test: "More" button appears when items > PAGE_SIZE
- Test: "More" button hidden when items ≤ PAGE_SIZE
- Test: clicking "More" shows next batch
- Test: remaining count decreases after click
- Test: no "More" button after all items revealed
- Test: page count resets on view change
- Test: page count resets on filter change
- TDD: write tests first, implement to pass

## Out of scope

- UI settings pane for PAGE_SIZE (future)
- Virtual scrolling / lazy DOM rendering (not needed for personal app scale)
- Persisting page count across sessions