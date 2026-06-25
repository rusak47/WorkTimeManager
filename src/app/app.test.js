// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStore } from './state.js';
import { createEventHandlers } from './app.js';
import { createUIManager } from './uiManager.js';
import { createAccessibility } from './accessibility.js';
import { createSessionManager } from './sessionManager.js';
import { createConfigManager } from './configManager.js';
import { createStatsManager } from './statsManager.js';

vi.mock('../storage/storage.js', () => ({
  storage: { loadState: vi.fn(), saveState: vi.fn() },
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
    <div id="current-session-mood-input" value="5"></div>
    <div id="current-mood-value">5.0</div>
    <div id="current-session-start-time-input"></div>
    <div id="current-session-end-time-input"></div>
    <div id="current-session-accumulated-rest-duration-input"></div>
    <div id="session-notes" class="hidden"></div>
    <div class="duration-display">
      <span id="duration-label">Session Duration</span>
      <span id="active-duration">00:00:00</span>
    </div>
    <div id="mood-rating" data-rating="5"></div>
    <input id="session-mood" value="5" />
    <div id="mood-value">5.0</div>
    <input id="notes" />
    <input id="new-tag-input" />
    <input id="import-file" type="file" />
    <select id="year-selector"></select>
    <select id="tag-filter"><option value="work">Work</option></select>
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
    <button id="save-session"></button>
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
    <div id="default-tags"></div>
    <div id="preset-tags"></div>
    <div id="custom-tags"></div>
    <div id="stats-period-title"></div>
    <div id="tracker-tab"></div>
    <div id="sessions-tab"></div>
    <div id="stats-tab"></div>
    <div id="config-tab"></div>
    <button id="add-tag-btn"></button>
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
      currentTab: 'tracker',
      currentStatsPeriod: 'daily',
      darkMode: false,
      tracker: { startTime: null, isPaused: false, pauseStart: null, accumulatedPauseTime: 0, isBreak: false },
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
    expect(app.saveSession).toBeTypeOf('function');
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

  it('addCustomTag adds tag', () => {
    document.getElementById('new-tag-input').value = 'design';
    app.addCustomTag();
    expect(store.getState().tags.some(t => t.name === 'design')).toBe(true);
  });

  it('saveConfig creates config via configManager', () => {
    store.setState({ configs: [] });
    app.saveConfig();
    expect(store.getState().configs.length).toBeGreaterThan(0);
    expect(storage.saveState).toHaveBeenCalled();
  });

  it('loadData from storage loads state', async () => {
    storage.loadState.mockResolvedValue({
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

  it('deleteCustomTag removes tag after confirm', () => {
    store.setState({ tags: [{ name: 'custom1', isDefault: false, isEnabled: true, isCustom: true }] });
    window.confirm = vi.fn(() => true);
    app.deleteCustomTag('custom1');
    expect(store.getState().tags.some(t => t.name === 'custom1')).toBe(false);
    expect(storage.saveState).toHaveBeenCalled();
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
});
