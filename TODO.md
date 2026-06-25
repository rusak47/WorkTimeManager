# TODO

## Bugs
- [x] [high] — unselected tags text in session-save UI has same color as background, making it unreadable (CSS: added visible bg to `.tag`, removed `transparent`)
- [low] — year selector dropdown in session view doesn't filter sessions when changed

## Sessions
- [ ] [normal+ - must have] Allow notes while session is running — inline work tagging. Add a toggleable section (collapsible divider with up/down arrow) that reveals the same edit fields used when saving a session.
- [ ] [normal+ - must have] Filter sessions by tags and/or text — input field with tag autocomplete/suggestion in the sessions tab.
- [ ] [normal - must have] Exclude breaks from totals chart rendering — allow tag-based filtering of which sessions count toward chart totals.
- [ ] [normal - must have] Limit "recent sessions" section to today's sessions only.
- [ ] [normal - must have] Add delete button in all-sessions tab (currently only present in recent sessions preview).
- [ ] [low prior - maybe] Save session instantly, then open edit window for adjustments.
- [ ] [low priority - maybe] Show session start time on tracker tab while timer is running.
- [ ] [low priority - maybe] Support multiple notes per session (store as array).

## Tags
- [ ] [normal++ - blocking - must have] **#tag parsing in notes** — when `#` is typed in notes textbox, show suggestion dropdown of matching tags from all tag lists. New tags (e.g. `#newtag`) that don't exist in custom/default lists auto-add to custom tags on save.
- [ ] [normal+ - must have] Filter statistics by subtags — tags stored with `#` prefix in sessions should be filterable. All configured tags (custom + default) should appear as filter options.
- [ ] [low - maybe] Early tagging — tag picker on the "Start Session" button so sessions are tagged from the beginning.
- [ ] [duplicate — covered by #tag parsing above] Allow entering custom tags on the fly.

## Statistics
- [ ] [low+ - must have] Generate work stats by subtags — render tag filter similarly to session-save tag picker; all tags including custom should appear for filtering.
- [ ] [low - must have] Add refresh button in statistics tab (auto-refresh on tab switch is insufficient).

## Calendar
- [ ] [low+ - must have] Show current-session holiday info on tracker tab — highlight if today is a holiday, shifted workday, etc. (weekend/workday already covered by basic calendar).
- [ ] [low - must have] Calendar tab view with official holidays on a calendar grid (calendarService already implemented).
- [ ] [rejected — implemented as separate calendar2json module, out of scope] Fetch holidays from rekini123.lv and likumi.lv.

## UI/UX
- [ ] [important] Prevent session from resetting when navigating between tabs while a session is running.
- [ ] [normal - WIP] Polish UI after deepsite attempt — visual redesign of main (tracker) tab and the rest tabs. Code refactored, UI implementation pending. Design template system plan at `docs/tracker-template-plan.md`. ** think about adding support for different design templates for tracker view **
- [ ] [low - good to have] Add grid/list toggle for recent sessions on tracker tab (1 session per row is wasteful).

## Settings / Config
- [ ] [clarification/samples needed] Fix settings history export — session linkage breaks (work time vs rest - accumulated rest time/work time relationship) on config changes. Exports full session JSON backup to user-selected directory.

## Modularity
- [x] Modularity phase complete — code is split into dedicated modules (state, sessionManager, configManager, uiManager, calendarService, statsManager, accessibility, constants) wired through entry.js. Deep-site visual redesign tracked separately under UI/UX.
- [ ] [low] Package as standalone Electron app — check installation flow and write packaging instructions.

## Storage
- [x] Store/read data from persistent storage (Phase 3: IPC + localStorage fallback)
