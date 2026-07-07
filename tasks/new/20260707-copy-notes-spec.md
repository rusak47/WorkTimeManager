# Copy Notes from Recent Sessions into Tracker — Spec

> **Status**: revise needed, not for implementation
> **Date**: 2026-07-07

## Goal

User can copy notes text from a past session in the Recent Sessions list into
the currently active tracker notes textarea (`#notes` or `#break-notes`).

## Approach: Copy icon per session card

Add a small copy icon (`<i class="fas fa-copy">`) next to the notes text in each
recent-session card's notes display. On click:

1. Read the session's notes text from `dataset.notes`
2. Append to the currently **visible** tracker textarea:
   - `#notes` if running (work mode)
   - `#break-notes` if paused (break mode)
3. Trigger `saveState()` so the copied content is persisted

## Files

| File | Change |
|---|---|
| `uiManager.js:renderRecentSessions()` | Add `data-notes` attr + copy icon `<i class="fas fa-copy copy-notes ...">` next to notes `<p>` |
| `app.js:setupEventListeners()` | Click delegation for `.copy-notes`: read `dataset.notes`, find visible textarea, append, `saveState()` |
| `app.test.js` | Test: click copy icon → notes appended to work/break textarea |

## Edge cases

- No tracker running: copy to clipboard instead of textarea
- Notes already contain same text: still append (user can dedupe)
- Grid mode (no notes displayed): skip icon or show on hover
- Multiple copies: each click appends again (no dedup logic)

## Guard

Session-card click handler already has `!e.target.closest('button')` guard, so
the copy icon (inside a button) will not trigger `editSession`.
