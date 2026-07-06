# Time by Bucket — Honor Period Filter

**Impact:** Switching stats period (daily/weekly/monthly/yearly) currently has no
effect on the "Time by Bucket" section — it always aggregates all sessions (or
year-filtered at best). Users see the same numbers regardless of the selected
view.

## Problem

`uiManager.js:updateStatistics()` computes `filteredSessions` but only applies the
year filter (for yearly mode). The `renderBucketStats(filteredSessions)` call at
line 1589 gets the unfiltered set for daily/weekly/monthly, so the bucket stats
are always for *all time*.

The time chart (lines 1525–1588) already has the correct period-scoping logic
inline, but bucket stats don't use it.

## Fix

Compute a period-scoped `periodSessions` array right before `renderBucketStats`
(≈ line 1589), using the same date-range logic the chart uses:

- **daily** → last 7 days
- **weekly** → last 8 weeks
- **monthly** → last 6 months
- **yearly** → already scoped by `filteredSessions`

Pass `periodSessions` instead of `filteredSessions` to `renderBucketStats`.

No new dependencies, no new DOM elements, no test changes for existing tests
(the function still takes `sessions[]` — only the input is different).
