# Persistent storage

**Date:** 2026-06-23

`storage.js` with Electron IPC persistence layer (`window.api.saveData` / `window.api.loadData`). Falls back to `localStorage` when Electron IPC unavailable (browser dev mode).

