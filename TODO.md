# TODO

## Bugs
- [low] — year selector dropdown in session view doesn't filter sessions when changed

## Sessions
- [ ] [normal++ - benefits?] - currently work session is not saved on pause, but accumulates brake time and is calculated afterwards. isnt it better to save work each time pause is pressed? what are the benefits - easier to calculate work time, no dependency on internal brake time accumulation, no sessions possible spanning over multiple days; possible cons - no behindhand work sessions possible (manual edit only or add shortcuts like move back -24h), one task sessions shattered in more pieces, e.g. 15min breaks. other ideas? (design spec: `tasks/new/20260629-save-on-pause-spec.md`)
- [ ] [normal+ - must have] when pressing pause show tags (rest selected by default) and notes field to enter break notes - if left empty, then keep default value. show no submit buttons - this is applied when pressing resume or stop.
- [ ] [normal+ - must have] Allow notes while session is running — inline work tagging. Add a toggleable section (collapsible divider with up/down arrow) that reveals the same edit fields used when saving a session.
- [ ] [normal+ - must have] Filter sessions by tags and/or text — input field with tag autocomplete/suggestion in the sessions tab.
- [ ] [normal - must have] Exclude breaks from totals chart rendering — allow tag-based filtering of which sessions count toward chart totals.
- [ ] [normal++ - must have] add Limit for "all sessions" section to some value e.g last month. fluid flow - show more on demand. 
make buttons to switch view - year/month/week view.
year - sessions collapsed by month (Jan/Feb/...) - when pressing some month, this month weeks uncollapse 
month - sessions collapsed by weeks (Week 1/Week 2/... ) - when pressing some week, this week days uncollapse 
weeks - sessions collapsed by days (Mon/Tue/...) - when pressing some days its sessions uncollapse
- [ ] [normal - must have] Add delete button in all-sessions tab (currently only present in recent sessions preview).
- [ ] [low prior - maybe] Save session instantly, then open edit window for adjustments.
- [ ] [low priority - maybe] Show session start time on tracker tab while timer is running.
- [ ] [low priority - maybe] Support multiple notes per session (store as array).

## Tags
- [ ] [normal++ - blocking - must have] **#tag parsing in notes** — when `#` is typed in notes textbox, show suggestion dropdown of matching tags from all tag lists. New tags (e.g. `#newtag`) that don't exist in custom/default lists auto-add to custom tags on session save.
- [ ] [normal+ - must have] Filter statistics by subtags — tags stored with `#` prefix in sessions should be filterable. All configured tags (custom + default) should appear as filter options.
- [ ] [low - maybe] Early tagging — tag picker on the "Start Session" button so sessions are tagged from the beginning.
- [ ] [duplicate — covered by #tag parsing above] Allow entering custom tags on the fly.

## Statistics
- [ ] [low+ - must have] Generate work stats by subtags — render tag filter similarly to session-save tag picker; all tags including custom should appear for filtering.
    - Daily statistics - each bar is a subset of core tags per each session it consists of. 
- [ ] [low - must have] Add refresh button in statistics tab (auto-refresh on tab switch is insufficient).

## UI/UX
- [x] **P3-E**: long press on start shows a tooltip to select default tag for this session (eg rest/study/sports/other, work is enabled by default so its placed at the end of selection)
- [ ] [important] Prevent session from resetting when navigating between tabs while a session is running.
- [ ] [normal - WIP] Polish UI after deepsite attempt — visual redesign of main (tracker) tab and the rest tabs. Code refactored, UI implementation pending. Design template system plan at `tasks/new/tracker-template-plan.md`. ** think about adding support for different design templates for tracker view **
- [ ] [high] - when in grid mode and session description is hidden add a tooltip with session description
- [ ] [low - tech debt] Replace Font Awesome CDN with npm import (`@fortawesome/fontawesome-free`) — still loaded from `cdnjs.cloudflare.com` in `index.html:7`. Impact: removes external dependency, enables offline use, aligns with Phase 7 CDN-removal goal.
- [ ] [low - tech debt] Add `src/js/utils.js` unit tests — utility functions (date/number formatting) lack coverage. Medium priority in refactoring plan Phase 8, never written.
- [ ] [low - future] Set up E2E test infrastructure (Playwright) for full Electron app flows — listed as "future" in refactoring plan. Impact: UI regressions can slip past unit tests.


