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

**src/index.html** — add a small banner element in the tracker tab:
```html
<div id="today-status" class="mb-4">
  <!-- populated by JS -->
</div>
```

### Graceful degradation
- If `holidays.json` missing → calendarService returns base dayInfo (weekend/workday) → banner stays hidden (no notable day)
- If `holidays.json` exists but today not in it → same behavior
- No crash, no error state to handle

### Render logic
| Condition | Banner text |
|-----------|------------|
| `isHoliday` | "{name} — Holiday" |
| `isShortDay` | "Short day (pre-holiday)" |
| `swapSource` | "Today is a shifted workday from {swapSource}" |
| otherwise | hidden |

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
