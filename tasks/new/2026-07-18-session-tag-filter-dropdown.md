# Session Tag Filter — Dropdown Checkbox

> **Status**: in progress
> **Date**: 2026-07-18
> **TODO reference**: Sessions tag filter feature

## Goal
Replace native `<select multiple>` tag filter with a custom dropdown checkbox for better UX.

## Design

- Button shows "Tags" or "Tags (N)" when filtered
- Dropdown opens on button click, closes on outside click
- Checkboxes for each tag bucket, all checked by default
- Checkbox change triggers re-render immediately

## Files
- `src/index.html` — replace select with button + dropdown div
- `src/css/styles.css` — dropdown panel styles
- `src/app/uiManager.js` — populate dropdown, expose getSelectedSessionTags()
- `src/app/app.js` — event handlers (toggle, outside click, checkbox change)
- `src/app/uiManager.test.js` — update setupDOM and tests
- `src/app/app.test.js` — update setupDOM
