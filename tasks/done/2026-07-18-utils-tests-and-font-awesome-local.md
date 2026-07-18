# Utils Tests + Font Awesome Local

> **Date**: 2026-07-18

## What was done

### 1. Unit tests for `src/js/utils.js`

Added 24 tests covering all 6 exported functions:
- `formatTime` — locale time string
- `formatDuration` — seconds to HH:MM:SS
- `formatDate` — date to YYYY-MM-DD
- `parseDuration` — HH:MM:SS to seconds (inverse of formatDuration)
- `formatDateTimeLocal` — date for datetime-local input
- `getDayTypeBadgeClass` — day type to Tailwind classes

File: `src/js/utils.test.js`

### 2. Font Awesome — CDN removed, local static assets

Replaced `cdnjs.cloudflare.com` CDN link with local copies:
- `src/css/fontawesome.min.css` — copied from `@fortawesome/fontawesome-free`
- `src/webfonts/` — 4 woff2 files (solid, regular, brands, v4compat)
- `src/index.html` — static `<link>` to local CSS
- `src/app/entry.js` — no JS import (pure CSS approach)

Benefits: no external dependency, works offline, no runtime JS overhead.

## Files changed

| File | Change |
|------|--------|
| `src/js/utils.test.js` | New — 24 unit tests |
| `src/css/fontawesome.min.css` | New — copied from npm package |
| `src/webfonts/fa-solid-900.woff2` | New |
| `src/webfonts/fa-regular-400.woff2` | New |
| `src/webfonts/fa-brands-400.woff2` | New |
| `src/webfonts/fa-v4compatibility.woff2` | New |
| `src/index.html` | CDN link removed, local CSS link added |
| `package.json` | `@fortawesome/fontawesome-free` removed |
