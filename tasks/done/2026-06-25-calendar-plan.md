# Calendar — Implementation Plan

## Assessment

| Task | Complexity | New Files | DOM Changes | Risk |
|------|-----------|-----------|-------------|------|
| B: Holiday info on tracker tab | Low (~30 lines) | 0 | Small banner | Minimal |
| A: Calendar tab view | Medium (~200 lines) | 1 | New tab + grid | Higher |

**Decision: Implement task B first** (current-session holiday info on tracker tab).

---

## Task B — Holiday info on tracker tab

### What
Show a small banner on the tracker tab indicating today's date type:
- Holiday name (e.g. "Midsummer — Holiday")
- Shifted workday (e.g. "Today is a shifted workday (from May 4)")
- Short day (e.g. "Short day — pre-holiday")
- Weekend / Workday (default, no banner needed)

### Data
`calendarService.getDayInfo(dateStr)` returns:
- `dayType`: 'workday' | 'weekend' | 'holiday'
- `isHoliday`, `isWeekend`
- `isShortDay`
- `name`, `localName` — holiday name
- `swapSource` — original date if shifted
- Falls back to base calendar if `holidays.json` is missing or has no entry for today

### Files

**src/app/uiManager.js** — add `updateTodayStatus(state)` function:
```
- Get today's date string (YYYY-MM-DD)
- Call getDayInfo(today)
- If no dayInfo or dayType is 'workday' and not short: hide banner
- Otherwise render text matching the day type
```

### Placement

Insert between the stats row and session-notes area, inside the main session card:

```html
<!-- line 75: end of stats grid -->
</div>

<!-- NEW — today status line -->
<div id="today-status" class="mt-4 text-sm">
  <!-- hidden by default; shown by JS when today is notable -->
</div>

<!-- line 77: session notes -->
<div id="session-notes" class="mt-6 hidden">
```

Rationale:
- Near "Today's Total" — same context (today's data)
- Above session notes — visible during and between sessions
- Doesn't touch the timer display area (top of card) — no risk of layout shift

### Size & Style

Compact single-line text, not a visual banner:
- Height: ~1 line of text (~24px)
- No background color, no border, no padding
- Text only: icon + message, e.g. `🌿 Midsummer — Holiday`
- Uses a small `<span>` inside `#today-status` so content can be swapped without affecting layout
- Margin: `mt-4` to space from stats row above

### Template compatibility

This is read-only display data — same class of UI as `#today-total`. When the template system (`docs/tracker-template-plan.md`) is implemented:
- Both `#today-status` and `#today-total` move into the template function
- The template decides where to place this element in its layout
- The data logic in `updateTodayStatus()` stays in uiManager (or migrates to the template module)
- No structural conflict — it's one text node, trivially portable

### Graceful degradation
- If `holidays.json` missing → calendarService returns base dayInfo (weekend/workday) → banner stays hidden (no notable day)
- If `holidays.json` exists but today not in it → same behavior
- No crash, no error state to handle

### Render logic

`#today-status` is always present in DOM but empty by default. `updateTodayStatus()` creates/replaces a single `<span>` child:

Priority order (first match wins, shows only the highest-priority case):

| Priority | Condition | Content |
|----------|-----------|---------|
| 1 | `isHoliday && isMemoriam` | `<span>🌿 {name} — Holiday / Memorial</span>` |
| 2 | `isHoliday` | `<span>🌿 {name} — Holiday</span>` |
| 3 | `swapSource` | `<span>🔁 Shifted workday (originally {swapSource})</span>` |
| 4 | `isShortDay` | `<span>⚠️ Short day — pre-holiday</span>` |
| 5 | `isMemoriam && dayType === 'workday'` | `<span>🕯️ {name} — Memorial Day</span>` |
| — | none of the above | Remove child span → empty, hidden |

Rationale for priority:
- **Holiday** is the most impactful for work tracking (day off by default)
- **Swapped workday** affects scheduling but isn't a holiday
- **Short day** affects work hours
- **Memoriam-only** (workday memorial) is informative but doesn't change work status

Edge case combinations:
- `isHoliday + isMemoriam` → shows "Holiday / Memorial" (both noted, holiday takes priority slot)
- `isHoliday + swapSource` → shouldn't occur in practice (holidays aren't swapped)
- `isHoliday + isShortDay` → unlikely (holidays aren't shortened), treated as holiday
- `isMemoriam + isShortDay` → unlikely combo, short day takes precedence over memoriam-only
- `isMemoriam + swapSource` → swap takes precedence; memoriam info would be lost unless we add a note. Evaluate if real data has this combo.
- `!name && isHoliday` → fallback text: "Holiday" (no name available)
- `name && !isHoliday && !isMemoriam` → shouldn't occur with current normaliseEntry
- `swapSource && isShortDay` → unlikely combo

Icons are inline emoji — no extra dependency.

### Test
- `calendarService.getDayInfo` returns correct info for holiday dates
- Banner renders for holidays
- Banner stays hidden for regular workdays
- Missing/empty data doesn't crash

---

## Task A — Calendar tab view (future)

### What
Full calendar grid tab with month navigation, holiday markers, shift indicators.

### Prerequisites
- Task B implementation (same data source, confirms graceful degradation path)
- A month grid renderer (new file: `src/app/calendarView.js` or in uiManager)
- New navigation tab in `index.html`
- Tab switching in `uiManager.js`
- Month navigation (prev/next)

### Data
`calendarService.getYearCalendar(year)` returns all 365/366 days with info.

### Graceful degradation
- Grid always renders based on internal calendar (weekdays/weekends are computed)
- `holidays.json` adds markers on top — if missing, grid shows only weekend highlighting
- No crash, no empty state
