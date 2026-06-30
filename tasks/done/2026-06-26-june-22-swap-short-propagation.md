# June 22 swapped_day_off short-day propagation

**Date:** 2026-06-26  
**Branch:** `crash-auto-backup`

Swapped_workday (June 27) now inherits `isShortDay` from the `swap_source` entry's `is_short_day` field. The holidays JSON was updated from `type: "pre_holiday_short"` to `type: "workday"` + `"is_short_day": true`; `normaliseEntry` now detects `is_short_day` generically.

