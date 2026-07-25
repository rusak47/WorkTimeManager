# Paginated All Sessions List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limit the all sessions list to show an initial batch of 8 top-level items, with a "More" button to load additional batches on demand. Applies to all views (year, month, week).

**Architecture:** Add pagination logic to `renderAllSessions` in `uiManager.js`. Track page count in closure scope. Reset on view/filter changes. "More" button handled via existing delegation in `app.js`.

**Tech Stack:** Vanilla JS, existing `renderGroup` pattern, existing click delegation

## Global Constraints

- TDD: write failing tests first, then implement
- `PAGE_SIZE = 8` in `constants.js`
- Page count resets on view change or filter change
- No "Less" button — once loaded, items stay visible
- "More" button shows remaining count: `More (12)`

---

## File Map

| File | Change |
|------|--------|
| `src/app/constants.js:62` | Add `PAGE_SIZE = 8` |
| `src/app/uiManager.js:864-956` | Add `allSessionsPageCount` variable, paginate entries, export `resetAllSessionsPage()` |
| `src/app/uiManager.js:959-961` | Update `toggleAllSessionGroup` (no change needed) |
| `src/app/app.js:976-981` | Call `ui.resetAllSessionsPage()` in `setAllSessionsView` |
| `src/app/app.js:985-991` | Add `.all-sessions-more` click handler |
| `src/app/uiManager.test.js:501+` | Add pagination tests |
| `src/css/styles.css` | Add `.all-sessions-more` styles |

---

### Task 1: Add PAGE_SIZE constant

**Files:**
- Modify: `src/app/constants.js:62`

**Interfaces:**
- Produces: `PAGE_SIZE` constant (number, value 8)

- [ ] **Step 1: Add constant**

```javascript
// At end of constants.js, after STATS_PERIODS
export const PAGE_SIZE = 8;
```

- [ ] **Step 2: Verify import works**

Run: `node -e "import('./src/app/constants.js').then(m => console.log(m.PAGE_SIZE))"`
Expected: `8`

- [ ] **Step 3: Commit**

```bash
git add src/app/constants.js
git commit -m "feat: add PAGE_SIZE constant for all sessions pagination"
```

---

### Task 2: Add pagination tests (TDD)

**Files:**
- Modify: `src/app/uiManager.test.js:501+` (within `describe('renderAllSessions')` block)

**Interfaces:**
- Consumes: `ui.renderAllSessions()`, `ui.resetAllSessionsPage()`
- Produces: 7 new test cases

- [ ] **Step 1: Write failing tests**

Add inside `describe('renderAllSessions')` block (after existing tests):

```javascript
it('shows at most PAGE_SIZE groups initially', () => {
  document.getElementById('year-filter').value = '';
  document.getElementById('month-filter').value = '';
  store.setState({
    sessions: mockSessions,
    markedDays: [],
    allSessionsView: 'week',
  });
  ui.renderAllSessions();
  const groups = document.querySelectorAll('.collapsible-group');
  expect(groups.length).toBeLessThanOrEqual(8);
});

it('shows More button when groups exceed PAGE_SIZE', () => {
  document.getElementById('year-filter').value = '';
  document.getElementById('month-filter').value = '';
  store.setState({
    sessions: mockSessions,
    markedDays: [],
    allSessionsView: 'week',
  });
  ui.renderAllSessions();
  const moreBtn = document.querySelector('.all-sessions-more');
  const groups = document.querySelectorAll('.collapsible-group');
  if (groups.length > 8) {
    expect(moreBtn).toBeTruthy();
    expect(moreBtn.textContent).toMatch(/More/);
  }
});

it('More button hidden when all groups fit', () => {
  document.getElementById('year-filter').value = '2026';
  document.getElementById('month-filter').value = '6';
  store.setState({
    sessions: mockSessions,
    markedDays: [],
    allSessionsView: 'week',
  });
  ui.renderAllSessions();
  const moreBtn = document.querySelector('.all-sessions-more');
  expect(moreBtn).toBeNull();
});

it('clicking More reveals next batch', () => {
  document.getElementById('year-filter').value = '';
  document.getElementById('month-filter').value = '';
  store.setState({
    sessions: mockSessions,
    markedDays: [],
    allSessionsView: 'week',
  });
  ui.renderAllSessions();
  const moreBtn = document.querySelector('.all-sessions-more');
  if (moreBtn) {
    const initialCount = document.querySelectorAll('.collapsible-group').length;
    moreBtn.click();
    const afterCount = document.querySelectorAll('.collapsible-group').length;
    expect(afterCount).toBeGreaterThan(initialCount);
  }
});

it('More button shows remaining count', () => {
  document.getElementById('year-filter').value = '';
  document.getElementById('month-filter').value = '';
  store.setState({
    sessions: mockSessions,
    markedDays: [],
    allSessionsView: 'week',
  });
  ui.renderAllSessions();
  const moreBtn = document.querySelector('.all-sessions-more');
  if (moreBtn) {
    const totalGroups = document.querySelectorAll('.collapsible-group').length + parseInt(moreBtn.dataset.remaining);
    const totalSessions = store.getState().sessions.length;
    expect(totalGroups).toBeGreaterThan(0);
  }
});

it('no More button after all items revealed', () => {
  document.getElementById('year-filter').value = '';
  document.getElementById('month-filter').value = '';
  store.setState({
    sessions: mockSessions,
    markedDays: [],
    allSessionsView: 'week',
  });
  ui.renderAllSessions();
  let moreBtn = document.querySelector('.all-sessions-more');
  while (moreBtn) {
    moreBtn.click();
    moreBtn = document.querySelector('.all-sessions-more');
  }
  const groups = document.querySelectorAll('.collapsible-group');
  expect(groups.length).toBeGreaterThan(0);
});

it('page count resets on view change', () => {
  document.getElementById('year-filter').value = '';
  document.getElementById('month-filter').value = '';
  store.setState({
    sessions: mockSessions,
    markedDays: [],
    allSessionsView: 'week',
  });
  ui.renderAllSessions();
  const moreBtn = document.querySelector('.all-sessions-more');
  if (moreBtn) moreBtn.click();
  ui.resetAllSessionsPage();
  ui.renderAllSessions();
  const groups = document.querySelectorAll('.collapsible-group');
  expect(groups.length).toBeLessThanOrEqual(8);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/app/uiManager.test.js`
Expected: FAIL (undefined is not a function / resetAllSessionsPage not exported)

- [ ] **Step 3: Commit (test-only)**

```bash
git add src/app/uiManager.test.js
git commit -m "test: add pagination tests for all sessions list"
```

---

### Task 3: Implement pagination in renderAllSessions

**Files:**
- Modify: `src/app/uiManager.js:864-961`
- Modify: `src/app/uiManager.js` (exports)

**Interfaces:**
- Consumes: `PAGE_SIZE` from constants.js
- Produces: `resetAllSessionsPage()` function (exported)

- [ ] **Step 1: Add import**

At top of `uiManager.js`, add `PAGE_SIZE` to the import from constants:

```javascript
import { DEFAULT_TAGS, SECONDS_PER_HOUR, PAGE_SIZE } from './constants.js';
```

- [ ] **Step 2: Add page count variable**

Inside the `createUIManager` function, near `expandedGroups` and `currentAllSessionsView`:

```javascript
let allSessionsPageCount = 1;
```

- [ ] **Step 3: Add resetAllSessionsPage function**

After `toggleAllSessionGroup` function:

```javascript
function resetAllSessionsPage() {
  allSessionsPageCount = 1;
}
```

- [ ] **Step 4: Modify renderAllSessions to paginate**

In `renderAllSessions`, after grouping logic and before rendering, collect entries and paginate:

For year view (line 913-924), replace the for loops:

```javascript
if (view === 'year') {
  const grouped = groupByYear(sessionsToRender);
  const entries = [];
  for (const [year, months] of Object.entries(grouped)) {
    for (const [month, days] of Object.entries(months)) {
      entries.push({ year, month, days });
    }
  }
  const visibleEntries = entries.slice(0, allSessionsPageCount * PAGE_SIZE);
  for (const { year, month, days } of visibleEntries) {
    const groupSessions = Object.values(days).flat();
    renderGroup(`year-${year}-${month}`, `${month} ${year}`, groupSessions, (group) => {
      for (const [date, daySessions] of Object.entries(days)) {
        renderDaySessions(date, daySessions, group);
      }
    });
  }
  if (entries.length > visibleEntries.length) {
    const remaining = entries.length - visibleEntries.length;
    const moreBtn = document.createElement('button');
    moreBtn.className = 'all-sessions-more';
    moreBtn.textContent = `More (${remaining})`;
    moreBtn.dataset.remaining = remaining;
    container.appendChild(moreBtn);
  }
}
```

For month view (line 925-946), replace the for loop:

```javascript
} else if (view === 'month') {
  const grouped = groupByMonth(sessionsToRender);
  if (view !== currentAllSessionsView) {
    expandedGroups = new Set();
    allSessionsPageCount = 1;
    const defaultExpanded = getDefaultExpandedDays(grouped);
    for (const id of defaultExpanded) {
      expandedGroups.add(id);
    }
    currentAllSessionsView = view;
  }
  const entries = Object.entries(grouped);
  const visibleEntries = entries.slice(0, allSessionsPageCount * PAGE_SIZE);
  for (const [week, days] of visibleEntries) {
    const groupSessions = Object.values(days).flat();
    const avg = getAverageDuration(groupSessions);
    const weekNum = week.split('-W')[1];
    const label = `Week ${weekNum}`;
    const avgText = `AVG ${utils.formatDuration(avg)}`;
    renderGroup(`month-${week}`, label, groupSessions, (group) => {
      for (const [date, daySessions] of Object.entries(days).sort()) {
        renderDaySessions(date, daySessions, group);
      }
    }, avgText);
  }
  if (entries.length > visibleEntries.length) {
    const remaining = entries.length - visibleEntries.length;
    const moreBtn = document.createElement('button');
    moreBtn.className = 'all-sessions-more';
    moreBtn.textContent = `More (${remaining})`;
    moreBtn.dataset.remaining = remaining;
    container.appendChild(moreBtn);
  }
}
```

For week view (line 947-956), replace the for loop:

```javascript
} else {
  const grouped = groupByWeek(sessionsToRender);
  const entries = Object.entries(grouped);
  const visibleEntries = entries.slice(0, allSessionsPageCount * PAGE_SIZE);
  for (const [date, daySessions] of visibleEntries) {
    renderGroup(`week-${date}`, new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }), daySessions, (group) => {
      for (const session of daySessions) {
        group.appendChild(renderSessionCard(session));
      }
    });
  }
  if (entries.length > visibleEntries.length) {
    const remaining = entries.length - visibleEntries.length;
    const moreBtn = document.createElement('button');
    moreBtn.className = 'all-sessions-more';
    moreBtn.textContent = `More (${remaining})`;
    moreBtn.dataset.remaining = remaining;
    container.appendChild(moreBtn);
  }
}
```

- [ ] **Step 5: Export resetAllSessionsPage**

In the return object of `createUIManager`, add:

```javascript
return {
  // ... existing exports
  resetAllSessionsPage,
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- --run src/app/uiManager.test.js`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/uiManager.js
git commit -m "feat: paginate all sessions list with More button"
```

---

### Task 4: Handle More button click in app.js

**Files:**
- Modify: `src/app/app.js:985-991`
- Modify: `src/app/app.js:976-981`

**Interfaces:**
- Consumes: `ui.resetAllSessionsPage()`, `ui.renderAllSessions()`

- [ ] **Step 1: Add More button click handler**

In the `all-sessions-list` click delegation (line 985-991), add handling for `.all-sessions-more`:

```javascript
document.getElementById('all-sessions-list')?.addEventListener('click', (e) => {
  const header = e.target.closest('.group-header');
  if (header) {
    ui.toggleAllSessionGroup(header.dataset.groupId);
    ui.renderAllSessions();
    return;
  }
  const moreBtn = e.target.closest('.all-sessions-more');
  if (moreBtn) {
    ui.incrementAllSessionsPage();
    ui.renderAllSessions();
  }
});
```

- [ ] **Step 2: Add incrementAllSessionsPage export**

In `uiManager.js`, add function and export:

```javascript
function incrementAllSessionsPage() {
  allSessionsPageCount++;
}
```

And add to the return object:

```javascript
return {
  // ... existing exports
  incrementAllSessionsPage,
  resetAllSessionsPage,
};
```

- [ ] **Step 3: Reset page count on filter changes**

In `setAllSessionsView` (app.js:976-981), add reset:

```javascript
const setAllSessionsView = (view) => {
  store.setState({ allSessionsView: view });
  document.querySelectorAll('.view-toggle').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`view-${view}`)?.classList.add('active');
  ui.resetAllSessionsPage();
  ui.renderAllSessions();
};
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/app.js src/app/uiManager.js
git commit -m "feat: wire More button click and page count reset"
```

---

### Task 5: Style the More button

**Files:**
- Modify: `src/css/styles.css`

**Interfaces:**
- Consumes: `.all-sessions-more` class

- [ ] **Step 1: Add CSS**

At end of `styles.css`:

```css
.all-sessions-more {
  display: block;
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.5rem;
  text-align: center;
  color: #6b7280;
  background: transparent;
  border: 1px dashed #d1d5db;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.all-sessions-more:hover {
  color: #374151;
  background: #f9fafb;
  border-color: #9ca3af;
}

.dark-mode .all-sessions-more {
  color: #9ca3af;
  border-color: #4b5563;
}

.dark-mode .all-sessions-more:hover {
  color: #e5e7eb;
  background: #1f2937;
  border-color: #6b7280;
}
```

- [ ] **Step 2: Visual verification**

Run: `npm run dev`
Open browser, navigate to Sessions tab, verify "More" button appears when list is long

- [ ] **Step 3: Commit**

```bash
git add src/css/styles.css
git commit -m "style: add More button styles for all sessions pagination"
```

---

### Task 6: Update docs and final verification

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `TODO.md`
- Move: `tasks/new/2026-07-25-paginated-all-sessions-list.md` → `tasks/done/`

**Interfaces:**
- N/A

- [ ] **Step 1: Update CHANGELOG.md**

Add under `## Unreleased` > `### Added`:

```markdown
- Paginated all sessions list — initial batch of 8 items with "More" button to load more
```

- [ ] **Step 2: Update TODO.md**

Mark the pagination task as done:

```markdown
- [x] [normal - must have] Paginate all sessions list — show initial batch of 8 top-level items, "More" button to load next batch. Applies to year/month/week views. (spec: `tasks/done/2026-07-25-paginated-all-sessions-list.md`, 2026-07-25)
```

- [ ] **Step 3: Move spec to done**

```bash
mv tasks/new/2026-07-25-paginated-all-sessions-list.md tasks/done/
```

- [ ] **Step 4: Run full test suite**

Run: `npm test -- --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md TODO.md tasks/
git commit -m "docs: update changelog and todo for pagination feature"
```

---

## Execution Handoff

**Plan complete. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session, batch execution with checkpoints

Which approach?