# All Sessions Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the All Sessions list to match the design sample's clean, minimal panel aesthetic while integrating with the existing app's color system.

**Architecture:** Add CSS classes to `styles.css` matching the design patterns, update `uiManager.js` to use them instead of Tailwind utilities, and convert the view toggle to a segmented control. No logic changes — purely visual.

**Tech Stack:** CSS custom properties, vanilla JS DOM manipulation, existing `--lt-*` color variables.

## Global Constraints

- No logic changes — only CSS class names and DOM structure in render functions
- Existing tests must pass without modification (436 tests)
- Dark mode must work via existing `.dark-mode` class on `<body>`
- Use existing `--lt-*` color variables where possible, add new ones if needed
- Session accent bar color should match day type (work=blue, holiday=green, etc.)
- All changes are in: `src/css/styles.css`, `src/app/uiManager.js`, `src/index.html`

---

## File Map

| File | Role |
|------|------|
| `src/css/styles.css` | Add new CSS classes for panel, rows, pills, segmented control |
| `src/app/uiManager.js` | Update `renderSessionCard`, `renderGroupHeader`, `renderDaySessions`, `renderAllSessions` to use new classes |
| `src/index.html` | Convert view toggle buttons to segmented control markup |

---

### Task 1: Add CSS classes for the new design

**Files:**
- Modify: `src/css/styles.css`

**What this does:** Adds all the CSS classes needed for the redesigned all-sessions view. Classes are standalone — no JS changes yet, so the app still uses old classes until Task 2.

- [ ] **Step 1: Add panel and row CSS classes**

Append to `src/css/styles.css` (before the `.all-sessions-more` block):

```css
/* All Sessions Panel */
.as-panel {
  background: var(--lt-100);
  border: 1px solid var(--lt-200);
  border-radius: 12px;
  overflow: hidden;
}
.dark-mode .as-panel {
  background: #1e2535;
  border-color: #2d3748;
}

/* Group Header (week/month/year rows) */
.as-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}
.as-group-header:hover {
  background: rgba(0,0,0,0.03);
}
.dark-mode .as-group-header:hover {
  background: rgba(255,255,255,0.05);
}
.as-group-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--lt-800);
  flex: 1;
}
.dark-mode .as-group-label {
  color: #e2e8f0;
}
.as-group-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.as-count-badge {
  background: var(--lt-100);
  border: 1px solid var(--lt-300);
  color: var(--lt-600);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.4;
}
.dark-mode .as-count-badge {
  background: #2d3748;
  border-color: #4a5568;
  color: #a0aec0;
}
.as-meta-stat {
  display: flex;
  align-items: baseline;
  gap: 3px;
  font-size: 12px;
  color: var(--lt-600);
}
.dark-mode .as-meta-stat {
  color: #a0aec0;
}
.as-meta-sym {
  font-size: 10px;
  color: var(--lt-400);
}
.dark-mode .as-meta-sym {
  color: #718096;
}

/* Day Row */
.as-day-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px 6px 32px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.as-day-row:hover {
  background: rgba(0,0,0,0.03);
}
.dark-mode .as-day-row:hover {
  background: rgba(255,255,255,0.05);
}
.as-day-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px 2px 6px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}
.as-day-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
/* Day pill colors by type */
.as-pill-work {
  background: #ebf5ff;
  border: 1px solid #93c5fd;
  color: #1d4ed8;
}
.as-pill-work .as-day-dot { background: #3b82f6; }
.as-pill-holiday {
  background: #ecfdf5;
  border: 1px solid #6ee7b7;
  color: #047857;
}
.as-pill-holiday .as-day-dot { background: #10b981; }
.as-pill-weekend {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
}
.as-pill-weekend .as-day-dot { background: #ef4444; }
.as-pill-vacation {
  background: #f5f3ff;
  border: 1px solid #c4b5fd;
  color: #6d28d9;
}
.as-pill-vacation .as-day-dot { background: #8b5cf6; }
.as-pill-other {
  background: var(--lt-100);
  border: 1px solid var(--lt-300);
  color: var(--lt-700);
}
.as-pill-other .as-day-dot { background: var(--lt-400); }
.dark-mode .as-pill-work {
  background: #1e3a5f;
  border-color: #2563eb;
  color: #93c5fd;
}
.dark-mode .as-pill-holiday {
  background: #064e3b;
  border-color: #059669;
  color: #6ee7b7;
}
.dark-mode .as-pill-weekend {
  background: #450a0a;
  border-color: #dc2626;
  color: #fca5a5;
}
.dark-mode .as-pill-vacation {
  background: #2e1065;
  border-color: #7c3aed;
  color: #c4b5fd;
}
.dark-mode .as-pill-other {
  background: #2d3748;
  border-color: #4a5568;
  color: #a0aec0;
}
.as-day-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.as-day-count {
  font-size: 11px;
  color: var(--lt-400);
}
.dark-mode .as-day-count {
  color: #718096;
}

/* Session Row */
.as-session-row {
  display: flex;
  align-items: flex-start;
  padding: 6px 16px 6px 48px;
  gap: 12px;
  position: relative;
  transition: background 0.15s ease;
}
.as-session-row:hover {
  background: rgba(0,0,0,0.03);
}
.dark-mode .as-session-row:hover {
  background: rgba(255,255,255,0.05);
}
.as-session-accent {
  position: absolute;
  left: 36px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  border-radius: 2px;
  background: var(--lt-300);
}
.dark-mode .as-session-accent {
  background: #4a5568;
}
.as-session-accent.work { background: #3b82f6; }
.as-session-accent.holiday { background: #10b981; }
.as-session-accent.weekend { background: #ef4444; }
.as-session-accent.vacation { background: #8b5cf6; }
.as-s-times {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 108px;
}
.as-s-time {
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--lt-800);
}
.dark-mode .as-s-time {
  color: #e2e8f0;
}
.as-s-dur {
  font-size: 11px;
  color: var(--lt-400);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.dark-mode .as-s-dur {
  color: #718096;
}
.as-s-note {
  font-size: 12px;
  color: var(--lt-600);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dark-mode .as-s-note {
  color: #a0aec0;
}
.as-s-tags {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.as-tag {
  background: var(--lt-100);
  border: 1px solid var(--lt-200);
  color: var(--lt-600);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 6px;
}
.dark-mode .as-tag {
  background: #2d3748;
  border-color: #4a5568;
  color: #a0aec0;
}

/* Segmented View Toggle */
.as-seg {
  display: inline-flex;
  border: 1px solid var(--lt-300);
  border-radius: 8px;
  overflow: hidden;
}
.dark-mode .as-seg {
  border-color: #4a5568;
}
.as-seg-btn {
  padding: 4px 12px;
  font-size: 12px;
  color: var(--lt-600);
  background: transparent;
  border: none;
  border-right: 1px solid var(--lt-300);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.as-seg-btn:last-child {
  border-right: none;
}
.as-seg-btn:hover {
  background: rgba(0,0,0,0.04);
}
.as-seg-btn.active {
  background: #3b82f6;
  color: white;
}
.dark-mode .as-seg-btn {
  color: #a0aec0;
  border-right-color: #4a5568;
}
.dark-mode .as-seg-btn:hover {
  background: rgba(255,255,255,0.08);
}
.dark-mode .as-seg-btn.active {
  background: #2563eb;
  color: white;
}
.as-view-label {
  font-size: 11px;
  color: var(--lt-500);
}
.dark-mode .as-view-label {
  color: #718096;
}
```

- [ ] **Step 2: Verify CSS loads**

Run: `npm run build` (or `npm run dev` and open browser)
Expected: No CSS errors, app renders normally (old classes still in use)

- [ ] **Step 3: Commit**

```bash
git add src/css/styles.css
git commit -m "style: add CSS classes for all-sessions visual redesign"
```

---

### Task 2: Update index.html view toggle to segmented control

**Files:**
- Modify: `src/index.html:209-212`

**What this does:** Replaces the three separate view toggle buttons with a segmented control matching the design sample.

- [ ] **Step 1: Replace view toggle markup**

In `src/index.html`, replace lines 209-212:

```html
<!-- OLD -->
<div class="flex items-center gap-2 mb-3">
    <button id="view-year" class="view-toggle px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white">Year</button>
    <button id="view-month" class="view-toggle px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white">Month</button>
    <button id="view-week" class="view-toggle px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white">Week</button>
</div>
```

With:

```html
<!-- NEW -->
<div class="flex items-center gap-2 mb-3">
    <span class="as-view-label">Group by</span>
    <div class="as-seg">
        <button id="view-year" class="as-seg-btn">Year</button>
        <button id="view-month" class="as-seg-btn">Month</button>
        <button id="view-week" class="as-seg-btn">Week</button>
    </div>
</div>
```

- [ ] **Step 2: Update app.js active state class**

In `src/app/app.js`, find the lines that add/remove the `active` class on view toggle buttons. They currently target `.view-toggle` — update to `.as-seg-btn`.

Search for `view-toggle` or `view-${s.allSessionsView}` in app.js and update the class references:

```js
// OLD
document.getElementById(`view-${s.allSessionsView || 'month'}`)?.classList.add('active');

// NEW — same logic, just the class name changes via CSS (the .as-seg-btn.active rule handles it)
// No JS change needed — the element IDs are the same, just the class on the element changed
```

Actually, the `active` class is added directly in app.js. Check lines ~704 and ~1086:

```js
// These lines add 'active' to the button — they work as-is because the CSS rule
// .as-seg-btn.active handles the styling. No change needed in app.js for this.
```

- [ ] **Step 3: Verify view toggle works**

Run: `npm run dev`, open browser, click Year/Month/Week — active state should highlight blue

- [ ] **Step 4: Commit**

```bash
git add src/index.html
git commit -m "style: convert view toggle to segmented control"
```

---

### Task 3: Update renderGroupHeader to use new CSS classes

**Files:**
- Modify: `src/app/uiManager.js:836-863`

**What this does:** Updates `renderGroupHeader` to use `as-group-*` classes instead of Tailwind utilities. Also adds the avg/total stats in the design's format.

- [ ] **Step 1: Update renderGroupHeader function**

Replace the `renderGroupHeader` function body:

```js
function renderGroupHeader(groupId, label, sessionCount, totalSec, extraLabel) {
    const expanded = isGroupExpanded(expandedGroups, groupId);
    const header = document.createElement('div');
    header.className = 'as-group-header';
    header.dataset.groupId = groupId;
    const chevron = document.createElement('i');
    chevron.className = `fas fa-chevron-${expanded ? 'down' : 'right'} text-xs text-gray-400 transition-transform`;
    const name = document.createElement('span');
    name.className = 'as-group-label';
    name.textContent = label;
    header.appendChild(chevron);
    header.appendChild(name);
    const meta = document.createElement('div');
    meta.className = 'as-group-meta';
    const countBadge = document.createElement('span');
    countBadge.className = 'as-count-badge';
    countBadge.textContent = sessionCount;
    meta.appendChild(countBadge);
    if (extraLabel) {
        const extra = document.createElement('span');
        extra.className = 'as-meta-stat';
        extra.innerHTML = `<span class="as-meta-sym">x̄</span>${extraLabel.replace('AVG ', '')}`;
        meta.appendChild(extra);
    }
    const totalStat = document.createElement('span');
    totalStat.className = 'as-meta-stat';
    totalStat.innerHTML = `<span class="as-meta-sym">Σ</span>${utils.formatDuration(totalSec)}`;
    meta.appendChild(totalStat);
    header.appendChild(meta);
    return { header, expanded };
}
```

- [ ] **Step 2: Verify group headers render**

Run: `npm run dev`, open Sessions tab — headers should show count badge + avg + total stats

- [ ] **Step 3: Commit**

```bash
git add src/app/uiManager.js
git commit -m "style: update group headers to use new CSS classes"
```

---

### Task 4: Update renderSessionCard to use new CSS classes

**Files:**
- Modify: `src/app/uiManager.js:786-811`

**What this does:** Updates `renderSessionCard` to use `as-session-*` classes with accent bar, monospace time, and note truncation.

- [ ] **Step 1: Update renderSessionCard function**

Replace the `renderSessionCard` function body:

```js
function renderSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'as-session-row';
    card.dataset.sessionId = session.id;
    const accent = document.createElement('div');
    accent.className = `as-session-accent ${session.dayType || ''}`;
    card.appendChild(accent);
    const times = document.createElement('div');
    times.className = 'as-s-times';
    const timeRange = document.createElement('span');
    timeRange.className = 'as-s-time';
    timeRange.textContent = `${utils.formatTime(new Date(session.startTime))} – ${utils.formatTime(new Date(session.endTime))}`;
    const duration = document.createElement('span');
    duration.className = 'as-s-dur';
    duration.textContent = session.duration;
    times.appendChild(timeRange);
    times.appendChild(duration);
    if (session.accumulatedPauseTimeSec) {
        const restEl = document.createElement('span');
        restEl.className = 'as-s-dur';
        restEl.textContent = `Rest ${utils.formatDuration(session.accumulatedPauseTimeSec)}`;
        times.appendChild(restEl);
    }
    card.appendChild(times);
    const content = document.createElement('div');
    content.style.cssText = 'flex:1;min-width:0';
    if (session.notes) {
        const note = document.createElement('div');
        note.className = 'as-s-note';
        note.textContent = session.notes;
        note.title = session.notes;
        content.appendChild(note);
    }
    if (session.tags && session.tags.length > 0) {
        const tagsEl = document.createElement('div');
        tagsEl.className = 'as-s-tags';
        for (const tag of session.tags) {
            const tagEl = document.createElement('span');
            tagEl.className = 'as-tag';
            tagEl.textContent = tag;
            tagsEl.appendChild(tagEl);
        }
        content.appendChild(tagsEl);
    }
    card.appendChild(content);
    return card;
}
```

- [ ] **Step 2: Verify session rows render**

Run: `npm run dev`, expand a day group — sessions should show accent bar, monospace times, notes, tags

- [ ] **Step 3: Commit**

```bash
git add src/app/uiManager.js
git commit -m "style: update session rows to use new CSS classes"
```

---

### Task 5: Update renderDaySessions to use new CSS classes

**Files:**
- Modify: `src/app/uiManager.js:813-834`

**What this does:** Updates `renderDaySessions` to use `as-day-*` classes with colored day pills.

- [ ] **Step 1: Add getDayPillClass helper**

Add this helper function before `renderDaySessions`:

```js
function getDayPillClass(dayType) {
    switch (dayType) {
        case 'Workday': return 'as-pill-work';
        case 'Holiday': return 'as-pill-holiday';
        case 'Weekend': return 'as-pill-weekend';
        case 'Vacation': return 'as-pill-vacation';
        default: return 'as-pill-other';
    }
}
```

- [ ] **Step 2: Update renderDaySessions function**

Replace the `renderDaySessions` function body:

```js
function renderDaySessions(date, sessions, container) {
    const s = store.getState();
    const md = s.markedDays.find(d => d.date === date);
    const dayType = md ? md.dayType : (() => { const d = new Date(date); return (d.getDay() === 0 || d.getDay() === 6) ? 'Weekend' : 'Workday'; })();
    const label = new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const group = document.createElement('div');
    group.className = 'collapsible-group';
    const groupId = `day-${date}`;
    const expanded = isGroupExpanded(expandedGroups, groupId);
    const { header } = renderGroupHeader(groupId, label, sessions.length, getTotalDuration(sessions));
    const dayRow = document.createElement('div');
    dayRow.className = 'as-day-row';
    const pill = document.createElement('div');
    pill.className = `as-day-pill ${getDayPillClass(dayType)}`;
    const dot = document.createElement('div');
    dot.className = 'as-day-dot';
    pill.appendChild(dot);
    pill.appendChild(document.createTextNode(label));
    dayRow.appendChild(pill);
    const dayMeta = document.createElement('div');
    dayMeta.className = 'as-day-meta';
    const dayCount = document.createElement('span');
    dayCount.className = 'as-day-count';
    dayCount.textContent = sessions.length === 1 ? '1 session' : `${sessions.length} sessions`;
    const totalStat = document.createElement('span');
    totalStat.className = 'as-meta-stat';
    totalStat.innerHTML = `<span class="as-meta-sym">Σ</span>${utils.formatDuration(getTotalDuration(sessions))}`;
    dayMeta.appendChild(dayCount);
    dayMeta.appendChild(totalStat);
    dayRow.appendChild(dayMeta);
    header.appendChild(dayRow);
    group.appendChild(header);
    if (expanded) {
        const sessionsContainer = document.createElement('div');
        sessionsContainer.className = 'as-sessions';
        for (const session of sessions) {
            sessionsContainer.appendChild(renderSessionCard(session));
        }
        group.appendChild(sessionsContainer);
    }
    container.appendChild(group);
}
```

- [ ] **Step 3: Verify day groups render**

Run: `npm run dev`, expand a week — days should show colored pills with dot, session count, total duration

- [ ] **Step 4: Commit**

```bash
git add src/app/uiManager.js
git commit -m "style: update day groups to use colored pills and new layout"
```

---

### Task 6: Update renderAllSessions container and week view

**Files:**
- Modify: `src/app/uiManager.js:865-991`

**What this does:** Wraps the all-sessions-list content in the `.as-panel` container and updates the week view to use the new day/session rendering.

- [ ] **Step 1: Add panel wrapper in renderAllSessions**

At the start of `renderAllSessions` (after `container.innerHTML = '';`), add a panel wrapper:

```js
// After container.innerHTML = '';
const panel = document.createElement('div');
panel.className = 'as-panel';
container.appendChild(panel);
```

Then change all `container.appendChild(...)` calls to `panel.appendChild(...)` within the function.

- [ ] **Step 2: Update week view rendering**

In the `else` block (week view), update to use `renderDaySessions` instead of rendering sessions directly:

```js
} else {
    const grouped = groupByWeek(sessionsToRender);
    const entries = Object.entries(grouped);
    const visibleEntries = entries.slice(0, allSessionsPageCount * PAGE_SIZE);
    for (const [date, daySessions] of visibleEntries) {
        const dayGrouped = {};
        for (const session of daySessions) {
            if (!dayGrouped[session.date]) dayGrouped[session.date] = [];
            dayGrouped[session.date].push(session);
        }
        renderGroup(`week-${date}`, new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }), daySessions, (group) => {
            for (const [dayDate, daySess] of Object.entries(dayGrouped).sort()) {
                renderDaySessions(dayDate, daySess, group);
            }
        });
    }
    if (entries.length > visibleEntries.length) {
        const remaining = entries.length - visibleEntries.length;
        const moreBtn = document.createElement('button');
        moreBtn.className = 'all-sessions-more';
        moreBtn.textContent = `More (${remaining})`;
        moreBtn.dataset.remaining = remaining;
        panel.appendChild(moreBtn);
    }
}
```

- [ ] **Step 3: Verify all views render correctly**

Run: `npm run dev`, switch between Year/Month/Week — all should show panel wrapper, colored pills, accent bars

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All 436 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/uiManager.js
git commit -m "style: wrap all-sessions in panel, update week view rendering"
```

---

### Task 7: Clean up old Tailwind classes and verify

**Files:**
- Modify: `src/app/uiManager.js`
- Modify: `src/index.html`

**What this does:** Removes any remaining old Tailwind classes that are no longer used, and does a final verification.

- [ ] **Step 1: Check for remaining old class references**

Search for `session-card`, `group-header px-4`, `view-toggle` in uiManager.js and index.html — ensure none remain (except in test files).

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All 436 tests pass

- [ ] **Step 3: Visual verification via Chrome DevTools**

Open the app, verify:
- Panel has rounded corners and subtle border
- Group headers show count badge + avg + total
- Day rows have colored pills (work=blue, holiday=green, weekend=red)
- Session rows have left accent bar matching day type
- Times are monospace
- Notes are italic, truncated with ellipsis
- Tags show as small rounded chips
- View toggle is a segmented control
- Dark mode works correctly
- Pagination "More" button still works

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "style: complete all-sessions visual redesign

- Panel wrapper with rounded corners and subtle border
- Colored day pills (work=blue, holiday=green, weekend=red, vacation=purple)
- Left accent bar on session rows matching day type
- Monospace time display
- Count badge + avg/total stats in group headers
- Segmented view toggle control
- Notes italic with ellipsis truncation
- Tags as small rounded chips
- Dark mode support throughout"
```

---

## Post-Implementation Checklist

- [ ] All 436 tests pass
- [ ] No console errors
- [ ] Light mode looks correct
- [ ] Dark mode looks correct
- [ ] Year/Month/Week views all work
- [ ] Pagination "More" button works
- [ ] Day groups collapse/expand correctly
- [ ] Session cards show correct data
- [ ] Accent bar colors match day types
- [ ] View toggle segmented control works
