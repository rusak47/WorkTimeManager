# Subtag-Stacked Daily Bar Chart + Split Tag Filters

**Impact:** Users can see daily time breakdown by subtag directly in the bar
chart, and filter by top-level tags vs subtags independently.

## Changes

### HTML
Split `#tag-filter` into two side-by-side multi-selects:
- `#tag-filter` — top-level tags (work/rest/study/sport/other + All)
- `#subtag-filter` — children subtags (all non-DEFAULT_TAGS from sessions)

### Filter logic (uiManager.js)
Combined union: session passes if `sess.tags` overlaps ANY selected tag at
either level. Same semantics as current single filter.

### Stacked bar chart (daily only)
Chart shows stacked-by-subtag bars in two cases:
- **(a)** 1 top-level tag selected, no children → stack by children subtags of
  that bucket (found in daily data)
- **(b)** 0 top-level selected (or All), ≥2 children selected → stack by those
  children subtags

All other combinations + weekly/monthly/yearly → simple total bar (unchanged).

Chart.js: multiple datasets (one per subtag), `scales.x/y.stacked: true`,
legend enabled, rotating ~15-color palette.

### Files changed
- `src/index.html` — add #subtag-filter
- `src/app/app.js` — populate #subtag-filter in init()
- `src/app/uiManager.js` — read both filters, stacked chart, color palette
- `src/app/uiManager.test.js` — setupDOM + stacked chart tests
- `src/app/app.test.js` — setupDOM
