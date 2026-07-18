# TODO

## Bugs
- [x] [low] — year selector dropdown in session view doesn't filter sessions when changed (2026-07-18)

## Sessions
- [ ] [normal+ - must have] Filter sessions by tags and/or text — input field with tag autocomplete/suggestion in the sessions tab.
- [ ] [normal - must have] Exclude breaks from totals chart rendering — allow tag-based filtering of which sessions count toward chart totals.
- [x] [normal++ - must have] add Limit for "all sessions" section to some value e.g last month. fluid flow - show more on demand. 
make buttons to switch view - year/month/week view.
year - sessions collapsed by month (Jan/Feb/...) - when pressing some month, this month weeks uncollapse 
month - sessions collapsed by weeks (Week 1/Week 2/... ) - when pressing some week, this week days uncollapse 
weeks - sessions collapsed by days (Mon/Tue/...) - when pressing some days its sessions uncollapse (spec: `tasks/done/2026-07-18-all-sessions-collapsible-views.md`, 2026-07-18)
- [ ] [normal - must have] Add delete button in all-sessions tab (currently only present in recent sessions preview).
- [ ] [low prior - maybe] Save session instantly, then open edit window for adjustments.
- [ ] [low priority - maybe] Show session start time on tracker tab while timer is running.
- [ ] [low priority - maybe] Support multiple notes per session (store as array).

## Statistics
- [ ] [low - must have] Add refresh button in statistics tab (auto-refresh on tab switch is insufficient).

## UI/UX
- [x] [rejected - doesnt happen] Prevent session from resetting when navigating between tabs while a session is running.
- [ ] [normal - WIP] Polish UI after deepsite attempt — visual redesign of main (tracker) tab and the rest tabs. Code refactored, UI implementation pending. Design template system plan at `tasks/new/20260626-tracker-template-plan.md`. ** think about adding support for different design templates for tracker view **
- [x] [high] - when in grid mode and session description is hidden add a tooltip with session description (spec: `tasks/done/2026-07-13-grid-card-note-tooltip.md`, 2026-07-13)
- [ ] [low - future] Set up E2E test infrastructure (Playwright) for full Electron app flows — listed as "future" in refactoring plan. Impact: UI regressions can slip past unit tests.
