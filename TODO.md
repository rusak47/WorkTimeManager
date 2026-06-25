# TODO

## Bugs
- [high] - unselected tags text in UI when saving session is not readable (color same as background)
- [low] - year selection in session view is not applied

## Sessions
- [ ] [normal - must have] Exclude breaks from totals chart rendering → allow tag-based filtering
- [ ] [normal+ - must have] Allow notes while session is running → inline work tagging (add toggeable hr with up/down arrow that hides/shows edit fields used when saving session)
- [ ] [low prior - maybe] Save session instantly, then open edit window
- [ ] [low priority - maybe] Multiple notes per session (array)
- [ ] [normal - must have] Limit "recent sessions" to today only
- [ ] [low priority - maybe] Show session start time while running
- [ ] [normal - must have] add delete session btn in session view panel like in main view
- [ ] [normal+ - must have] Filter by tags and/or text in session view - input field with tag suggestion

## Tags
- [ ] [low - maybe] Early tagging: select tag when starting session (dropdown on start button)
- [ ] [duplicate - related to note adding while session running] Allow entering custom tags on the fly
- [ ] [normal+ - must have] Filter statistics by subtags - specifically stored in session custom tags with #
- [ ] [normal++ - blocking - must have ] - when saving session, new tags (eg #tag) that dont exist in custom tags (and default list) should be added to custom. when '#' is entered into note textbox a suggestion of possible values from all tag lists should appear.

## Statistics
- [ ] [low - must have] Refresh button (auto-refresh on tab switch is not enough)
- [ ] [low+ - must have] Generate work stats by subtags <- need to review this mechanism: all tags configured, including custom should appear for filtering. maybe render it in similar way as on main page when saving session and use that for filtering.

## Calendar
- [ ] [low - must have] Calendar tab view with official holidays (calendar service already implemented)
- [ ] [low+ - must have; review parser module] information from holidays.json should be visible for current session - i.e is today a holiday/shifted date/etc (weekend/workday already covered by basic calendar).
- [ ] [rejected - already implemented as a separate module - out of scope] Fetch Latvian holidays from `rekini123.lv` and `likumi.lv`

## UI/UX
- [ ] [low - good to have - clarification needed: which view?] Last session preview — allow grid layout toggle - 1 session per row unnecessary consumes a lot of space
- [ ] [important - running session shouldnt reset while navigating or checking statistics on other panes] Check tab navigation while session is running
- [ ] [normal - WIP - code refactored/UI pending] Polish after deepsite attempt (modify UI based on earlier design work)

## Settings / Config
- [ ] [clarification/samples needed] Fix settings history export — session linkage broken on config changes (exports full session JSON backup to user selected directory)

## Modularity
- [ done or wip ] Re-try modularity approach with deepsite patterns
- [ ] [ low - check install and write instructions] Package as standalone Electron app

## Storage
- [x] Store/read data from persistent storage (Phase 3: IPC + localStorage fallback)
