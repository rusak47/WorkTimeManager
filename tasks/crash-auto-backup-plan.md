# Crash Auto-Backup Plan

## Problem
When Electron app crashes during a running session (paused or working), the tracker state is lost because `state.tracker` is never persisted — it's purely in-memory.

## Solution
Single-tier persistent auto-backup. Include `tracker` in the existing `saveState()` blob. Periodically call `saveState()` while a session is running. On startup, detect a recovered tracker and restore it.

## Changes

### 1. `src/app/constants.js`
- Add `DEFAULT_BACKUP_INTERVAL_MS = 300000` (5 minutes)

### 2. `src/app/app.js`
- `saveState()` — include `tracker` in the persisted object, plus `backupIntervalMs`
- `loadStateFromStorage()` — restore tracker if valid and fresh (<24h), else reset
- `startSession()` — start `backupInterval` that calls `saveState()` every N ms
- `stopSession()` / `resetTracker()` — clear backup interval, save clean state
- `init()` — after `loadData()`, if tracker has a non-null `startTime`, show recovery banner, restart timer, restart backup interval, update button states
- `saveConfig()` — persist `backupIntervalMs` from the settings input
- `applyLatestConfig()` — read and apply the stored interval

### 3. `src/index.html`
- Add backup interval input to `#backup-settings` tab
- Add `#crash-recovery-banner` to tracker tab (initially hidden, dismissable)

### 4. `src/app/app.test.js`
- Test tracker restoration when valid and fresh
- Test tracker reset when stale (>24h)
- Test backup interval starts/stops with session lifecycle

### 5. `src/app/uiManager.js`
- Add `showCrashRecoveryBanner()` / `hideCrashRecoveryBanner()` methods
- Expose them in the return object
