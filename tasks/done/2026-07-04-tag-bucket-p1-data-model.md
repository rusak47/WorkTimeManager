# Tag Bucket System — Phase 1: Data Model & Backward Compatibility

**Date:** 2026-07-04
**Phase 1 of 3** — see P2 (`settings-dnd`) and P3 (`picker-hashtag-stats`)

## Objective

Introduce tag hierarchy: default tags act as top-level **buckets**, optional and custom tags become **subtags** assigned to buckets. Sessions pick exactly one primary bucket; all other tags resolve as subtags of that bucket.

## Schema

### New state key

```js
tagBuckets: {
  work:  [],
  rest:  ['sleep', 'hygiene', 'tv', 'read', 'write', 'music'],
  sport: ['cycling', 'horse', 'running'],
  study: ['rtu', 'read', 'write', 'music'],
  other: ['socialize', 'online', 'home-tasks'],
}
```

### New session field

```js
{
  // ...existing fields...
  tags: string[],       // flat array (unchanged)
  bucket: string,       // NEW: primary bucket ('work'|'rest'|'study'|'sport'|'other')
}
```

### Constants change

- `DEFAULT_TAGS` expands from `['work', 'rest']` to `['work', 'rest', 'study', 'sport', 'other']`
- `'other'` is always last in `DEFAULT_TAGS` — affects `resolveSessionBucket()` tiebreaker ordering
- `DEFAULT_BUCKET_MAP` replaces `PRESET_TAGS` as single source of truth for subtag definitions
- `PRESET_TAGS` removed

### Core invariants

1. **One default per session** — exactly one bucket chosen at creation
2. **Backward compat** — old sessions without `bucket` inferred by scanning `tags` for first `DEFAULT_TAGS` match; fallback `'other'`
3. **Multi-bucket subtags** — a subtag name can appear in multiple bucket arrays (e.g. `read` in both `rest` and `study`)
4. **`other` is a first-class default** — in `DEFAULT_TAGS`, catch-all for unassigned tags, selectable in pickers

## Tag object bootstrapping

On fresh start (tags array empty):
1. Tag objects from `DEFAULT_TAGS` (with `isDefault: true`)
2. Tag objects from all unique subtag names across `DEFAULT_BUCKET_MAP` (with `isDefault: false, isCustom: false`)

On migration (existing state without `tagBuckets`):
- `tagBuckets` seeded from `DEFAULT_BUCKET_MAP`
- Existing `tags` array preserved

## Checkpoints

### 1.1 — Constants and bucket map

- Expand `DEFAULT_TAGS` to `['work', 'rest', 'study', 'sport', 'other']`
- Add `DEFAULT_BUCKET_MAP` with all bucket→subtags assignments
- Remove `PRESET_TAGS` constant

Update both `PRESET_TAGS` reference sites in `app.js`:
- **`loadData()` (line 59-65)** — fresh-start bootstrap: create Tag objects from `DEFAULT_TAGS` + all unique subtag names from `DEFAULT_BUCKET_MAP`
- **`importData()` (line 569-581)** — import fallback: same logic, plus seed `tagBuckets` in imported state

**Files:** `src/app/constants.js`, `src/app/app.js`

### 1.2 — tagBuckets in state and storage

- Add `tagBuckets: {}` to `INITIAL_STATE` in `app.js`
- Add `setTagBuckets()` mutation to store (or use generic `store.setState({ tagBuckets })`)
- `loadStateFromStorage()`: restore `if (state && state.tagBuckets) store.setState({ tagBuckets: state.tagBuckets })`
- `saveState()`: add `tagBuckets: s.tagBuckets` to the pickled state object
- Bootstrap: if `tagBuckets` is empty/undefined after load, seed from `DEFAULT_BUCKET_MAP`

**Files:** `src/app/state.js`, `src/storage/storage.js`, `src/app/app.js`

### 1.3 — Bucket resolution for legacy sessions

- Implement `resolveSessionBucket(session)` — infers bucket from `session.tags` or returns stored `session.bucket`
- Edge: session has no default tag → `'other'`
- Edge: session has multiple defaults → first match (ordered by `DEFAULT_TAGS`)

**Files:** `src/app/sessionManager.js` or new `src/app/tagManager.js`

### 1.4 — Subtag utility functions

- `getSubtagsForBucket(bucket)` — subtag names for a given bucket
- `getAvailableBuckets()` — all bucket names (defaults + 'other')
- `getParentBuckets(tagName)` — all buckets a subtag belongs to
- `getUnassignedTags(tags, tagBuckets)` — tags not in any bucket

**Files:** `src/app/tagManager.js` (new)

### 1.5 — Group tag settings by bucket (visual)

- Replace three HTML containers (`#default-tags`, `#preset-tags`, `#custom-tags`) with one:
  ```html
  <div id="tag-bucket-settings"></div>
  ```
- `renderTagSettings` dynamically creates bucket group sections inside `#tag-bucket-settings`
- Each group shows bucket name as header, tags listed underneath
- Tags not in any bucket shown under "Other"
- The "Add custom tag" input stays, placed above or inside `#tag-bucket-settings`
- No drag-and-drop yet — static grouping only

**Files:** `src/app/uiManager.js`, `src/index.html`

**Cascade:** update `setupDOM` in both `app.test.js` and `uiManager.test.js` — replace the three old containers with `#tag-bucket-settings`.

### 1.6 — Wire tag operations with bucket state

- `addCustomTag()` (app.js:640): new tag also added to `tagBuckets.other` array
- `deleteCustomTag()` (app.js:652): after filtering tag out of `s.tags`, also scan all `tagBuckets` arrays and remove the tag name from every bucket
- `exportAllData()` (app.js:539-546): include `tagBuckets: s.tagBuckets` in the export object
- `importData()` (app.js:569-581): restore `tagBuckets` from imported data, fall back to `DEFAULT_BUCKET_MAP`

**Files:** `src/app/app.js`

## Edge cases (Phase 1 scope)

- **Subtag in multiple buckets, old session without bucket context** → resolves to `other`
- **Default tag removed from `DEFAULT_TAGS`** → its subtags move to `other` automatically
- **User deletes a tag that's a subtag in a bucket** → `deleteCustomTag` removes from all bucket arrays + tags list
- **Missing `tagBuckets` in stored state** → seeded from `DEFAULT_BUCKET_MAP`
- **Old sessions without `bucket` field** → `resolveSessionBucket()` at read time
- **Import without `tagBuckets` in the file** → seeded from `DEFAULT_BUCKET_MAP`
