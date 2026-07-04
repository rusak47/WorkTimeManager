# Tag Bucket System — Phase 3: Session Picker, Inline Hashtag & Bucketed Stats

**Date:** 2026-07-04
**Phase 3 of 3** — requires P1 (`data-model`) and P2 (`settings-dnd`).

## Objective

Deliver the visible user-facing changes: a two-level tag picker during session creation, inline hashtag autocomplete in notes, and bucketed statistics roll-up.

## Checkpoints

### 3.1 — Bucket-aware session tag picker

Redesign both `#current-session-tags` (tracker tab) and `#tags-container` (edit modal):

- **Row 1:** default tags as selectable pills — work/rest/study/sport/other
  - Work pre-selected by default
  - Only one allowed (clicking another deselects the current)
- **Row 2:** subtags of the selected default appear
  - Limited to N items visible (e.g. 6); excess hidden under `+N more` expander
- If "other" selected, show its subtags

**Files:** `src/app/uiManager.js`, `src/css/styles.css`, `src/index.html`

### 3.2 — Store bucket on session save

- Add `bucket` field to new sessions at save time (both current session form and edit modal)
- Resolve from the selected default tag in the picker
- On edit: pre-select the stored bucket in the picker
- Old sessions without `bucket` continue using `resolveSessionBucket()` from Phase 1

**Files:** `src/app/app.js`, `src/app/sessionManager.js`

### 3.3 — Inline hashtag autocomplete

- Listen for `#` + alphanumeric (`#[a-zA-Z0-9]`) input in the notes textarea
- Show autocomplete dropdown with matching tags from ALL buckets
- Each suggestion shows its bucket membership (color-coded badge)
- Clicking a suggestion inserts the tag name and adds it to session tags
- If the typed tag doesn't exist, offer "Create new tag" option
- New tags created this way auto-assign as subtags of the current session's bucket
- Edge: `#` with no alphanumeric after → ignored
- Edge: backspace after `#` → dismiss dropdown

**Files:** `src/app/uiManager.js`, `src/app/app.js`, `src/css/styles.css`

### 3.4 — Bucketed statistics

- New bucketed roll-up view in the Statistics tab
- Top-level rows per bucket with total duration: work / rest / study / sport / other
- Expandable drill-down into subtag breakdown within each bucket
- Existing flat tag filter preserved alongside (Phase 1+2 of statistics as-is)
- Color-coding: work=blue, rest=purple, study=green, sport=orange, other=gray
- Uses `resolveSessionBucket()` for old sessions

**Files:** `src/app/statsManager.js`, `src/app/uiManager.js`, `src/css/styles.css`

## Edge cases (Phase 3 scope)

- **Notes `#` with no following text** → ignored, no dropdown
- **Hashtag autocomplete with 0 matches** → show "No matching tags" + "Create new" option
- **Picker: all subtags hidden under `+N`** → expander reveals them inline
- **Edit modal: session has bucket that no longer exists** → default to 'other'
- **Bucketed stats: empty bucket (0 sessions)** → show "0h 0min" or hide
