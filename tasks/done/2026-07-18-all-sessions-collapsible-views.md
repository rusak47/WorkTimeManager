# All-Sessions Collapsible Views — Spec

> **Status**: done
> **Date**: 2026-07-18
> **TODO reference**: `TODO.md` line 9-13

## Goal

Replace the flat "all sessions" list with a collapsible, paginated view that groups sessions by time period (year/month/week) and loads on demand.

## Current state

`renderAllSessions` (uiManager.js:777) renders all sessions grouped by date in a flat list. No collapsing, no pagination, no view switching. Sessions are rendered via `applyFilters` which already supports date/month/year/dayType filtering.

## Design

### View modes

Three toggle buttons above the session list: **Year** | **Month** | **Week**

| Mode | Groups | Default collapse | Expand reveals |
|------|--------|-----------------|----------------|
| Year | Months → Days → Sessions | Months collapsed | Month → shows days |
| Month | Weeks → Days → Sessions | Weeks collapsed | Week → shows days |
| Week | Days → Sessions | Days collapsed | Day → shows sessions |

### Initial load limit

Filter dropdowns (year, month) are pre-filled with current year/month on init. The collapsible grouping applies to the filtered set. View mode only controls grouping, not filtering.

### State

```js
// Add to store defaults
allSessionsView: 'month',  // 'year' | 'month' | 'week'
```

### Collapsible groups

Each group header is clickable:
- Chevron icon (`fa-chevron-right` → `fa-chevron-down` on expand)
- Group name (e.g., "July 2026", "Week 29", "Monday, Jul 14")
- Session count badge
- Total duration badge

Click toggles visibility of children. State tracked in a `Set` of expanded group IDs (in-memory, not persisted — reset on tab switch).

### Interaction with existing filters

The existing filter dropdowns (date/month/year/dayType) control which sessions are shown. `renderAllSessions` reads filters from DOM directly. View mode only changes grouping. All groups are expanded by default so filtered results are immediately visible.

## Files to modify

| File | Change |
|------|--------|
| `src/app/uiManager.js` | Rewrite `renderAllSessions` with collapsible groups, add view toggle rendering |
| `src/app/app.js` | Add view toggle event handlers, "show more" handler, persist view preference |
| `src/app/state.js` | Add `allSessionsView`, `allSessionsPeriod` to defaults |
| `src/storage/storage.js` | Add new fields to default state |
| `src/index.html` | Add view toggle buttons above `#all-sessions-list` |
| `src/css/styles.css` | Collapsible group styles (chevron rotation, group transitions) |

## Files to create

| File | Purpose |
|------|---------|
| `src/app/allSessionsView.test.js` | Unit tests for grouping logic, collapse/expand, pagination |

## Testing strategy

- Test grouping logic (year/month/week) independently of DOM
- Test collapse/expand state management
- Test "show more" pagination (loads previous period)
- Test filter interaction (filters apply before grouping)
- TDD: write tests first, implement to pass

## Out of scope

- Virtual scrolling (all sessions visible, just collapsed)
- Search/text filter (separate TODO item)
- Delete button in all-sessions (separate TODO item)
