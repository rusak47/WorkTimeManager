# Tag Bucket System — Phase 3: Session Picker, Inline Hashtag & Bucketed Stats

**Date:** 2026-07-04
**Phase 3 of 3** — requires P1 (`data-model`) and P2 (`settings-dnd`).

## Objective

Deliver the visible user-facing changes: a two-level tag picker during session creation, inline hashtag autocomplete in notes, and bucketed statistics roll-up.

## Sub-task breakdown

### ✅ P3-A: Foundation — Color expansion + shared chip helper *(done)*

- **Colors:** `getTagBadgeClass()` expanded to 5 colors: work→blue, rest→purple, study→orange, sport→green, other→gray
- **Chip helper:** `createPickerTagChip(tagName, selected)` exported
- **Files:** `src/app/uiManager.js`, `src/app/uiManager.test.js`
- **Precedes:** P3-C, P3-D, P3-G
- Tests: 255/255 passing

### ✅ P3-B: Store bucket on session save *(done)*

- `stopTracking()` passes `meta.bucket` through to session object
- `handleSessionFormSubmit()` reads bucket from row-1 selected default, passes to `addSession()`
- **Files:** `src/app/sessionManager.js`, `src/app/app.js`, `src/app/sessionManager.test.js`
- Tests: 267/267 passing

### ✅ P3-C: Two-row picker — Tracker tab *(done)*

- `initializeCurrentSessionTags()` rewritten:
  - Row 1: 5 defaults, radio-style, `work` pre-selected
  - Row 2: subtags from `tagBuckets`, max 6 visible, `+N more` expander
- `handleSessionFormSubmit()` reads `.tag-chip.selected`, detects bucket from row-1
- Legacy fallback (`renderLegacyTagPicker`) for sessions without `tagBuckets`
- **Files:** `src/app/uiManager.js`, `src/app/app.js`, `src/app/uiManager.test.js`
- Tests: 267/267 passing (10 new tests)

### P3-D: Two-row picker — Edit modal + refactor `editSession()` (spec 3.1)

- Rewrite `initializeSessionModalTags()` with same two-row layout
- Pre-select from `session.bucket` (from P3-B)
- Refactor `editSession()` (`app.js:369-391`) — remove inline tag rendering, call shared picker function
- Warning when session has multiple default tags (e.g. `work` + `rest`)
- **Files:** `src/app/uiManager.js`, `src/app/app.js`, `src/css/styles.css`

### P3-E: Long-press on Start button (spec 3.1)

- `mousedown`/`touchstart` timer on `#start-session` (~500ms threshold)
- Short press: current behavior (start with `work`)
- Long press: floating tooltip/picker to select bucket, then start
- CSS for tooltip overlay
- **Files:** `src/app/uiManager.js`, `src/app/app.js`, `src/css/styles.css`

### P3-F: Inline hashtag autocomplete (spec 3.3)

- `input` event on `#notes` + `#modal-notes`
- Prefix match on `#[a-zA-Z0-9]`
- Positioned dropdown with color-coded bucket badges (via `getParentBuckets()`)
- Selection → insert tag text + add to session tags
- New tag creation → auto-assign to current session's bucket subtags
- Dismiss on esc/backspace/blur
- **Files:** `src/app/uiManager.js`, `src/app/app.js`, `src/css/styles.css`

### P3-G: Bucketed statistics (spec 3.4)

- New rendered section below existing stats charts
- Group sessions by bucket (`resolveSessionBucket()`), sum `durationSec`
- Bucket rows: colored name + total duration, expand/collapse toggle
- Subtag drill-down within each bucket
- Existing flat tag filter left untouched
- **Files:** `src/app/statsManager.js`, `src/app/uiManager.js`, `src/css/styles.css`

### Long press decision

- Short press → current behaviour (start with `work`)
- Long press (~500ms) → tag selection + start

### `+N more` behavior

- Expands inline (not dropdown)

### Edit modal: multiple default tags (e.g. `work` + `rest`)

- Show warning, let user decide which bucket to select

### Hashtag match scope

- Prefix match only (`#re` → `read`, `rest`; not `write`, `horse`)

### Bucketed stats location

- Rendered below existing stats charts (not a separate section/tab)

---

## Dependency graph

```
P3-A → P3-C, P3-D, P3-G
P3-B → P3-D
P3-C, P3-D → P3-E  (start button picker reuses same picker pattern)
P3-F, P3-G → independent of each other
```

**Implementation order:** P3-A → P3-B → P3-C → P3-D → P3-E → P3-F → P3-G

---

## Edge cases (Phase 3 scope)

- **Notes `#` with no following text** → ignored, no dropdown
- **Hashtag autocomplete with 0 matches** → show nothing + auto-assign as subtags of the current session's bucket
- **Picker: all subtags hidden under `+N`** → expander reveals them inline
- **Edit modal: session has bucket that no longer exists** → default to 'other'
- **Bucketed stats: empty bucket (0 sessions)** → show "0h 0min" or hide

## Files changed (cumulative)

- `src/app/uiManager.js` — tag picker rendering, hashtag autocomplete, bucketed stats rendering
- `src/app/app.js` — event wiring, bucket save, editSession refactor, long-press handler
- `src/app/sessionManager.js` — bucket field in session defaults + stopTracking
- `src/app/statsManager.js` — bucket-aware aggregation functions
- `src/css/styles.css` — new color classes, picker layout, dropdown, stats tree
