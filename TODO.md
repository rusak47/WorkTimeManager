# TODO

## Bugs
- [x] [high] — stopSession now saves break session when paused (added break-session creation + accumulatedPauseTime update before reset)
- [x] [high] — unselected tags text in session-save UI has same color as background, making it unreadable (CSS: added visible bg to `.tag`, removed `transparent`)
- [x] [high] — June 22 swapped_day_off shows as holiday — short status now propagates from `swap_source` entry's `is_short_day` field to `swapped_workday` via `buildDayInfo` propagation logic
- [low] — year selector dropdown in session view doesn't filter sessions when changed

## Sessions
- [ ] [high - critical] when electron app crashes running session (paused or working) is lost. need to plan a backup scheme that will periodically save a current status and restore it on start
- [ ] [normal+ - must have] when pressing pause show tags (rest selected by default) and notes field to enter break notes - if left empty, then keep default value. show no submit buttons - this is applied when pressing resume or stop.
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
- [x] [done] Show current-session holiday info on tracker tab — today-status banner with holidays, memorial days, swapped days, short days from calendar JSON + user overrides.
- [x] [done] Calendar tab view with official holidays on a calendar grid (calendarService already implemented). (only if {year}-holidays.json is present)
- [x] [rejected — implemented as separate calendar2json module, out of scope] Fetch holidays from rekini123.lv and likumi.lv.
- [x] [high] Calendar visual polish — all items done per `tasks/calendar_color_design_feedback.txt` and dark theme per `tasks/calendar_color_design_dark_theme_feedback.txt`

## UI/UX
- [x] [fixed] Tailwind dark variant scoped to `.dark-mode` class — fixes Electron having no way to switch theme when OS is in dark mode (`@variant dark` in styles.css)
- [ ] [important] Prevent session from resetting when navigating between tabs while a session is running.
- [ ] [normal - WIP] Polish UI after deepsite attempt — visual redesign of main (tracker) tab and the rest tabs. Code refactored, UI implementation pending. Design template system plan at `docs/tracker-template-plan.md`. ** think about adding support for different design templates for tracker view **
- [ ] [low - good to have] Add grid/list toggle for recent sessions on tracker tab (1 session per row is wasteful).

## Settings / Config
- [x] [clarification/samples needed] Fix settings history export — session linkage breaks (work time vs rest - accumulated rest time/work time relationship) on config changes. Exports full session JSON backup to user-selected directory.

## Modularity
- [x] Modularity phase complete — code is split into dedicated modules (state, sessionManager, configManager, uiManager, calendarService, statsManager, accessibility, constants) wired through entry.js. Deep-site visual redesign tracked separately under UI/UX.
- [x] [low] Package as standalone Electron app — check installation flow and write packaging instructions.

## Storage
- [x] Store/read data from persistent storage (Phase 3: IPC + localStorage fallback)
