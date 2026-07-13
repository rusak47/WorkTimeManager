# Legacy Session Tag Migration — Extract #hashtags from notes

**Date:** 2026-07-06
**Requires:** v1.1.0 (tag buckets + syncHashtagTags already in place)

## Objective

Legacy sessions created before the `syncHashtagTags` mechanism have raw `#hashtags` embedded in their `notes` field that were never extracted into the structured `tags` array. This causes bucket stats and other downstream consumers to miss those tags.

Fix with a one-time migration script that normalizes sessions on load without polluting tag settings.

## Constraints

- Migration code lives **outside** `src/app/` — in `migration/` directory
- Must NOT touch tagBuckets, tags registry, or any settings
- Must run exactly once — subsequent loads skip it
- Must work in both Electron (production) and browser dev mode

## How bucket hierarchy works

The `tags` array on a session stores both parent (default) and child tags flatly, e.g. `['work', 'design', 'review']`. The bucket hierarchy is resolved at query time:

1. `resolveSessionBucket()` scans `tags` for a DEFAULT_TAGS match — finds `work` → parent bucket is `work`
2. `computeBucketStats()` treats all non-DEFAULT_TAGS entries as children/subtags under that bucket

So adding `design` to `session.tags` is sufficient — it automatically becomes a child of the `work` bucket in stats, without touching tagBuckets or settings.

## Implementation

### New files

**`migration/v1.0.0-to-v1.1.0.js`**

Pure function `migrateSessionTags(sessions)`:
- Iterates each session
- If `session.notes` contains `#`, extract `#(\w+)` matches
- Merge matches into `session.tags` (deduped against existing tags)
- Strip `#tag` text from `session.notes` (mirrors `syncHashtagTags` regex: `/#(foundTags)\b/g` then collapse double spaces)
- If no `session.tags`, default to `['work']`
- Returns new sessions array (immutable)

No imports from `src/app/` — zero coupling to app code.

**`migration/v1.0.0-to-v1.1.0.test.js`**

| Test | Input | Expected |
|---|---|---|
| Legacy session — extract notes hashtags as child tags | `{ notes: 'Worked on #design and #review', tags: ['work'] }` | tags: `['work', 'design', 'review']` → `work` is parent bucket, `design`/`review` are children. Notes: `'Worked on and'` |
| Already normalized (no `#` in notes) | `{ notes: 'Morning standup', tags: ['work'] }` | unchanged |
| Tag in both notes and tags — dedup | `{ notes: '#work coding', tags: ['work', 'coding'] }` | notes: `'coding'`, tags unchanged (no duplicate added) |
| No tags array → default to `['work']` | `{ notes: '#design', durationSec: 3600 }` | tags: `['work', 'design']`, notes: `''` — `work` is parent, `design` is child |

### Modified files

**`src/app/app.js:loadData()` (line 51)**

After `storage.loadState()` succeeds and before `loadStateFromStorage()`:

```
if saved state exists AND saved._migrationVersion is missing:
  import migration module
  run migrateSessionTags(saved.sessions)
  saved.sessions = result
  saved._migrationVersion = '1.1.0'
  await storage.saveState(saved)
  loadStateFromStorage(saved)
else:
  loadStateFromStorage(saved)
```

Key details:
- Dynamic `import()` prevents bundling migration script into main chunk
- `_migrationVersion` flag persisted in state — future loads skip immediately
- Migration saves back to storage so cleaned data persists

**`src/app/app.test.js`**

New test: `'loadData runs session tag migration on first load'` — mock storage with legacy sessions and no `_migrationVersion`, assert sessions normalized and `_migrationVersion` set.

## Non-goals

- No changes to tagBuckets or tags registry
- No changes to `computeBucketStats`, `tagManager`, `uiManager`, `storage`
- No changes to `loadStateFromStorage` itself

## Files changed

| File | Action |
|---|---|
| `migration/v1.0.0-to-v1.1.0.js` | Create |
| `migration/v1.0.0-to-v1.1.0.test.js` | Create |
| `src/app/app.js` | Edit (~10 lines in `loadData`) |
| `src/app/app.test.js` | Edit (1 new test) |
