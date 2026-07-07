// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStore } from './state.js';
import { createEventHandlers } from './app.js';
import { CURRENT_SESSION_INIT } from './constants.js';
import { createUIManager } from './uiManager.js';
import { createAccessibility } from './accessibility.js';
import { createSessionManager } from './sessionManager.js';
import { createConfigManager } from './configManager.js';
import { createStatsManager } from './statsManager.js';

vi.mock('../storage/storage.js', () => ({
  storage: { loadState: vi.fn(), saveState: vi.fn(), loadCalendar: vi.fn().mockResolvedValue({}) },
}));

function setupDOM() {
  document.body.innerHTML = `
    <div id="current-time"></div>
    <div id="recent-sessions"></div>
    <div id="all-sessions-list"></div>
    <div id="today-total">00:00:00</div>
    <div id="current-session-tags"></div>
    <div id="tags-container"></div>
    <div id="current-session-mood" data-rating="5"></div>
    <input type="hidden" id="current-session-mood-input" value="5" />
    <div id="current-mood-value">5.0</div>
    <div id="current-session-start-time-input"></div>
    <div id="current-session-end-time-input"></div>
    <div id="current-session-accumulated-rest-duration-input"></div>
    <div id="tracker-session-id"></div>
    <div id="session-notes" class="hidden"></div>
    <div id="break-session-notes" class="hidden">
      <div id="break-session-tags"></div>
      <div id="break-session-mood" data-rating="5"></div>
      <input type="hidden" id="break-session-mood-input" value="5">
      <div id="break-mood-value">5.0</div>
    </div>
    <textarea id="break-notes"></textarea>
    <div class="duration-display">
      <span id="duration-label">Current Duration</span>
      <span id="active-duration">00:00:00</span>
    </div>
    <div id="mood-rating" data-rating="5"></div>
    <input id="session-mood" value="5" />
    <div id="mood-value">5.0</div>
    <input id="notes" />
    <input id="new-tag-input" />
    <input id="import-file" type="file" />
    <select id="year-selector"></select>
    <select id="tag-filter"><option value="all">All Tags</option></select>
    <select id="subtag-filter"><option value="all" selected>All Subtags</option></select>
    <select id="mood-threshold"><option value="1">1</option></select>
    <input id="date-filter" />
    <select id="month-filter"><option value="">All</option><option value="1">Jan</option><option value="2">Feb</option><option value="3">Mar</option><option value="4">Apr</option><option value="5">May</option><option value="6">Jun</option><option value="7">Jul</option><option value="8">Aug</option><option value="9">Sep</option><option value="10">Oct</option><option value="11">Nov</option><option value="12">Dec</option></select>
    <select id="year-filter"><option value="">All</option><option value="2025">2025</option><option value="2026">2026</option></select>
    <select id="day-type-filter"><option value="">All</option><option value="Workday">Workday</option><option value="Weekend">Weekend</option></select>
    <div id="delete-modal" class="hidden"></div>
    <div id="session-modal" class="hidden"></div>
    <div id="modal-title"></div>
    <input id="session-id" />
    <input id="start-time" />
    <input id="end-time" />
    <input id="day-type" />
    <textarea id="modal-notes"></textarea>
    <input id="mark-date" />
    <input id="mark-day-type" />
    <input id="day-description" />
    <div id="mark-day-modal" class="hidden"></div>
    <div id="total-time"></div>
    <div id="sessions-count"></div>
    <div id="avg-duration"></div>
    <div id="yearly-stats-table" class="hidden"></div>
    <div id="yearly-stats-body"></div>
    <div id="income-chart-container" class="hidden"></div>
    <input id="working-hours" />
    <input id="break-duration-setting" />
    <select id="week-start"><option value="1">Monday</option></select>
    <input id="hourly-salary" type="radio" name="salary" checked />
    <input id="monthly-salary" type="radio" name="salary" />
    <input id="net-salary" type="radio" name="tax" checked />
    <input id="brutto-salary" type="radio" name="tax" />
    <input id="salary-value" />
    <input id="salary-tax" />
    <input id="untaxed-min" />
    <input id="inflation-rate" />
    <input id="dark-mode-setting" type="checkbox" />
    <button id="dark-mode-toggle"></button>
    <button id="start-btn"></button>
    <button id="stop-btn"></button>
    <button id="pause-btn"></button>
    <button id="add-session-btn"></button>
    <button id="close-modal"></button>
    <button id="cancel-session"></button>
    <button id="apply-filters"></button>
    <button id="mark-holiday"></button>
    <button id="mark-vacation"></button>
    <button id="save-mark-day"></button>
    <button id="cancel-mark-day"></button>
    <button id="daily-stats"></button>
    <button id="weekly-stats"></button>
    <button id="monthly-stats"></button>
    <button id="yearly-stats"></button>
    <button id="close-delete-modal"></button>
    <button id="cancel-delete"></button>
    <button id="confirm-delete"></button>
    <button id="save-settings"></button>
    <button id="view-config-history"></button>
    <button id="close-config-history"></button>
    <button id="export-all-data"></button>
    <button id="import-data"></button>
    <button id="reset-sessions"></button>
    <button id="reset-config"></button>
    <button id="reset-marked-days"></button>
    <div id="config-history-list"></div>
    <div id="config-history-modal" class="hidden"></div>
    <div id="tag-bucket-settings"></div>
    <div id="stats-period-title"></div>
    <div id="tracker-tab"></div>
    <div id="sessions-tab"></div>
    <div id="stats-tab"></div>
    <div id="config-tab"></div>
    <button id="add-tag-btn"></button>
    <div id="crash-recovery-banner" class="hidden"></div>
    <button id="dismiss-recovery-banner"></button>
    <input id="backup-interval" value="300" />
  `;
}

describe('app event handlers', () => {
  let store;
  let ui;
  let a11y;
  let storage;
  let app;

  beforeEach(async () => {
    setupDOM();
    store = createStore({
      sessions: [],
      configs: [],
      markedDays: [],
      tags: [{ name: 'work', isDefault: true, isEnabled: true, isCustom: false }],
      tagBuckets: {},
      currentTab: 'tracker',
      currentStatsPeriod: 'daily',
      darkMode: false,
      backupIntervalMs: 300000,
      tracker: { startTime: null, isPaused: false, pauseStart: null, segmentStartTime: null, workBlockId: null, totalSavedDurationMs: 0, isBreak: false },
    });
    ui = createUIManager(store);
    a11y = createAccessibility();
    const { storage: mockStorage } = await import('../storage/storage.js');
    storage = mockStorage;
    storage.loadState.mockResolvedValue(null);
    storage.saveState.mockResolvedValue(true);
    const sessionManager = createSessionManager(store);
    const configManager = createConfigManager(store);
    const statsManager = createStatsManager(store);
    app = createEventHandlers({ store, storage, sessionManager, configManager, statsManager, ui, a11y });
  });

  it('returns all expected methods', () => {
    expect(app.init).toBeTypeOf('function');
    expect(app.startSession).toBeTypeOf('function');
    expect(app.stopSession).toBeTypeOf('function');
    expect(app.togglePause).toBeTypeOf('function');
    expect(app.confirmDeleteSession).toBeTypeOf('function');
    expect(app.editSession).toBeTypeOf('function');
    expect(app.handleSessionFormSubmit).toBeTypeOf('function');
    expect(app.switchTab).toBeTypeOf('function');
    expect(app.toggleDarkMode).toBeTypeOf('function');
    expect(app.saveConfig).toBeTypeOf('function');
    expect(app.addCustomTag).toBeTypeOf('function');
    expect(app.setupEventListeners).toBeTypeOf('function');
    expect(app.loadData).toBeTypeOf('function');
  });

  it('startSession sets tracker and updates buttons', () => {
    app.startSession();
    const s = store.getState();
    expect(s.tracker.startTime).toBeTruthy();
    expect(s.tracker.isPaused).toBe(false);
    expect(document.getElementById('start-btn').disabled).toBe(true);
    expect(document.getElementById('stop-btn').disabled).toBe(false);
  });

  it('stopSession resets tracker and updates buttons', () => {
    app.startSession();
    app.stopSession();
    const s = store.getState();
    expect(s.tracker.startTime).toBeNull();
    expect(document.getElementById('start-btn').disabled).toBe(false);
    expect(document.getElementById('stop-btn').disabled).toBe(true);
  });

  it('togglePause pauses and resumes tracker', () => {
    app.startSession();
    app.togglePause();
    expect(store.getState().tracker.isPaused).toBe(true);
    app.togglePause();
    expect(store.getState().tracker.isPaused).toBe(false);
  });

  it('stopSession saves break session when paused', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));

    app.startSession();
    vi.advanceTimersByTime(10000);
    app.togglePause();
    vi.advanceTimersByTime(5000);

    app.stopSession();

    const s = store.getState();
    expect(s.tracker.startTime).toBeNull();
    expect(s.tracker.isPaused).toBe(false);
    expect(s.sessions.length).toBe(2);
    expect(s.sessions[0].isBreak).toBe(true);
    expect(s.sessions[0].tags).toContain('rest');
    expect(s.sessions[0].durationSec).toBeGreaterThanOrEqual(5);

    vi.useRealTimers();
  });

  it('togglePause saves work segment on pause and break on resume', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));

    app.startSession();
    const blockId = store.getState().tracker.workBlockId;
    expect(blockId).toBeTypeOf('string');

    vi.advanceTimersByTime(10000); // work 10s
    app.togglePause(); // pause = save work segment

    const s1 = store.getState();
    expect(s1.sessions.length).toBe(1);
    expect(s1.sessions[0].isBreak).toBe(false);
    expect(s1.sessions[0].workBlockId).toBe(blockId);
    expect(s1.sessions[0].durationSec).toBeGreaterThanOrEqual(10);
    expect(s1.tracker.totalSavedDurationMs).toBeGreaterThanOrEqual(10000);

    vi.advanceTimersByTime(5000); // break 5s
    app.togglePause(); // resume = save break segment

    const s2 = store.getState();
    expect(s2.sessions.length).toBe(2);
    expect(s2.sessions[0].isBreak).toBe(true);
    expect(s2.sessions[0].workBlockId).toBe(blockId);
    expect(s2.sessions[0].durationSec).toBeGreaterThanOrEqual(5);
    expect(s2.sessions[0].tags).toContain('rest');

    vi.useRealTimers();
  });

  it('stopSession while running saves final work segment', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));

    app.startSession();
    const blockId = store.getState().tracker.workBlockId;
    vi.advanceTimersByTime(15000);
    app.stopSession();

    const s = store.getState();
    expect(s.sessions.length).toBe(1);
    expect(s.sessions[0].isBreak).toBe(false);
    expect(s.sessions[0].workBlockId).toBe(blockId);
    expect(s.sessions[0].durationSec).toBeGreaterThanOrEqual(15);
    expect(s.tracker.startTime).toBeNull();
  });

  it('switchTab delegates to ui and updates store', () => {
    app.switchTab('stats');
    expect(store.getState().currentTab).toBe('stats');
  });

  it('toggleDarkMode toggles darkMode in store', () => {
    expect(store.getState().darkMode).toBe(false);
    app.toggleDarkMode();
    expect(store.getState().darkMode).toBe(true);
    app.toggleDarkMode();
    expect(store.getState().darkMode).toBe(false);
  });

  it('confirmDeleteSession removes session and closes modal', () => {
    store.setState({ sessions: [{ id: 1, date: '2026-01-01', durationSec: 3600 }] });
    const modal = document.getElementById('delete-modal');
    modal.dataset.sessionId = '1';
    modal.classList.remove('hidden');
    app.confirmDeleteSession();
    expect(store.getState().sessions.length).toBe(0);
    expect(modal.classList.contains('hidden')).toBe(true);
  });

  it('saveMarkedDay adds marked day and persists', () => {
    document.getElementById('mark-date').value = '2026-12-25';
    document.getElementById('mark-day-type').value = 'Holiday';
    app.saveMarkedDay();
    expect(store.getState().markedDays.length).toBe(1);
    expect(store.getState().markedDays[0].date).toBe('2026-12-25');
    expect(storage.saveState).toHaveBeenCalled();
  });

  it('addCustomTag adds tag and assigns to tagBuckets.other', () => {
    store.setState({ tagBuckets: { other: [] } });
    document.getElementById('new-tag-input').value = 'design';
    app.addCustomTag();
    const s = store.getState();
    expect(s.tags.some(t => t.name === 'design')).toBe(true);
    expect(s.tagBuckets.other).toContain('design');
  });

  it('saveConfig creates config via configManager', () => {
    store.setState({ configs: [] });
    app.saveConfig();
    expect(store.getState().configs.length).toBeGreaterThan(0);
    expect(storage.saveState).toHaveBeenCalled();
  });

  it('loadData from storage loads state', async () => {
    storage.loadState.mockResolvedValue({
      _migrationVersion: '1.1.0',
      sessions: [{ id: 1, date: '2026-01-01', durationSec: 3600 }],
      configs: [{ id: 100, workingHours: 8, breakDuration: 60, weekStart: 1, salaryType: 'hourly', salaryTaxType: 'net', salaryValue: 15, salaryTax: 20, untaxedMin: 500, inflationRate: 2.5, darkMode: false }],
      markedDays: [{ date: '2026-12-25', dayType: 'Holiday' }],
      tags: [{ name: 'work', isDefault: true, isEnabled: true }],
      darkMode: false,
    });
    await app.loadData();
    expect(store.getState().sessions.length).toBe(1);
    expect(store.getState().markedDays.length).toBe(1);
  });

  it('editSession fills modal fields', () => {
    store.setState({
      sessions: [{
        id: 42, date: '2026-06-24', startTime: '2026-06-24T08:00:00',
        endTime: '2026-06-24T09:00:00', duration: '01:00:00', durationSec: 3600,
        dayType: 'Workday', notes: 'Test', tags: ['work'], mood: 4,
      }],
      tags: [{ name: 'work', isDefault: true, isEnabled: true }],
    });
    app.editSession(42);
    expect(document.getElementById('modal-title').textContent).toBe('Edit Session');
    expect(document.getElementById('session-id').value).toBe('42');
  });

  it('editSession shows warning for multiple default tags', () => {
    store.setState({
      sessions: [{
        id: 43, date: '2026-06-25', startTime: '2026-06-25T08:00:00',
        endTime: '2026-06-25T09:00:00', duration: '01:00:00', durationSec: 3600,
        dayType: 'Workday', tags: ['work', 'rest'], mood: 4,
      }],
      tags: [
        { name: 'work', isDefault: true, isEnabled: true },
        { name: 'rest', isDefault: true, isEnabled: true },
      ],
      tagBuckets: { work: [], rest: [], study: [], sport: [], other: [] },
    });
    app.editSession(43);
    const warning = document.getElementById('multiple-defaults-warning');
    expect(warning).toBeTruthy();
    expect(warning.textContent).toContain('work');
    expect(warning.textContent).toContain('rest');
  });

  it('handleSessionFormSubmit updates session duration with accumulatedPauseTimeSec', () => {
    const e = { preventDefault: vi.fn() };
    store.setState({
      sessions: [{
        id: 99, date: '2026-06-19',
        startTime: '2026-06-19T10:00:00.000Z',
        endTime: '2026-06-19T15:00:00.000Z',
        duration: '03:00:00', durationSec: 10800,
        accumulatedPauseTimeSec: 7200,
        dayType: 'Workday', notes: 'Test', tags: ['work'], mood: 5,
      }],
      tags: [{ name: 'work', isDefault: true, isEnabled: true }],
    });
    document.getElementById('session-id').value = '99';
    document.getElementById('start-time').value = '2026-06-19T09:00';
    document.getElementById('end-time').value = '2026-06-19T16:00';
    document.getElementById('modal-notes').value = 'Test';
    document.getElementById('session-mood').value = '5';
    const tagEl = document.createElement('div');
    tagEl.className = 'tag selected';
    tagEl.dataset.tag = 'work';
    document.getElementById('tags-container').appendChild(tagEl);
    app.handleSessionFormSubmit(e);
    const updated = store.getState().sessions[0];
    expect(updated.durationSec).toBe(18000);
    expect(updated.duration).toBe('05:00:00');
  });

  it('handleSessionFormSubmit preserves legacy tags from edit session', () => {
    const e = { preventDefault: vi.fn() };
    store.setState({
      sessions: [{
        id: 200, date: '2026-06-28', startTime: '2026-06-28T10:00:00.000Z',
        endTime: '2026-06-28T12:00:00.000Z', duration: '02:00:00', durationSec: 7200,
        dayType: 'Workday', notes: 'Legacy', tags: ['work', 'coding', 'legacyTag'], mood: 5,
        bucket: 'work',
      }],
      tags: [
        { name: 'work', isDefault: true, isEnabled: true, isCustom: false },
        { name: 'coding', isDefault: false, isEnabled: true, isCustom: false },
      ],
      tagBuckets: { work: ['coding', 'meeting', 'email'], rest: [], study: [], sport: [], other: [] },
    });
    app.editSession(200);
    const legacyChip = document.querySelector('#tags-container .tag-chip.selected.readonly');
    expect(legacyChip).toBeTruthy();
    expect(legacyChip.dataset.tag).toBe('legacyTag');
    document.getElementById('start-time').value = '2026-06-28T10:00';
    document.getElementById('end-time').value = '2026-06-28T12:00';
    document.getElementById('modal-notes').value = 'Legacy';
    document.getElementById('session-mood').value = '5';
    app.handleSessionFormSubmit(e);
    const updated = store.getState().sessions[0];
    expect(updated.tags).toContain('work');
    expect(updated.tags).toContain('coding');
    expect(updated.tags).toContain('legacyTag');
  });

  it('handleSessionFormSubmit creates new session', () => {
    const e = { preventDefault: vi.fn() };
    const now = new Date();
    const later = new Date(now.getTime() + 3600000);
    document.getElementById('start-time').value = now.toISOString().slice(0, 16);
    document.getElementById('end-time').value = later.toISOString().slice(0, 16);
    store.setState({ tags: [{ name: 'work', isDefault: true, isEnabled: true }] });
    const tagEl = document.createElement('div');
    tagEl.className = 'tag selected';
    tagEl.dataset.tag = 'work';
    document.getElementById('tags-container').appendChild(tagEl);
    app.handleSessionFormSubmit(e);
    expect(store.getState().sessions.length).toBe(1);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('handleSessionFormSubmit auto-adds #tags from notes to tagBuckets.other', () => {
    const e = { preventDefault: vi.fn() };
    const now = new Date();
    const later = new Date(now.getTime() + 3600000);
    document.getElementById('start-time').value = now.toISOString().slice(0, 16);
    document.getElementById('end-time').value = later.toISOString().slice(0, 16);
    document.getElementById('modal-notes').value = 'Worked on #design and #review';
    store.setState({
      tags: [{ name: 'work', isDefault: true, isEnabled: true }],
      tagBuckets: { work: [], other: [] },
    });
    const tagEl = document.createElement('div');
    tagEl.className = 'tag selected';
    tagEl.dataset.tag = 'work';
    document.getElementById('tags-container').appendChild(tagEl);
    app.handleSessionFormSubmit(e);
    const s = store.getState();
    expect(s.tags.some(t => t.name === 'design')).toBe(true);
    expect(s.tags.some(t => t.name === 'review')).toBe(true);
    expect(s.tagBuckets.other).toContain('design');
    expect(s.tagBuckets.other).toContain('review');
    const session = s.sessions[0];
    expect(session.tags).toContain('work');
    expect(session.tags).toContain('design');
    expect(session.tags).toContain('review');
    expect(session.notes).not.toContain('#design');
    expect(session.notes).not.toContain('#review');
  });

  it('persistAndRender calls saveState and renders', async () => {
    store.setState({
      sessions: [{ id: 1, date: '2026-06-24', startTime: '2026-06-24T08:00:00',
        endTime: '2026-06-24T09:00:00', duration: '01:00:00', durationSec: 3600,
        dayType: 'Workday', tags: ['work'] }],
    });
    app.persistAndRender();
    expect(storage.saveState).toHaveBeenCalled();
    expect(document.getElementById('recent-sessions').innerHTML).toContain('2026-06-24');
  });

  it('applyFilters filters sessions by date', () => {
    store.setState({
      sessions: [
        { id: 1, date: '2026-06-01', startTime: '2026-06-01T08:00:00', durationSec: 3600, dayType: 'Workday' },
        { id: 2, date: '2026-06-02', startTime: '2026-06-02T08:00:00', durationSec: 3600, dayType: 'Workday' },
      ],
    });
    document.getElementById('date-filter').value = '2026-06-01';
    app.applyFilters();
    expect(document.querySelectorAll('.session-card').length).toBe(1);
  });

  it('applyFilters filters sessions by month', () => {
    document.getElementById('month-filter').value = '6';
    store.setState({
      sessions: [
        { id: 1, date: '2026-06-01', startTime: '2026-06-01T08:00:00Z', durationSec: 3600, dayType: 'Workday' },
        { id: 2, date: '2026-07-01', startTime: '2026-07-01T08:00:00Z', durationSec: 3600, dayType: 'Workday' },
      ],
    });
    app.applyFilters();
    expect(document.querySelectorAll('.session-card').length).toBe(1);
  });

  it('applyFilters filters sessions by year', () => {
    document.getElementById('year-filter').value = '2025';
    store.setState({
      sessions: [
        { id: 1, date: '2026-01-01', startTime: '2026-01-01T08:00:00Z', durationSec: 3600, dayType: 'Workday' },
        { id: 2, date: '2025-06-01', startTime: '2025-06-01T08:00:00Z', durationSec: 3600, dayType: 'Workday' },
      ],
    });
    app.applyFilters();
    expect(document.querySelectorAll('.session-card').length).toBe(1);
  });

  it('applyFilters filters sessions by day type', () => {
    document.getElementById('day-type-filter').value = 'Weekend';
    store.setState({
      sessions: [
        { id: 1, date: '2026-06-01', startTime: '2026-06-01T08:00:00', durationSec: 3600, dayType: 'Workday' },
        { id: 2, date: '2026-06-07', startTime: '2026-06-07T08:00:00', durationSec: 3600, dayType: 'Weekend' },
      ],
    });
    app.applyFilters();
    expect(document.querySelectorAll('.session-card').length).toBe(1);
  });

  it('saveMarkedDay updates existing marked day', () => {
    store.setState({ markedDays: [{ date: '2026-12-25', dayType: 'Holiday', description: '' }] });
    document.getElementById('mark-date').value = '2026-12-25';
    document.getElementById('mark-day-type').value = 'Workday';
    app.saveMarkedDay();
    expect(store.getState().markedDays.length).toBe(1);
    expect(store.getState().markedDays[0].dayType).toBe('Workday');
  });

  it('toggleDarkMode toggles and saves config', () => {
    store.setState({ configs: [{ id: 1, darkMode: false, workingHours: 8, breakDuration: 60, weekStart: 1, salaryType: 'hourly', salaryTaxType: 'net', salaryValue: 15, salaryTax: 20, untaxedMin: 500, inflationRate: 2.5 }] });
    app.toggleDarkMode();
    expect(store.getState().darkMode).toBe(true);
    expect(store.getState().configs[0].darkMode).toBe(true);
    expect(storage.saveState).toHaveBeenCalled();
  });

  it('saveConfig reads form fields and creates config', () => {
    store.setState({ configs: [] });
    document.getElementById('working-hours').value = '7';
    document.getElementById('break-duration-setting').value = '45';
    document.getElementById('week-start').value = '0';
    document.getElementById('salary-value').value = '20';
    document.getElementById('salary-tax').value = '25';
    document.getElementById('untaxed-min').value = '600';
    document.getElementById('inflation-rate').value = '3';
    document.getElementById('dark-mode-setting').checked = true;
    window.alert = vi.fn();
    app.saveConfig();
    expect(store.getState().configs.length).toBeGreaterThan(0);
    expect(window.alert).toHaveBeenCalledWith('Configuration saved successfully!');
  });

  it('addCustomTag ignores duplicate tag name', () => {
    document.getElementById('new-tag-input').value = 'work';
    app.addCustomTag();
    const workTags = store.getState().tags.filter(t => t.name === 'work');
    expect(workTags.length).toBe(1);
  });

  it('deleteCustomTag removes tag and clears from tagBuckets', () => {
    store.setState({
      tags: [{ name: 'custom1', isDefault: false, isEnabled: true, isCustom: true }],
      tagBuckets: { other: ['custom1'] },
    });
    window.confirm = vi.fn(() => true);
    app.deleteCustomTag('custom1');
    const s = store.getState();
    expect(s.tags.some(t => t.name === 'custom1')).toBe(false);
    expect(s.tagBuckets.other).not.toContain('custom1');
    expect(storage.saveState).toHaveBeenCalled();
  });

  it('syncHashtagTags extracts #tags from notes and adds unknown ones', () => {
    store.setState({
      tags: [{ name: 'work', isDefault: true, isEnabled: true }],
      tagBuckets: { work: [], other: [] },
    });
    app.syncHashtagTags('Working on #design and #review with #work');
    const s = store.getState();
    expect(s.tags.some(t => t.name === 'design')).toBe(true);
    expect(s.tags.some(t => t.name === 'review')).toBe(true);
    expect(s.tagBuckets.other).toContain('design');
    expect(s.tagBuckets.other).toContain('review');
    expect(s.tagBuckets.other).not.toContain('work');
  });

  it('syncHashtagTags adds to given bucket when passed', () => {
    store.setState({
      tags: [{ name: 'work', isDefault: true, isEnabled: true }],
      tagBuckets: { work: [], study: [], other: [] },
    });
    app.syncHashtagTags('#deepfocus and #coding', 'work');
    const s = store.getState();
    expect(s.tagBuckets.work).toContain('deepfocus');
    expect(s.tagBuckets.work).toContain('coding');
    expect(s.tagBuckets.other).toEqual([]);
  });

  it('syncHashtagTags falls back to other when bucket does not exist in tagBuckets', () => {
    store.setState({
      tags: [{ name: 'work', isDefault: true, isEnabled: true }],
      tagBuckets: { work: [], other: [] },
    });
    app.syncHashtagTags('#design', 'nonexistent');
    const s = store.getState();
    expect(s.tagBuckets.other).toContain('design');
  });

  it('syncHashtagTags returns added tags and cleaned notes', () => {
    store.setState({
      tags: [{ name: 'work', isDefault: true, isEnabled: true }],
      tagBuckets: { work: [], other: [] },
    });
    const result = app.syncHashtagTags('Working on #design and #work', 'work');
    expect(result).toEqual({
      addedTags: ['design'],
      foundTags: ['design', 'work'],
      cleanedNotes: 'Working on and',
    });
  });

  it('syncHashtagTags returns cleaned notes and empty addedTags when no new tags', () => {
    store.setState({
      tags: [{ name: 'work', isDefault: true, isEnabled: true }],
      tagBuckets: { work: [], other: [] },
    });
    const result = app.syncHashtagTags('Working on #work', 'work');
    expect(result).toEqual({
      addedTags: [],
      foundTags: ['work'],
      cleanedNotes: 'Working on',
    });
  });

  it('syncHashtagTags cleans multiple new tag mentions from notes', () => {
    store.setState({
      tags: [{ name: 'work', isDefault: true, isEnabled: true }],
      tagBuckets: { work: [], other: [] },
    });
    const result = app.syncHashtagTags('#design and #review for #work', 'work');
    expect(result.addedTags).toEqual(['design', 'review']);
    expect(result.foundTags).toEqual(['design', 'review', 'work']);
    expect(result.cleanedNotes).toBe('and for');
  });

  it('syncHashtagTags + renderTagSettings shows new subtag in settings', () => {
    store.setState({
      tags: [
        { name: 'work', isDefault: true, isEnabled: true, isCustom: false },
        { name: 'study', isDefault: true, isEnabled: true, isCustom: false },
      ],
      tagBuckets: { work: ['dev'], study: [], other: [] },
    });
    app.syncHashtagTags('Working on #design and #coding', 'work');
    ui.renderTagSettings();
    const workBucket = document.querySelector('[data-bucket="work"]');
    expect(workBucket).not.toBeNull();
    const chips = workBucket.querySelectorAll('.tag-item');
    const texts = Array.from(chips).map(c => c.textContent.trim());
    expect(texts).toContain('design');
    expect(texts).toContain('coding');
    expect(texts).toContain('dev');
  });

  it('exportAllData creates and triggers download', () => {
    store.setState({
      sessions: [{ id: 1, date: '2026-06-01', startTime: '2026-06-01T08:00:00', endTime: '2026-06-01T09:00:00', duration: '01:00:00', durationSec: 3600, dayType: 'Workday', tags: ['work'], mood: 5 }],
    });
    const blobSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
    vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());
    app.exportAllData();
    expect(blobSpy).toHaveBeenCalled();
  });

  it('resetSessionsFn resets sessions', () => {
    store.setState({ sessions: [{ id: 1, date: '2026-01-01', durationSec: 3600 }] });
    window.alert = vi.fn();
    app.resetSessionsFn();
    expect(store.getState().sessions.length).toBe(0);
  });

  it('resetConfigFn resets config', () => {
    store.setState({ configs: [{ id: 1, workingHours: 8, breakDuration: 60 }] });
    window.alert = vi.fn();
    app.resetConfigFn();
    const configs = store.getState().configs;
    expect(configs.length).toBe(1);
    expect(configs[0].workingHours).toBe(8);
    expect(configs[0].breakDuration).toBe(60);
  });

  it('resetMarkedDaysFn resets marked days', () => {
    store.setState({ markedDays: [{ date: '2026-12-25', dayType: 'Holiday' }] });
    window.alert = vi.fn();
    app.resetMarkedDaysFn();
    expect(store.getState().markedDays.length).toBe(0);
  });

  it('showAddSessionModal and hideSessionModal delegate to ui', () => {
    const modal = document.getElementById('session-modal');
    modal.classList.add('hidden');
    app.showAddSessionModal();
    expect(modal.classList.contains('hidden')).toBe(false);
    app.hideSessionModal();
    expect(modal.classList.contains('hidden')).toBe(true);
  });

  it('handleSessionFormSubmit sets isBreak=true when tag changed to rest', () => {
    const e = { preventDefault: vi.fn() };
    store.setState({
      sessions: [{
        id: 301, date: '2026-07-07', startTime: '2026-07-07T10:00:00.000Z',
        endTime: '2026-07-07T12:00:00.000Z', duration: '02:00:00', durationSec: 7200,
        dayType: 'Workday', notes: 'Morning work', tags: ['work'], mood: 5, isBreak: false,
        bucket: 'work',
      }],
      tagBuckets: { work: [], rest: [], study: [], sport: [], other: [] },
    });
    document.getElementById('session-id').value = '301';
    document.getElementById('start-time').value = '2026-07-07T10:00';
    document.getElementById('end-time').value = '2026-07-07T12:00';
    document.getElementById('modal-notes').value = 'Morning work';
    document.getElementById('session-mood').value = '5';
    document.getElementById('tags-container').innerHTML =
      '<div class="picker-row-1 flex flex-wrap gap-1.5 mb-2">' +
        '<span class="tag-chip inline-block ... selected" data-tag="rest">Rest</span>' +
      '</div>';
    app.handleSessionFormSubmit(e);
    const updated = store.getState().sessions[0];
    expect(updated.isBreak).toBe(true);
    expect(updated.tags).toContain('rest');
  });

  it('handleSessionFormSubmit sets isBreak=false when tag changed from rest to work', () => {
    const e = { preventDefault: vi.fn() };
    store.setState({
      sessions: [{
        id: 302, date: '2026-07-07', startTime: '2026-07-07T14:00:00.000Z',
        endTime: '2026-07-07T14:30:00.000Z', duration: '00:30:00', durationSec: 1800,
        dayType: 'Workday', notes: 'Break walk', tags: ['rest'], mood: 4, isBreak: true,
        bucket: 'rest',
      }],
      tagBuckets: { work: [], rest: [], study: [], sport: [], other: [] },
    });
    document.getElementById('session-id').value = '302';
    document.getElementById('start-time').value = '2026-07-07T14:00';
    document.getElementById('end-time').value = '2026-07-07T14:30';
    document.getElementById('modal-notes').value = 'Break walk';
    document.getElementById('session-mood').value = '4';
    document.getElementById('tags-container').innerHTML =
      '<div class="picker-row-1 flex flex-wrap gap-1.5 mb-2">' +
        '<span class="tag-chip inline-block selected" data-tag="work">Work</span>' +
      '</div>';
    app.handleSessionFormSubmit(e);
    const updated = store.getState().sessions[0];
    expect(updated.isBreak).toBe(false);
    expect(updated.tags).toContain('work');
  });

  it('handleSessionFormSubmit validates endTime > startTime', () => {
    const e = { preventDefault: vi.fn() };
    const now = new Date();
    const earlier = new Date(now.getTime() - 3600000);
    document.getElementById('start-time').value = now.toISOString().slice(0, 16);
    document.getElementById('end-time').value = earlier.toISOString().slice(0, 16);
    window.alert = vi.fn();
    app.handleSessionFormSubmit(e);
    expect(store.getState().sessions.length).toBe(0);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalled();
  });

  it('persistAndRender saves tracker and backupIntervalMs', () => {
    const now = Date.now();
    store.setState({
      sessions: [],
      tracker: { startTime: now, isPaused: false, pauseStart: null, segmentStartTime: now, workBlockId: 'test-block', totalSavedDurationMs: 0, isBreak: false },
      backupIntervalMs: 600000,
    });
    storage.saveState.mockClear();
    app.persistAndRender();
    const saved = storage.saveState.mock.calls[0][0];
    expect(saved.tracker.startTime).toBe(now);
    expect(saved.backupIntervalMs).toBe(600000);
  });

  it('persistAndRender saves backup notes and mood in tracker when session is running', () => {
    const now = Date.now();
    document.getElementById('notes').value = 'Working on feature X';
    document.getElementById('current-session-mood-input').value = '4';

    store.setState({
      sessions: [],
      tracker: { startTime: now, isPaused: false, pauseStart: null, segmentStartTime: now, workBlockId: 'test-block', totalSavedDurationMs: 0, isBreak: false },
      backupIntervalMs: 600000,
    });
    storage.saveState.mockClear();
    app.persistAndRender();
    const saved = storage.saveState.mock.calls[0][0];
    expect(saved.tracker.backupWorkNotes).toBe('Working on feature X');
    expect(saved.tracker.backupWorkMood).toBe('4');
    expect(saved.tracker.startTime).toBe(now);
  });

  it('persistAndRender does not add backup fields when tracker is not running', () => {
    document.getElementById('notes').value = 'Should not appear';
    store.setState({
      sessions: [],
      tracker: { startTime: null, isPaused: false, pauseStart: null, segmentStartTime: null, workBlockId: null, totalSavedDurationMs: 0, isBreak: false },
    });
    storage.saveState.mockClear();
    app.persistAndRender();
    const saved = storage.saveState.mock.calls[0][0];
    expect(saved.tracker.backupWorkNotes).toBeUndefined();
    expect(saved.tracker.backupWorkMood).toBeUndefined();
  });

  it('init crash recovery reveals session-notes and restores backup notes from tracker', async () => {
    const now = Date.now();
    storage.loadState.mockResolvedValue({
      _migrationVersion: '1.2.0',
      sessions: [],
      configs: [],
      markedDays: [],
      tags: [],
      darkMode: false,
      tracker: { startTime: now, isPaused: false, pauseStart: null, segmentStartTime: now, workBlockId: 'test-block', totalSavedDurationMs: 0, isBreak: false, backupWorkNotes: 'Crashed but working', backupWorkMood: '3' },
      backupIntervalMs: 600000,
    });

    document.getElementById('session-notes').classList.add('hidden');

    await app.init();

    expect(document.getElementById('session-notes').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('notes').value).toBe('Crashed but working');
  });

  it('loadData restores fresh tracker from backup', async () => {
    const now = Date.now();
    storage.loadState.mockResolvedValue({
      _migrationVersion: '1.1.0',
      sessions: [],
      configs: [],
      markedDays: [],
      tags: [],
      darkMode: false,
      tracker: { startTime: now, isPaused: false, pauseStart: null, segmentStartTime: now, workBlockId: 'test-block', totalSavedDurationMs: 0, isBreak: false },
      backupIntervalMs: 600000,
    });
    await app.loadData();
    const s = store.getState();
    expect(s.tracker.startTime).toBe(now);
    expect(s.backupIntervalMs).toBe(600000);
  });

  it('loadData discards stale tracker older than 24h', async () => {
    const staleTime = Date.now() - 25 * 3600 * 1000;
    storage.loadState.mockResolvedValue({
      _migrationVersion: '1.1.0',
      sessions: [],
      configs: [],
      markedDays: [],
      tags: [],
      darkMode: false,
      tracker: { startTime: staleTime, isPaused: false, pauseStart: null, accumulatedPauseTime: 0, isBreak: false },
      backupIntervalMs: 300000,
    });
    await app.loadData();
    const s = store.getState();
    expect(s.tracker.startTime).toBeNull();
  });

  it('loadData does not override tracker when no tracker in saved state', async () => {
    storage.loadState.mockResolvedValue({
      _migrationVersion: '1.1.0',
      sessions: [],
      configs: [],
      markedDays: [],
      tags: [],
      darkMode: false,
    });
    await app.loadData();
    const s = store.getState();
    expect(s.tracker.startTime).toBeNull();
  });

  it('loadStateFromStorage restores tagBuckets from saved state', async () => {
    storage.loadState.mockResolvedValue({
      _migrationVersion: '1.1.0',
      tagBuckets: { work: [], rest: ['sleep'], study: [], sport: [], other: [] },
    });
    await app.loadData();
    expect(store.getState().tagBuckets).toEqual({ work: [], rest: ['sleep'], study: [], sport: [], other: [] });
  });

  it('loadData runs session tag migration and persists version flag', async () => {
    storage.loadState.mockResolvedValue({
      sessions: [
        { id: 1, notes: 'Worked on #design and #review', tags: ['work'], durationSec: 3600 },
        { id: 2, notes: 'Already clean', tags: ['work'], durationSec: 1800 },
      ],
      tags: [{ name: 'work', isDefault: true, isEnabled: true, isCustom: false }],
      tagBuckets: { work: [], rest: [], study: [], sport: [], other: [] },
    });
    storage.saveState.mockResolvedValue(true);
    await app.loadData();
    const s = store.getState();
    expect(s.sessions[0].tags).toEqual(['work', 'design', 'review']);
    expect(s.sessions[0].notes).toBe('Worked on and');
    expect(s.sessions[1]).toEqual({ id: 2, notes: 'Already clean', tags: ['work'], durationSec: 1800 });
    const saved = storage.saveState.mock.calls.find(c => c[0] && c[0]._migrationVersion);
    expect(saved).toBeDefined();
    expect(saved[0]._migrationVersion).toBe('1.1.0');
  });

  it('saveState includes tagBuckets in persisted state', () => {
    storage.saveState.mockClear();
    store.setState({ tagBuckets: { work: [], rest: ['sleep'], study: [], sport: [], other: [] } });
    app.persistAndRender();
    const saved = storage.saveState.mock.calls[0][0];
    expect(saved.tagBuckets).toEqual({ work: [], rest: ['sleep'], study: [], sport: [], other: [] });
  });

  it('loadData seeds tagBuckets from DEFAULT_BUCKET_MAP when empty or partial', async () => {
    storage.loadState.mockResolvedValue(null);
    store.setState({ tags: [], tagBuckets: {} });
    await app.loadData();
    const s = store.getState();
    expect(s.tagBuckets).toBeDefined();
    const bucketKeys = Object.keys(s.tagBuckets);
    expect(bucketKeys).toContain('work');
    expect(bucketKeys).toContain('rest');
    expect(bucketKeys).toContain('study');
    expect(bucketKeys).toContain('sport');
    expect(bucketKeys).toContain('other');
    expect(s.tagBuckets.rest).toContain('sleep');
  });

  it('loadData replaces incomplete tagBuckets with full DEFAULT_BUCKET_MAP', async () => {
    storage.loadState.mockResolvedValue({
      _migrationVersion: '1.1.0',
      tagBuckets: { other: ['custom'] },
    });
    store.setState({ tags: [{ name: 'work', isDefault: true, isEnabled: true, isCustom: false }] });
    await app.loadData();
    const s = store.getState();
    expect(Object.keys(s.tagBuckets)).toEqual(expect.arrayContaining(['work', 'rest', 'study', 'sport', 'other']));
    expect(s.tagBuckets.work).toEqual([]);
    expect(s.tagBuckets.rest).toContain('sleep');
  });

  it('loadData bootstraps tags from DEFAULT_TAGS and DEFAULT_BUCKET_MAP when no saved state', async () => {
    storage.loadState.mockResolvedValue(null);
    store.setState({ tags: [] });
    await app.loadData();
    const tags = store.getState().tags;
    const defaults = tags.filter(t => t.isDefault).map(t => t.name);
    expect(defaults).toContain('work');
    expect(defaults).toContain('rest');
    expect(defaults).toContain('study');
    expect(defaults).toContain('sport');
    expect(defaults).toContain('other');
    const presets = tags.filter(t => !t.isDefault && !t.isCustom);
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.every(t => t.isEnabled === true)).toBe(true);
    expect(presets.every(t => t.isCustom === false)).toBe(true);
  });

  it('saveConfig reads backup interval from input', () => {
    store.setState({ configs: [] });
    document.getElementById('backup-interval').value = '120';
    window.alert = vi.fn();
    app.saveConfig();
    expect(store.getState().backupIntervalMs).toBe(120000);
  });

  it('applyLatestConfig sets backup-interval input from store', () => {
    store.setState({
      backupIntervalMs: 120000,
      configs: [{ id: 1, workingHours: 8, breakDuration: 60, weekStart: 1, salaryType: 'hourly', salaryTaxType: 'net', salaryValue: 15, salaryTax: 20, untaxedMin: 500, inflationRate: 2.5, darkMode: false }],
    });
    ui.applyLatestConfig();
    expect(document.getElementById('backup-interval').value).toBe('120');
  });

  it('stopSession saves clean state with reset tracker', () => {
    app.startSession();
    storage.saveState.mockClear();
    app.stopSession();
    expect(storage.saveState).toHaveBeenCalled();
    const saved = storage.saveState.mock.calls[0][0];
    expect(saved.tracker.startTime).toBeNull();
    expect(saved.backupIntervalMs).toBe(300000);
  });

  it('timer shows valid duration after start with new tracker', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));

    app.startSession();
    vi.advanceTimersByTime(5000);
    ui.updateTimerDisplay();

    const display = document.getElementById('active-duration');
    expect(display.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(display.textContent).not.toContain('NaN');
    expect(display.textContent).toBe('00:00:05');

    vi.useRealTimers();
  });

  it('startSession reveals session-notes', () => {
    const notes = document.getElementById('session-notes');
    expect(notes.classList.contains('hidden')).toBe(true);

    app.startSession();
    expect(notes.classList.contains('hidden')).toBe(false);

    app.stopSession();
  });

  it('stopSession while paused picks newest work segment for edit form', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));

    app.startSession();
    const blockId = store.getState().tracker.workBlockId;
    vi.advanceTimersByTime(10000);
    app.togglePause();
    vi.advanceTimersByTime(5000);
    app.togglePause();
    vi.advanceTimersByTime(20000);
    app.togglePause();
    vi.advanceTimersByTime(5000);
    app.stopSession();

    const s = store.getState();
    const workSegments = s.sessions.filter(ses => !ses.isBreak && ses.workBlockId === blockId);
    expect(workSegments.length).toBe(2);

    const trackerSid = document.getElementById('tracker-session-id');
    expect(trackerSid.value).toBe(workSegments[0].id.toString());

    vi.useRealTimers();
  });

  it('stopSession when paused reads break form values and updates most recent work segment', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T12:00:00Z'));

    app.startSession();
    const blockId = store.getState().tracker.workBlockId;
    vi.advanceTimersByTime(10000);
    app.togglePause();
    document.getElementById('break-notes').value = 'Grabbed coffee';
    app.stopSession();

    const workSegments = store.getState().sessions.filter(ses => !ses.isBreak && ses.workBlockId === blockId);
    expect(workSegments.length).toBe(1);
    expect(workSegments[0].notes).toBe('Grabbed coffee');
    expect(workSegments[0].tags.includes('rest')).toBe(true);

    vi.useRealTimers();
  });

  it('stopSession when paused hides break form and clears break notes/mood', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T12:00:00Z'));

    app.startSession();
    vi.advanceTimersByTime(10000);
    app.togglePause();
    document.getElementById('break-notes').value = 'My break note';
    document.getElementById('break-session-mood-input').value = '3';

    app.stopSession();

    const breakForm = document.getElementById('break-session-notes');
    expect(breakForm.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('break-notes').value).toBe('');
    expect(document.getElementById('break-session-mood-input').value).toBe('5');

    vi.useRealTimers();
  });

  it('stopSession when paused uses break form values for break session instead of hardcoded defaults', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T12:00:00Z'));

    app.startSession();
    vi.advanceTimersByTime(10000);
    app.togglePause();
    vi.advanceTimersByTime(5000);
    document.getElementById('break-notes').value = 'Reading documentation';
    document.getElementById('break-session-tags').innerHTML =
      '<span class="tag-chip selected" data-tag="research">Research</span>';
    document.getElementById('break-session-mood-input').value = '4';

    app.stopSession();

    const breakSessions = store.getState().sessions.filter(s => s.isBreak);
    expect(breakSessions.length).toBeGreaterThanOrEqual(1);
    expect(breakSessions[0].notes).toBe('Reading documentation');
    expect(breakSessions[0].tags).toContain('research');
    expect(breakSessions[0].mood).toBe(4);

    vi.useRealTimers();
  });

  it('saveState reads break form values when paused', async () => {
    const now = Date.now();
    store.setState({
      tracker: {
        startTime: now, isPaused: true, pauseStart: now, segmentStartTime: now,
        workBlockId: 'test-block', totalSavedDurationMs: 0, isBreak: false
      },
      sessions: [],
    });
    document.getElementById('break-notes').value = 'Break notes during save';
    storage.saveState.mockClear();
    await app.saveState();
    const saved = storage.saveState.mock.calls[0][0];
    expect(saved.tracker.backupBreakNotes).toBe('Break notes during save');
    expect(saved.tracker.backupBreakMood).toBeDefined();
  });

  it('init restores break form when stopped while paused', async () => {
    storage.loadState.mockClear();
    const now = Date.now();
    storage.loadState.mockResolvedValue({
      _migrationVersion: '1.2.0',
      sessions: [],
      configs: [],
      markedDays: [],
      tags: [],
      darkMode: false,
      tracker: {
        startTime: now, isPaused: true, pauseStart: now, segmentStartTime: now,
        workBlockId: 'test-block', totalSavedDurationMs: 10000, isBreak: false,
        backupBreakNotes: 'Restored break notes', backupBreakMood: '3',
      },
      backupIntervalMs: 600000,
    });

    document.getElementById('break-session-notes').classList.add('hidden');
    document.getElementById('session-notes').classList.add('hidden');

    await app.init();

    expect(document.getElementById('break-notes').value).toBe('Restored break notes');
    expect(document.getElementById('break-session-mood-input').value).toBe('3');
  });

  it('readBreakFormValues returns break form values', () => {
    const tagContainer = document.getElementById('break-session-tags');
    const chip = document.createElement('div');
    chip.className = 'tag-chip selected';
    chip.dataset.tag = 'rest';
    tagContainer.appendChild(chip);
    document.getElementById('break-notes').value = 'Stretch break';
    document.getElementById('break-session-mood-input').value = '4';
    const values = app.readBreakFormValues();
    expect(values.notes).toBe('Stretch break');
    expect(values.tags).toContain('rest');
    expect(values.mood).toBe(4);
  });

  it('readBreakFormValues returns defaults when break form empty', () => {
    document.getElementById('break-notes').value = '';
    document.getElementById('break-session-mood-input').value = '5';
    const values = app.readBreakFormValues();
    expect(values.notes).toBe('');
    expect(values.mood).toBe(5);
  });

  it('togglePause hides work form and shows break form on pause', () => {
    app.startSession();
    const workForm = document.getElementById('session-notes');
    const breakForm = document.getElementById('break-session-notes');
    app.togglePause();
    expect(workForm.classList.contains('hidden')).toBe(true);
    expect(breakForm.classList.contains('hidden')).toBe(false);
  });

  it('togglePause hides break form and shows work form on resume', () => {
    const workForm = document.getElementById('session-notes');
    const breakForm = document.getElementById('break-session-notes');
    app.startSession();
    app.togglePause();
    app.togglePause();
    expect(workForm.classList.contains('hidden')).toBe(false);
    expect(breakForm.classList.contains('hidden')).toBe(true);
  });

  it('togglePause persists isPaused state on pause', () => {
    app.startSession();
    storage.saveState.mockClear();
    app.togglePause();
    const saved = storage.saveState.mock.calls[0][0];
    expect(saved.tracker.isPaused).toBe(true);
  });

  it('togglePause on pause saves empty backupBreakNotes from uninitialized break form', () => {
    app.startSession();
    storage.saveState.mockClear();
    app.togglePause();
    const saved = storage.saveState.mock.calls[0][0];
    expect(saved.tracker.backupBreakNotes).toBe('');
  });

  it('typing break notes triggers debounced saveState with backupBreakNotes', () => {
    vi.useFakeTimers();
    app.startSession();
    app.togglePause();
    app.setupEventListeners();
    storage.saveState.mockClear();

    const breakNotes = document.getElementById('break-notes');
    breakNotes.value = 'Had lunch and rested well';
    breakNotes.dispatchEvent(new Event('input'));

    vi.advanceTimersByTime(500);

    expect(storage.saveState).toHaveBeenCalledTimes(1);
    const saved = storage.saveState.mock.calls[0][0];
    expect(saved.tracker.backupBreakNotes).toBe('Had lunch and rested well');
    vi.useRealTimers();
  });

  it('saveState reads both work and break forms when paused', () => {
    app.startSession();
    app.togglePause();
    document.getElementById('break-notes').value = 'Break notes here';
    document.getElementById('notes').value = 'Work notes here';
    storage.saveState.mockClear();
    app.saveState();
    const saved = storage.saveState.mock.calls[0][0];
    expect(saved.tracker.backupBreakNotes).toBe('Break notes here');
    expect(saved.tracker.backupWorkNotes).toBe('Work notes here');
  });

  it('saveState reads both work and break forms when working', () => {
    app.startSession();
    document.getElementById('notes').value = 'Work notes here';
    document.getElementById('break-notes').value = 'Break notes here';
    storage.saveState.mockClear();
    app.saveState();
    const saved = storage.saveState.mock.calls[0][0];
    expect(saved.tracker.backupWorkNotes).toBe('Work notes here');
    expect(saved.tracker.backupBreakNotes).toBe('Break notes here');
  });

  it('crash recovery after resume restores break notes from backupBreakNotes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T08:00:00Z'));

    app.startSession();
    vi.advanceTimersByTime(3600000);
    app.togglePause();

    document.getElementById('break-notes').value = 'Ate lunch and went for a walk';
    document.getElementById('break-session-mood-input').value = '7';

    vi.advanceTimersByTime(5000);
    app.togglePause();

    storage.saveState.mockClear();
    await app.saveState();
    const savedState = storage.saveState.mock.calls[0][0];

    expect(savedState.tracker.isPaused).toBe(false);
    expect(savedState.tracker.backupBreakNotes).toBe('Ate lunch and went for a walk');
    expect(savedState.tracker.backupWorkNotes).toBe('');

    storage.loadState.mockResolvedValue(savedState);
    const store2 = createStore();
    store2.setState({
      configs: [], markedDays: [], tags: [{ name: 'work', isDefault: true, isEnabled: true, isCustom: false }],
      tagBuckets: {}, currentTab: 'tracker', currentStatsPeriod: 'daily', darkMode: false, backupIntervalMs: 300000,
      tracker: CURRENT_SESSION_INIT,
    });
    const ui2 = createUIManager(store2);
    const a11y2 = createAccessibility();
    const sessionManager2 = createSessionManager(store2);
    const configManager2 = createConfigManager(store2);
    const statsManager2 = createStatsManager(store2);
    const app2 = createEventHandlers({ store: store2, storage, sessionManager: sessionManager2, configManager: configManager2, statsManager: statsManager2, ui: ui2, a11y: a11y2 });

    document.body.innerHTML = '';
    setupDOM();

    await app2.init();

    expect(document.getElementById('session-notes').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('notes').value).toBe('');

    vi.useRealTimers();
  });

  it('togglePause reads break form values on resume', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));

    app.startSession();
    vi.advanceTimersByTime(10000);
    app.togglePause();
    document.getElementById('break-notes').value = 'Coffee break';
    vi.advanceTimersByTime(5000);
    app.togglePause();
    const s = store.getState();
    const breakSegment = s.sessions[0];
    expect(breakSegment.notes).toBe('Coffee break');
    expect(breakSegment.tags).toContain('rest');

    vi.useRealTimers();
  });

  it('full crash recovery cycle restores break notes from persisted state', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T08:00:00Z'));

    app.startSession();
    vi.advanceTimersByTime(3600000);
    app.togglePause();

    const breakForm = document.getElementById('break-session-notes');
    expect(breakForm.classList.contains('hidden')).toBe(false);

    document.getElementById('break-notes').value = 'Ate lunch and went for a walk';

    storage.saveState.mockClear();
    await app.saveState();
    const savedState = storage.saveState.mock.calls[0][0];

    expect(savedState.tracker.isPaused).toBe(true);
    expect(savedState.tracker.backupBreakNotes).toBe('Ate lunch and went for a walk');

    storage.loadState.mockResolvedValue(savedState);
    const store2 = createStore();
    store2.setState({
      configs: [], markedDays: [], tags: [{ name: 'work', isDefault: true, isEnabled: true, isCustom: false }],
      tagBuckets: {}, currentTab: 'tracker', currentStatsPeriod: 'daily', darkMode: false, backupIntervalMs: 300000,
      tracker: CURRENT_SESSION_INIT,
    });
    const ui2 = createUIManager(store2);
    const a11y2 = createAccessibility();
    const sessionManager2 = createSessionManager(store2);
    const configManager2 = createConfigManager(store2);
    const statsManager2 = createStatsManager(store2);
    const app2 = createEventHandlers({ store: store2, storage, sessionManager: sessionManager2, configManager: configManager2, statsManager: statsManager2, ui: ui2, a11y: a11y2 });

    document.body.innerHTML = '';
    document.body.innerHTML = `
      <div id="break-session-notes" class="hidden">
        <textarea id="break-notes"></textarea>
        <div id="break-session-tags"></div>
        <div id="break-session-mood" data-rating="5"></div>
        <input type="hidden" id="break-session-mood-input" value="5">
        <div id="break-mood-value">5.0</div>
      </div>
      <div id="session-notes" class="hidden"><input id="notes" /></div>
      <div id="current-session-mood" data-rating="5"></div>
      <input type="hidden" id="current-session-mood-input" value="5" />
      <div id="current-mood-value">5.0</div>
      <div id="current-session-tags"></div>
      <div id="today-total">00:00:00</div>
      <div id="recent-sessions"></div>
      <div id="all-sessions-list"></div>
      <div id="active-duration">00:00:00</div>
      <span id="duration-label">Current Duration</span>
      <div id="crash-recovery-banner" class="hidden"></div>
      <button id="dismiss-recovery-banner"></button>
      <input id="backup-interval" value="300" />
      <button id="start-btn"></button>
      <button id="stop-btn"></button>
      <button id="pause-btn"></button>
      <select id="year-selector"></select>
      <select id="tag-filter"><option value="all">All Tags</option></select>
      <div id="tag-bucket-settings"></div>
      <input id="new-tag-input" />
    `;

    await app2.init();

    const restoredBreakForm = document.getElementById('break-session-notes');
    expect(restoredBreakForm.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('break-notes').value).toBe('Ate lunch and went for a walk');

    vi.useRealTimers();
  });
});
