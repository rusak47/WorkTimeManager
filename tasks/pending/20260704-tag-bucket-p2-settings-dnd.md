# Tag Bucket System — Phase 2: Settings Tree View with Drag-and-Drop

**Date:** 2026-07-04
**Phase 2 of 3** — requires P1 (`data-model`) first. Followed by P3 (`picker-hashtag-stats`)

## Objective

Replace the flat tag settings panel with an interactive tree view where users can drag subtags between buckets. This is the configuration interface for the bucket system established in Phase 1.

## Prerequisites

Phase 1 completed: `tagBuckets` in state/storage, `DEFAULT_BUCKET_MAP` in constants, `tagManager.js` utilities, bucket-grouped static render.

## Checkpoints

### 2.1 — Bucket tree view UI

- Collapsible/expandable tree groups per bucket (work, rest, study, sport, other)
- Each bucket group lists its subtags
- "Other" section at the bottom for unassigned tags
- Visual hierarchy: indented tree with bucket indicators (icons or colored bars)

**Files:** `src/app/uiManager.js`, `src/css/styles.css`

### 2.2 — Native HTML5 drag-and-drop

- `dragstart` on subtag items — stores tag name + source bucket as drag data
- `dragover` on bucket drop zones — shows visual highlight
- `drop` handler — moves subtag from source bucket to target bucket
- State persisted immediately via `setTagBuckets()`
- Edge: drag to same bucket → no-op

**Files:** `src/app/uiManager.js`, `src/app/app.js`, `src/css/styles.css`

### 2.3 — Multi-bucket assignment

- Ctrl/Cmd+drag duplicates the subtag into target bucket (doesn't remove from source)
- Visual indicator when modifier key is held during drag
- Edge: duplicate to bucket that already contains it → no-op

**Files:** `src/app/uiManager.js`

### 2.4 — Add/remove subtag from bucket

- "Add subtag" button per bucket group — opens text input or dropdown of unassigned tags
- "Remove" button (X) per subtag — removes from that bucket only (tag object stays)
- Changes persisted immediately

**Files:** `src/app/uiManager.js`, `src/app/app.js`

## Edge cases (Phase 2 scope)

- **Drag subtag to bucket it's already in** → no-op
- **Remove last subtag from bucket** → bucket shows "(no subtags)" placeholder
- **Add tag that's already a subtag in this bucket** → no-op / ignored
- **Drag unassigned tag from Other** → moves it into target bucket (removes from Other)
