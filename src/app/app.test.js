// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
      tags: [],
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
});
