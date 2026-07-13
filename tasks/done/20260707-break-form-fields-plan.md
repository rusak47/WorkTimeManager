# Break Form Fields — Implementation Plan

> **For agentic workers:** Inline execution with checkpoint commits.

**Goal:** Add separate notes/tags/mood form fields for break sessions, toggle visibility on pause/resume, and include crash recovery for both forms.

**Architecture:** Duplicate the work form block in HTML; add break-specific init functions to uiManager.js; update togglePause/stopSession/saveState/init in app.js to read from / toggle the active form.

**Tech Stack:** Vanilla JS, no framework.

## Global Constraints

- TDD: write failing test first, then implement
- `'Break session'` constant removed — empty notes → empty string in break segment
- Break tags default to `['rest']` bucket
- Break form IDs: `#break-notes`, `#break-session-tags`, `#break-session-mood`, `#break-mood-value`, `#break-session-mood-input`
- Both forms share same CSS classes (no new CSS)

---

### Task 1: Break form HTML + uiManager.js init functions

**Files:**
- Modify: `src/index.html:108`
- Add: `src/app/uiManager.js` — `initializeBreakSessionTags`, `initializeBreakSessionMood`, `createStarsForBreakSession`
- Modify: `src/app/uiManager.js` — exports at line 2071
- Test: `src/app/uiManager.test.js`
- Modify: `src/app/app.test.js` — setupDOM break form elements

**Interfaces:**
- Consumes: existing `createPickerTagChip`, `getTagBadgeClass`, `renderRow2`, `renderLegacyTagPicker`, `DEFAULT_BUCKET_KEYS`
- Produces: `ui.initializeBreakSessionTags(bucket='rest')`, `ui.initializeBreakSessionMood()`, `ui.createStarsForBreakSession()`

- [ ] **Step 1.1: Add break form elements to setupDOM and write failing tests**

Add to `src/app/app.test.js` setupDOM:
```html
<div id="break-session-notes" class="hidden">
  <textarea id="break-notes"></textarea>
  <div id="break-session-tags"></div>
  <div id="break-session-mood"></div>
  <input type="hidden" id="break-session-mood-input" value="5" />
</div>
```

Add to `src/app/uiManager.test.js` — 3 tests:
```js
it('initializeBreakSessionTags creates tag chips in break container', () => {
  ui.initializeBreakSessionTags('rest');
  const container = document.getElementById('break-session-tags');
  expect(container.children.length).toBeGreaterThan(0);
  const selected = container.querySelector('.tag-chip.selected');
  expect(selected.dataset.tag).toBe('rest');
});

it('initializeBreakSessionMood creates stars in break container', () => {
  ui.initializeBreakSessionMood();
  const container = document.getElementById('break-session-mood');
  expect(container.children.length).toBe(5);
  expect(container.dataset.rating).toBe('5');
});

it('createStarsForBreakSession updates star display', () => {
  const container = document.getElementById('break-session-mood');
  container.dataset.rating = '3';
  container.innerHTML = '<div class="star"></div>'.repeat(5);
  ui.createStarsForBreakSession();
  const stars = container.querySelectorAll('.star');
  expect(stars[0].innerHTML).toBe('\u2605');
  expect(stars[3].innerHTML).toBe('\u2606');
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

Run: `npm test`
Expected: Errors about `initializeBreakSessionTags` not being a function

- [ ] **Step 1.3: Add break form HTML to index.html**

Insert after `#session-notes` closing `</div>` (line 108 in index.html):
```html
                    <div id="break-session-notes" class="mt-6 hidden">
                        <textarea id="break-notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white" placeholder="What did you do during this break?"></textarea>
                        <div class="mt-4">
                            <div id="break-session-tags" class="flex flex-wrap gap-2">
                                <input type="text" id="break-tags-input" class="hidden">
                            </div>
                        </div>
                        <div class="mt-4">
                            <div class="flex items-center">
                                <div id="break-session-mood" class="flex" data-rating="5">
                                </div>
                                <span id="break-mood-value" class="ml-2 text-sm font-medium">5.0</span>
                            </div>
                            <input type="hidden" id="break-session-mood-input" value="5">
                        </div>
                    </div>
```

- [ ] **Step 1.4: Implement break init functions in uiManager.js**

```js
function initializeBreakSessionTags(bucket = 'rest') {
  const container = document.getElementById('break-session-tags');
  const s = store.getState();
  if (!container) return;
  container.innerHTML = '';
  const tagBuckets = s.tagBuckets || {};
  const hasBuckets = DEFAULT_BUCKET_KEYS.every(k => Array.isArray(tagBuckets[k]));
  if (!hasBuckets) {
    renderLegacyTagPicker(container, s);
    return;
  }
  let selectedDefault = bucket;
  const row1 = document.createElement('div');
  row1.className = 'picker-row-1 flex flex-wrap gap-1.5 mb-2';
  for (const tagName of DEFAULT_BUCKET_KEYS) {
    const isSelected = tagName === selectedDefault;
    const chip = createPickerTagChip(tagName, isSelected);
    chip.addEventListener('click', () => {
      if (chip.classList.contains('selected')) return;
      row1.querySelectorAll('.tag-chip.selected').forEach(el => {
        el.classList.remove('selected');
        el.className = el.className.replace(/selected\s*/, '');
        const tn = el.dataset.tag;
        el.className = `tag-chip inline-block px-2 py-1 rounded-full text-sm cursor-pointer select-none ${getTagBadgeClass(tn, false)}`;
      });
      chip.classList.add('selected');
      chip.className = `tag-chip inline-block px-2 py-1 rounded-full text-sm cursor-pointer select-none selected ${getTagBadgeClass(tagName, true)}`;
      selectedDefault = tagName;
      renderRow2(container, row2, tagBuckets, selectedDefault);
    });
    row1.appendChild(chip);
  }
  const row2 = document.createElement('div');
  row2.className = 'picker-row-2 flex flex-wrap gap-1.5';
  container.appendChild(row1);
  container.appendChild(row2);
  renderRow2(container, row2, tagBuckets, selectedDefault);
}

function initializeBreakSessionMood() {
  const container = document.getElementById('break-session-mood');
  if (!container) return;
  container.dataset.rating = '5';
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('div');
    star.className = 'star text-2xl cursor-pointer';
    star.dataset.value = i;
    star.innerHTML = '\u2605';
    star.addEventListener('click', () => {
      container.dataset.rating = i;
      const moodInput = document.getElementById('break-session-mood-input');
      const moodValue = document.getElementById('break-mood-value');
      if (moodInput) moodInput.value = i;
      if (moodValue) moodValue.textContent = i + '.0';
      createStarsForBreakSession();
    });
    container.appendChild(star);
  }
}

function createStarsForBreakSession() {
  const container = document.getElementById('break-session-mood');
  if (!container) return;
  const rating = parseFloat(container.dataset.rating) || 5;
  const stars = container.querySelectorAll('.star');
  stars.forEach((star, index) => {
    star.innerHTML = index < rating ? '\u2605' : '\u2606';
  });
}
```

Add to uiManager.js exports (near line 2071):
```js
initializeBreakSessionTags,
initializeBreakSessionMood,
createStarsForBreakSession,
```

- [ ] **Step 1.5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 1.6: Commit**

```bash
git add src/index.html src/app/uiManager.js src/app/uiManager.test.js src/app/app.test.js
git commit -m "feat: add break form HTML and init functions (tags, mood) in uiManager.js"
```

---

### Task 2: Read break form values + togglePause form toggling

**Files:**
- Modify: `src/app/app.js` — `togglePause`, new `readBreakFormValues()`
- Test: `src/app/app.test.js`

**Interfaces:**
- Consumes: `ui.initializeBreakSessionTags()`, `ui.initializeBreakSessionMood()`, `sessionManager.addSession()`, `sessionManager.resumeTracking()`
- Produces: reads `#break-notes`, `#break-session-tags .tag-chip.selected`, `#break-session-mood-input` for break form; toggles `#session-notes` / `#break-session-notes` visibility

- [ ] **Step 2.1: Write failing tests for togglePause form toggling**

Add to `src/app/app.test.js` after existing togglePause tests:

```js
it('togglePause hides work form and shows break form on pause', () => {
  const now = Date.now();
  store.setState({
    sessions: [],
    tracker: { startTime: now, isPaused: false, pauseStart: null, segmentStartTime: now, workBlockId: 'test-block', totalSavedDurationMs: 0, isBreak: false },
  });
  document.getElementById('notes').value = 'Work notes';
  document.getElementById('session-notes').classList.remove('hidden');
  document.getElementById('break-session-notes').classList.add('hidden');

  app.togglePause();

  const workForm = document.getElementById('session-notes');
  const breakForm = document.getElementById('break-session-notes');
  expect(workForm.classList.contains('hidden')).toBe(true);
  expect(breakForm.classList.contains('hidden')).toBe(false);
});

it('togglePause hides break form and shows work form on resume', () => {
  const now = Date.now();
  store.setState({
    sessions: [],
    tracker: { startTime: now, isPaused: true, pauseStart: now, segmentStartTime: now, workBlockId: 'test-block', totalSavedDurationMs: 10000, isBreak: false },
  });
  document.getElementById('break-notes').value = 'Break notes';
  document.getElementById('break-session-notes').classList.remove('hidden');
  document.getElementById('session-notes').classList.add('hidden');

  app.togglePause();

  const workForm = document.getElementById('session-notes');
  const breakForm = document.getElementById('break-session-notes');
  expect(workForm.classList.contains('hidden')).toBe(false);
  expect(breakForm.classList.contains('hidden')).toBe(true);
});

it('togglePause saves break segment with break form values on resume', () => {
  const now = Date.now();
  const pauseStart = now - 120000; // 2min break
  store.setState({
    sessions: [],
    tracker: { startTime: now - 3600000, isPaused: true, pauseStart, segmentStartTime: now - 3600000, workBlockId: 'test-block', totalSavedDurationMs: 10000, isBreak: false },
  });
  document.getElementById('break-notes').value = 'Coffee break';
  document.getElementById('break-session-mood-input').value = '3';

  app.togglePause();

  const s = store.getState();
  const breakSegment = s.sessions.find(ses => ses.isBreak);
  expect(breakSegment).toBeDefined();
  expect(breakSegment.notes).toBe('Coffee break');
  expect(breakSegment.mood).toBe(3);
  expect(breakSegment.tags).toContain('rest');
});
```

- [ ] **Step 2.2: Run tests to verify they fail**

Run: `npm test`
Expected: New tests fail (form toggling not implemented, break segment not reading break form values)

- [ ] **Step 2.3: Add readBreakFormValues for break form**

```js
function readBreakFormValues() {
  const notesInput = document.getElementById('break-notes');
  const moodInput = document.getElementById('break-session-mood-input');
  const selectedTags = [];
  let bucket;
  document.querySelectorAll('#break-session-tags .tag-chip.selected').forEach(el => {
    selectedTags.push(el.dataset.tag);
    const parentRow = el.closest('.picker-row-1');
    if (parentRow) bucket = el.dataset.tag;
  });
  if (selectedTags.length === 0) selectedTags.push('rest');
  const notesValue = notesInput ? notesInput.value.trim() : '';
  const syncResult = syncHashtagTags(notesValue, bucket);
  if (syncResult) {
    syncResult.foundTags.forEach(t => { if (!selectedTags.includes(t)) selectedTags.push(t); });
  }
  return {
    notes: syncResult ? syncResult.cleanedNotes : notesValue,
    tags: selectedTags,
    mood: moodInput ? parseFloat(moodInput.value) : 5,
    bucket,
  };
}
```

- [ ] **Step 2.4: Update togglePause**

In the **pause branch** (isPaused was false → now setting to true), after saving the work segment and setting `isPaused: true`:
```js
// After store.setState({ tracker: { ...tracker, isPaused: true, pauseStart: now, totalSavedDurationMs: ... } })
// and the pauseBtn text update:
ui.initializeBreakSessionMood();
ui.initializeBreakSessionTags();
document.getElementById('session-notes')?.classList.add('hidden');
document.getElementById('break-session-notes')?.classList.remove('hidden');
```

In the **resume branch** (isPaused was true → now setting to false), replace the hardcoded break session with:
```js
const breakFormValues = readBreakFormValues();
const breakSession = {
  id: Date.now(),
  date: utils.formatDate(d),
  startTime: d.toISOString(),
  endTime: new Date().toISOString(),
  duration: utils.formatDuration(breakDuration),
  durationSec: breakDuration,
  notes: breakFormValues.notes,
  dayType: getDayType(utils.formatDate(d), s),
  tags: breakFormValues.tags,
  mood: breakFormValues.mood,
  workBlockId: tracker.workBlockId,
  isBreak: true,
};
```

And add after `sessionManager.resumeTracking()` and button text update:
```js
document.getElementById('break-session-notes')?.classList.add('hidden');
document.getElementById('session-notes')?.classList.remove('hidden');
```

- [ ] **Step 2.5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2.6: Commit**

```bash
git add src/app/app.js src/app/app.test.js
git commit -m "feat: togglePause toggles form visibility and reads break form values on resume"
```

---

### Task 3: stopSession + saveState + init crash recovery with break form

**Files:**
- Modify: `src/app/app.js` — `stopSession` paused branch, `saveState`, `init`
- Test: `src/app/app.test.js`

**Interfaces:**
- Consumes: `readBreakFormValues()` from Task 2, `store.getState()`, `sessionManager.resetTracker()`

- [ ] **Step 3.1: Write failing tests**

```js
it('stopSession clears both forms and hides them', () => {
  const now = Date.now();
  store.setState({
    sessions: [],
    tracker: { startTime: now, isPaused: false, pauseStart: null, segmentStartTime: now, workBlockId: 'test-block', totalSavedDurationMs: 0, isBreak: false },
  });
  document.getElementById('notes').value = 'Work notes';
  document.getElementById('session-notes').classList.remove('hidden');

  app.stopSession();

  expect(document.getElementById('notes').value).toBe('');
  expect(document.getElementById('session-notes').classList.contains('hidden')).toBe(true);
  expect(document.getElementById('break-session-notes').classList.contains('hidden')).toBe(true);
});

it('stopSession while paused reads break form values for break segment', () => {
  const now = Date.now();
  store.setState({
    sessions: [],
    tracker: { startTime: now - 3600000, isPaused: true, pauseStart: now - 120000, segmentStartTime: now - 3600000, workBlockId: 'test-block', totalSavedDurationMs: 10000, isBreak: false },
  });
  document.getElementById('break-notes').value = 'Long break';
  document.getElementById('break-session-mood-input').value = '2';
  document.getElementById('break-session-notes').classList.remove('hidden');

  app.stopSession();

  const s = store.getState();
  const breakSegment = s.sessions.find(ses => ses.isBreak);
  expect(breakSegment).toBeDefined();
  expect(breakSegment.notes).toBe('Long break');
  expect(breakSegment.mood).toBe(2);
  expect(breakSegment.tags).toContain('rest');
});

it('saveState saves break form values when paused', () => {
  const now = Date.now();
  store.setState({
    sessions: [],
    tracker: { startTime: now, isPaused: true, pauseStart: now, segmentStartTime: now, workBlockId: 'test-block', totalSavedDurationMs: 0, isBreak: false },
    backupIntervalMs: 600000,
  });
  document.getElementById('break-notes').value = 'Break backup';
  document.getElementById('break-session-mood-input').value = '2';

  storage.saveState.mockClear();
  app.persistAndRender();
  const saved = storage.saveState.mock.calls[0][0];
  expect(saved.tracker.backupNotes).toBe('Break backup');
  expect(saved.tracker.backupMood).toBe('2');
});

it('init crash recovery shows break form when recovered tracker was paused', async () => {
  const now = Date.now();
  storage.loadState.mockResolvedValue({
    _migrationVersion: '1.2.0',
    sessions: [],
    configs: [],
    markedDays: [],
    tags: [],
    darkMode: false,
    tracker: { startTime: now, isPaused: true, pauseStart: now, segmentStartTime: now, workBlockId: 'test-block', totalSavedDurationMs: 0, isBreak: false, backupNotes: 'Crashed during break', backupMood: '4' },
    backupIntervalMs: 600000,
  });

  await app.init();

  expect(document.getElementById('session-notes').classList.contains('hidden')).toBe(true);
  expect(document.getElementById('break-session-notes').classList.contains('hidden')).toBe(false);
  expect(document.getElementById('break-notes').value).toBe('Crashed during break');
});
```

- [ ] **Step 3.2: Run tests to verify they fail**

Run: `npm test`
Expected: New tests fail

- [ ] **Step 3.3: Update stopSession paused branch**

In the `if (tracker.isPaused)` block of `stopSession`, replace the hardcoded break session with:
```js
const breakFormValues = readBreakFormValues();
const breakSession = {
  id: Date.now(),
  date: utils.formatDate(d),
  startTime: d.toISOString(),
  endTime: new Date().toISOString(),
  duration: utils.formatDuration(breakDuration),
  durationSec: breakDuration,
  notes: breakFormValues.notes,
  dayType: getDayType(utils.formatDate(d), s),
  tags: breakFormValues.tags,
  mood: breakFormValues.mood,
  workBlockId: tracker.workBlockId,
  isBreak: true,
};
```

Update the form hiding at the end of `stopSession` to hide both forms:
```js
const notes = document.getElementById('notes');
if (notes) notes.value = '';
const moodInput = document.getElementById('current-session-mood-input');
if (moodInput) moodInput.value = '5';
const breakNotes = document.getElementById('break-notes');
if (breakNotes) breakNotes.value = '';
const breakMoodInput = document.getElementById('break-session-mood-input');
if (breakMoodInput) breakMoodInput.value = '5';
const notesContainer = document.getElementById('session-notes');
if (notesContainer) notesContainer.classList.add('hidden');
const breakNotesContainer = document.getElementById('break-session-notes');
if (breakNotesContainer) breakNotesContainer.classList.add('hidden');
```

- [ ] **Step 3.4: Update saveState to read active form**

In `saveState()`:
```js
if (tracker.startTime) {
  if (tracker.isPaused) {
    const notesEl = document.getElementById('break-notes');
    if (notesEl) tracker.backupNotes = notesEl.value;
    const moodEl = document.getElementById('break-session-mood-input');
    if (moodEl) tracker.backupMood = moodEl.value;
  } else {
    const notesEl = document.getElementById('notes');
    if (notesEl) tracker.backupNotes = notesEl.value;
    const moodEl = document.getElementById('current-session-mood-input');
    if (moodEl) tracker.backupMood = moodEl.value;
  }
}
```

- [ ] **Step 3.5: Update init crash recovery block**

Replace the existing recovery block (after `initializeCurrentSessionMood()` and `initializeBreakSessionMood()`) with:
```js
if (recoveredTracker && recoveredTracker.startTime) {
  if (recoveredTracker.isPaused) {
    const notesInput = document.getElementById('break-notes');
    if (notesInput && recoveredTracker.backupNotes !== undefined) {
      notesInput.value = recoveredTracker.backupNotes;
    }
    document.getElementById('break-session-notes')?.classList.remove('hidden');
    document.getElementById('session-notes')?.classList.add('hidden');
  } else {
    const notesInput = document.getElementById('notes');
    if (notesInput && recoveredTracker.backupNotes !== undefined) {
      notesInput.value = recoveredTracker.backupNotes;
    }
    document.getElementById('session-notes')?.classList.remove('hidden');
    document.getElementById('break-session-notes')?.classList.add('hidden');
  }
}
```

Also add `ui.initializeBreakSessionTags()` and `ui.initializeBreakSessionMood()` to `init()` right after `initializeCurrentSessionTags()` and `initializeCurrentSessionMood()` so they're ready when needed.

- [ ] **Step 3.6: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3.7: Commit**

```bash
git add src/app/app.js src/app/app.test.js
git commit -m "feat: stopSession reads break form when paused; saveState/init handle break form crash recovery"
```
