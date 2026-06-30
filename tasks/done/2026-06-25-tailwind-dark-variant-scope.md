# Tailwind dark variant scoped to `.dark-mode` class

**Date:** 2026-06-25  
**Commit:** part of calendar color redesign

Added `@variant dark (&:where(.dark-mode, .dark-mode *))` so Tailwind's `dark:` classes respond to the app's toggle (not `prefers-color-scheme`). Fixes Electron having no way to switch theme when the OS is in dark mode.

