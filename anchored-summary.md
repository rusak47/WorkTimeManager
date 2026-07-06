## Goal
- Deliver Phase 3 of Tag Bucket system: two-level tag picker, inline hashtag autocomplete, and bucketed statistics.

## Progress

### Done
- **P3-A: Foundation — Color expansion + shared chip helper** — Expanded `TAG_COLORS` from 8 to 20; introduced `createTagChip()` with consistent `data-tag`, `data-color`, `data-parent` attributes; migrated temp-chips, stat panel chips, session list chips, and edit modal chips to shared helper. Color for `#stat-panel` chips rendered via inline `style` (Tailwind arbitrary value). `details` element wrapping stat footer. `getTagLabel()` added for fallback display when bucket prefers parent tag. Checkpoint commit `56be38f`. (255 tests)
- **P3-B: Store bucket on session save** — `sessionManager` reads `.tag-chip.selected` from modal; `sessionManager` reads `.tag-chip.selected` from tracker; session object now includes `tags[]` with `{id, bucket}` where applicable; `Default` tag skipped in save path; legacy sessions without tags default to `[]` on load. Checkpoint commit `9e7ef23`. (267 tests)
- **P3-C: Two-row tag picker in tracker tab** — `initializeTrackerTags()` rewritten with two-row layout; `handleTagClick` updated to support parent+subtag toggle logic; `updateSessionTags` refactored for two-row DOM; row 2 clears when row 1 changes. Checkpoint commit `2fd6a94`. (267 tests, 10 new tests)
- **P3-D: Two-row picker — Session modal** — `initializeSessionModalTags()` rewritten with two-row layout; `editSession()` refactored to call shared picker; `handleSessionFormSubmit` reads `.tag-chip.selected` and passes `bucket`; warning for multiple default tags in edit. `renderRow2` accepts `selectedSubtags` param for pre-selection. (272 tests, 5 new tests)

### In Progress
- **P3-E: Long-press on Start button** — Add 500ms long-press handler to Start for tag selection + start

### Next Steps
1. P3-E: Long-press on Start button (~500ms) → tag selection modal + start
2. P3-F: Inline hashtag autocomplete (prefix match)
3. P3-G: Bucketed statistics

## Key Decisions
- **Tag bucket architecture**: Each session has `tags[]` with optional `bucket` field pointing to parent tag
- **Save handlers**: tracker saves via `#current-session-tags .tag-chip.selected`; modal saves via `#tags-container .tag-chip.selected` (with `.tag.selected` fallback)
- **Checkpoint commits done per subtask with doc updates staged together**: P3-A `(awaiting)`, P3-B `9e7ef23`, P3-C `2fd6a94`, P3-D `(awaiting)`

## Critical Context
- `editSession` now calls `ui.initializeSessionModalTags(bucket, sessionTags)` instead of inline `.tag` rendering
- Modal save handler has fallback: checks `.tag-chip.selected` first, then `.tag.selected` for legacy users
- `multiple-defaults-warning` is cleaned up on `showAddSessionModal` and `hideSessionModal`
