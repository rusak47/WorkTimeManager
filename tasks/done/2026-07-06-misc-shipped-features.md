# Miscellaneous Shipped Features (2026-07-06)

Consolidated record for standalone features that shipped without
individual task specs. Each item was verified working at the time
of the commit referenced.

## P3-E: Long-press on Start — default tag selection

- Long-pressing Start shows a tooltip to select a non-default tag
  for the upcoming session (rest/study/sport/other; work is default
  and placed at end of selection).
- Fixed: when stopping a session started via long-press, the
  selected tag was dropped and "work" was used instead. Now
  correctly applies the long-press-selected tag when stopping.
- Related: P3-E tooltip also appears on Start button.

## Allow notes while session is running (inline work tagging)

- Toggleable section on the tracker tab with notes/tags/mood fields
  visible from session start.
- Values captured at pause/stop time via `readTrackerFormValues()`.
- Previously only break form had editable fields mid-session.

## Edit session preserves legacy subtags not in tagBuckets

- Bug: `renderRow2()` early-returned when `tagBuckets[bucket]` was
  empty, skipping legacy subtag rendering. Fix: wrap toggleable
  block in `if (subtags.length > 0)`, keep legacy code
  unconditional.
- Legacy tags render as `.tag-chip.selected.readonly` so
  `handleSessionFormSubmit()` preserves them on save.
- Shipped inline with tag bucket P2–P3 work.

## Tag features (#tag dropdown, auto-add, filter by subtags)

- #tag dropdown in notes: when `#` typed, shows suggestion dropdown
  of matching tags from all tag lists. (P3-F)
- #tag auto-add: new `#newtag` values auto-add to custom tags on
  session save. Strips `#tag` mentions from saved notes.
- Filter statistics by subtags: all configured tags appear as
  filter options in statistics tab.
- All shipped inline with tag bucket feature family.

## Bucketed statistics & subtag-stacked chart

- P3-G: bucketed statistics section in stats tab — time grouped
  by default buckets with subtag drill-down.
- Work stats by subtags: tag filter in stats tab; daily bars show
  subtag-stacked segments when drilling into one bucket.
- Per `tasks/done/2026-07-06-tag-bucket-p3-picker-hashtag-stats.md`
  and `tasks/done/2026-07-06-subtag-stacked-chart.md`.
