# Tracker View — Design Template System

## Goal

Allow the tracker tab to render different visual designs (layouts, styling, widget arrangement) without changing business logic or state management.

## Architecture

```
store.getState()  →  templateFn(state)  →  DOM replaces #tracker-content children
```

Each template is a pure function: receives state, returns a DocumentFragment. No side effects, no direct `document.getElementById` calls for structural elements.

## Steps

### 1. Extract tracker template renderer from uiManager.js

- Create `src/app/templates/tracker-default.js`
- Move tracker rendering functions into it:
  - `renderTracker(state)` — the main function that renders the full tracker tab
  - `updateTimerDisplay(state)` — timer updates (needs to remain callable on interval)
  - `updateButtonStates(state)` — button enable/disable
  - `updateTodayTotal(state)` — today's total
  - `renderRecentSessions(state)` — recent sessions list
- Export a single `render(state)` function and individual updaters

### 2. Create template registry

- Create `src/app/templates/registry.js`
- Maps template names to modules:
  ```js
  const registry = {
    default: () => import('./tracker-default.js'),
  };
  export function getTemplate(name) { return registry[name]; }
  export function registerTemplate(name, loader) { registry[name] = loader; }
  ```

### 3. Move tracker tab HTML from index.html into JS

- The static HTML in `index.html` (lines 42-116) becomes the output of `tracker-default.js`
- Replace it with a placeholder div that the template fills:
  ```html
  <div id="tracker-content" class="fade-in" data-template="default"></div>
  ```

### 4. Add template selector to state/config

- In storage default state and config schema: `trackerTemplate: 'default'`
- In settings UI: dropdown to select template
- When template changes: re-render tracker, save to config

### 5. Wire re-render on template change

- In `app.js` event handlers: after config save, if `trackerTemplate` changed, call the new template's render
- Timer interval calls updaters on the active template

## Template Interface

```js
// Each template module exports:
export function render(state) {
  // Returns DocumentFragment or string of HTML
  // Called once on tab switch or template change
}

// Optional — called on timer tick (30Hz throttle)
export function updateTimer(state) { /* update timer display in-place */ }
export function updateButtons(state) { /* update button states */ }
export function updateTodayTotal(state) { /* update today's total */ }
```

## Files to Create

- `src/app/templates/tracker-default.js` — default template (extracted from uiManager.js)
- `src/app/templates/registry.js` — template registry

## Files to Modify

- `src/index.html` — replace tracker tab HTML with a placeholder
- `src/app/uiManager.js` — remove tracker-specific rendering functions
- `src/app/app.js` — wire template switching on config save
- `src/storage/storage.js` — add `trackerTemplate` to default state
- `TODO.md` — link this plan

## Prioritization Notes

- Step 1 (extract) is pure reorganization — no behavioral change, lowest risk
- Step 2-3 (registry + placeholder) can be done independently
- Step 4-5 (selector + wiring) are the actual feature — small scope
- Individual updaters (`updateTimer`, `updateButtons`, etc.) can be added incrementally; templates that don't export them fall back to full re-render
