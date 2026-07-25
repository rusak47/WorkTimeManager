# Collapsible Days in Month View

> **Status**: done
> **Date**: 2026-07-25
> **TODO reference**: `TODO.md` line 14 (done 2026-07-25)

## Goal

Extend the month view's collapsible hierarchy so days within weeks are collapsible (like weeks already are), and add summary stats to week headers.

## Current state

Month view (`uiManager.js:914-923`):
- Weeks are collapsible via `renderGroup` + `renderGroupHeader`
- Days within weeks render via `renderDaySessions` — always expanded, no collapsing
- Day header shows date + day type badge, no duration
- Week header shows week number + session count + total duration

## Design

### New hierarchy

```
Week 29 — AVG 7h 01m (collapsible) ← add average
  ├── Monday, Jul 14 — 8h 30m (collapsible) ← NEW: collapsible + duration
  │     ├── Session card
  │     └── Session card
  └── Tuesday, Jul 15 — 6h 00m (collapsible) ← NEW: collapsible + duration
        └── Session card
```

### Week header changes

- **Before**: `Week 29` + session count + total duration
- **After**: `Week 29 — AVG 7h 01m` + session count + total duration
- Average = total duration / number of days with sessions (not total calendar days)
- Format: `AVG` + `formatDuration(totalSec / dayCount)`

### Day collapsing

- Each day becomes a collapsible group using existing `renderGroup` pattern
- Day group ID: `day-${date}` (e.g., `day-2026-07-14`)
- Day header shows: date (weekday, month, day, year) + day type badge + **total work time**
- Click toggles visibility of session cards within that day
- Default state: one day per week is expanded (so filtered results are immediately visible), the rest - collapsed

### Interaction with existing collapse

- `expandedGroups` Set already tracks expanded state for week groups
- Day groups use the same Set with `day-${date}` IDs
- Toggling a week collapses/expands all its days implicitly (existing behavior)
- Individual day collapse is independent within an expanded week

## Files to modify

| File | Change |
|------|--------|
| `src/app/uiManager.js` | Rewrite `renderDaySessions` to use `renderGroup` pattern; update week header label to include average |
| `src/app/allSessionsView.test.js` | Add tests for day-level collapse, average calculation |

## Files unchanged

| File | Why |
|------|-----|
| `src/app/app.js` | `toggleAllSessionGroup` already handles any group ID via `expandedGroups` |
| `src/app/allSessionsView.js` | Grouping logic unchanged — day groups are rendered, not restructured |
| `src/index.html` | No new DOM elements needed |
| `src/css/styles.css` | `.collapsible-group` and `.group-header` styles already apply |

## Testing strategy

- Test average calculation: total duration / day count
- Test day group IDs follow `day-${date}` pattern
- Test that `renderGroup` is called for each day (mock verify)
- Edge case: week with 0 sessions (should not render)
- Edge case: day with 0 sessions (should not render)
- TDD: write tests first, implement to pass

## Out of scope

- Persisting expanded/collapsed state across tab switches (existing behavior: reset on switch)
- Year view day collapsing (separate enhancement)
- Keyboard navigation for collapse/expand (future)
