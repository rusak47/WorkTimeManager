// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './state.js';
import { createUIManager } from './uiManager.js';
import { createCalendarService } from './calendarService.js';

class MockDataTransfer {
  constructor() {
    this._data = {};
  }
  setData(type, value) { this._data[type] = value; }
  getData(type) { return this._data[type] || ''; }
}

function createDragEvent(type, dt, opts = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  event.dataTransfer = dt || new MockDataTransfer();
  if (opts.ctrlKey) event.ctrlKey = true;
  if (opts.metaKey) event.metaKey = true;
  return event;
}

function setupDOM() {
  document.body.innerHTML = `
    <div id="current-time"></div>
    <div id="current-session-tags"></div>
    <div id="tags-container"></div>
    <div id="current-session-mood"></div>
    <div id="recent-sessions"></div>
    <div id="all-sessions-list"></div>
    <div class="duration-display">
      <span id="duration-label">Session Duration</span>
      <span id="active-duration">00:00:00</span>
    </div>
    <div id="today-total">00:00:00</div>
    <div id="today-status"></div>
    <div id="current-session-mood-input"></div>
    <div id="current-mood-value"></div>
    <select id="year-selector"></select>
    <div id="total-time"></div>
    <div id="sessions-count"></div>
    <div id="avg-duration"></div>
    <div id="mark-date"></div>
    <div id="mark-day-type"></div>
    <div id="day-description"></div>
    <div id="mark-day-modal" class="hidden"></div>
    <div id="delete-modal" class="hidden"></div>
    <div id="session-modal" class="hidden"></div>
    <div id="modal-title"></div>
    <div id="session-id"></div>
    <input id="start-time" />
    <input id="end-time" />
    <input id="day-type" />
    <textarea id="modal-notes"></textarea>
    <input id="session-mood" />
    <div id="mood-value"></div>
    <div id="mood-rating" data-rating="5"></div>
    <div id="config-history-list"></div>
    <div id="config-history-modal" class="hidden"></div>
    <input id="working-hours" />
    <input id="break-duration-setting" />
    <select id="week-start"><option value="1">Monday</option></select>
    <input id="hourly-salary" type="radio" />
    <input id="monthly-salary" type="radio" />
    <input id="net-salary" type="radio" />
    <input id="brutto-salary" type="radio" />
    <input id="salary-value" />
    <input id="salary-tax" />
    <input id="untaxed-min" />
    <input id="inflation-rate" />
    <div id="general-settings"></div>
    <div id="salary-settings" class="hidden"></div>
    <div id="tags-settings" class="hidden"></div>
    <div id="backup-settings" class="hidden"></div>
    <input id="dark-mode-setting" type="checkbox" />
    <button id="dark-mode-toggle"></button>
    <button id="start-btn"></button>
    <button id="stop-btn"></button>
    <button id="pause-btn"></button>
    <div id="yearly-stats-table" class="hidden"></div>
    <div id="yearly-stats-body"></div>
    <div id="income-chart-container" class="hidden"></div>
    <div id="stats-period-title"></div>
    <button id="daily-stats"></button>
    <button id="weekly-stats"></button>
    <button id="monthly-stats"></button>
    <button id="yearly-stats"></button>
    <div id="tracker-tab"></div>
    <div id="sessions-tab"></div>
    <div id="stats-tab"></div>
    <div id="config-tab"></div>
    <div id="tracker-content" class="hidden"></div>
    <div id="sessions-content" class="hidden"></div>
    <div id="stats-content" class="hidden"></div>
    <div id="config-content" class="hidden"></div>
    <select id="tag-filter"><option value="all">All Tags</option></select>
    <select id="mood-threshold"><option value="1">1</option></select>
    <div id="tag-bucket-settings"></div>
    <div id="current-session-start-time-input"></div>
    <div id="current-session-end-time-input"></div>
    <div id="current-session-accumulated-rest-duration-input"></div>
    <button id="recent-sessions-grid-toggle"></button>
  `;
}

const mockSessions = [
  { id: 1, date: '2026-06-24', startTime: '2026-06-24T08:00:00', endTime: '2026-06-24T09:00:00', duration: '01:00:00', durationSec: 3600, dayType: 'Workday', notes: 'Test', tags: ['work'], mood: 4 },
  { id: 2, date: '2026-06-24', startTime: '2026-06-24T10:00:00', endTime: '2026-06-24T11:30:00', duration: '01:30:00', durationSec: 5400, dayType: 'Workday', notes: '', tags: ['work', 'study'], mood: 5 },
  { id: 3, date: '2026-06-23', startTime: '2026-06-23T09:00:00', endTime: '2026-06-23T10:00:00', duration: '01:00:00', durationSec: 3600, dayType: 'Weekend', notes: 'Weekend work', tags: ['work'], mood: 3 },
];

const mockConfigs = [{
  id: 100, timestamp: '2026-06-01T00:00:00', workingHours: 8, breakDuration: 60, weekStart: 1,
  salaryType: 'hourly', salaryTaxType: 'net', salaryValue: 15, salaryTax: 20, untaxedMin: 500, inflationRate: 2.5, darkMode: false
}];

const mockTags = [
  { name: 'work', isDefault: true, isEnabled: true, isCustom: false },
  { name: 'rest', isDefault: true, isEnabled: true, isCustom: false },
  { name: 'study', isDefault: false, isEnabled: true, isCustom: false },
  { name: 'music', isDefault: false, isEnabled: false, isCustom: false },
  { name: 'customTag', isDefault: false, isEnabled: true, isCustom: true },
];

const mockMarkedDays = [
  { date: '2026-06-25', dayType: 'Holiday', description: 'Midsummer' },
];

describe('uiManager', () => {
  let store;
  let ui;

  beforeEach(() => {
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
  });

  describe('updateCurrentTime', () => {
    it('sets current-time textContent', () => {
      ui.updateCurrentTime();
      expect(document.getElementById('current-time').textContent).toBeTruthy();
    });
  });

  describe('updateTodayTotal', () => {
    it('displays 00:00:00 when no sessions', () => {
      ui.updateTodayTotal();
      expect(document.getElementById('today-total').textContent).toBe('00:00:00');
    });

    it('sums today session durations for work-tagged sessions', () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      store.setState({ sessions: [{ id: 99, date: todayStr, durationSec: 3600, tags: ['work'] }] });
      ui.updateTodayTotal();
      const total = document.getElementById('today-total').textContent;
      expect(total).not.toBe('00:00:00');
      expect(total).toBe('01:00:00');
    });

    it('excludes sessions without work tag', () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      store.setState({ sessions: [
        { id: 1, date: todayStr, durationSec: 3600, tags: ['rest'] },
        { id: 2, date: todayStr, durationSec: 1800, tags: ['work'] },
      ]});
      ui.updateTodayTotal();
      expect(document.getElementById('today-total').textContent).toBe('00:30:00');
    });
  });

  describe('updateTodayStatus', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows nothing when today is not marked', () => {
      store.setState({ markedDays: [] });
      ui.updateTodayStatus(store.getState());
      const el = document.getElementById('today-status');
      expect(el.querySelector('span')).toBeNull();
    });

    it('shows nothing when marked day is for a different date', () => {
      store.setState({ markedDays: [{ date: '2026-06-24', dayType: 'Holiday', description: 'Midsummer' }] });
      ui.updateTodayStatus(store.getState());
      const el = document.getElementById('today-status');
      expect(el.querySelector('span')).toBeNull();
    });

    it('shows holiday with description', () => {
      store.setState({ markedDays: [{ date: '2026-06-25', dayType: 'Holiday', description: 'Midsummer' }] });
      ui.updateTodayStatus(store.getState());
      const el = document.getElementById('today-status');
      expect(el.textContent).toBe('🌿 Midsummer');
      expect(el.querySelector('span').title).toBe('Holiday');
    });

    it('shows holiday without description', () => {
      store.setState({ markedDays: [{ date: '2026-06-25', dayType: 'Holiday', description: '' }] });
      ui.updateTodayStatus(store.getState());
      const el = document.getElementById('today-status');
      expect(el.textContent).toBe('🌿');
      expect(el.querySelector('span').title).toBe('Holiday');
    });

    it('shows vacation with description', () => {
      store.setState({ markedDays: [{ date: '2026-06-25', dayType: 'Vacation', description: 'Summer break' }] });
      ui.updateTodayStatus(store.getState());
      const el = document.getElementById('today-status');
      expect(el.textContent).toBe('🌿 Summer break');
      expect(el.querySelector('span').title).toBe('Vacation');
    });

    it('shows vacation without description', () => {
      store.setState({ markedDays: [{ date: '2026-06-25', dayType: 'Vacation', description: '' }] });
      ui.updateTodayStatus(store.getState());
      const el = document.getElementById('today-status');
      expect(el.textContent).toBe('🌿');
      expect(el.querySelector('span').title).toBe('Vacation');
    });

    it('shows holiday from calendarService', () => {
      const cal = createCalendarService({
        '2026-06-25': { type: 'holiday', name: 'Jāņi' },
      });
      store.setState({ markedDays: [] });
      ui.updateTodayStatus(store.getState(), cal);
      const el = document.getElementById('today-status');
      expect(el.textContent).toBe('🌿 Jāņi');
      expect(el.querySelector('span').title).toBe('Holiday');
    });

    it('shows holiday+memoriam from calendarService', () => {
      const cal = createCalendarService({
        '2026-06-25': { type: 'holiday', name: 'Darba svētki', is_memoriam: true },
      });
      store.setState({ markedDays: [] });
      ui.updateTodayStatus(store.getState(), cal);
      const el = document.getElementById('today-status');
      expect(el.textContent).toBe('🌿 Darba svētki');
      expect(el.querySelector('span').title).toBe('Holiday / Memorial');
    });

    it('shows memoriam-only workday from calendarService', () => {
      const cal = createCalendarService({
        '2026-06-25': { type: 'workday', name: 'Komunistiskā genocīda upuru piemiņas diena', is_memoriam: true },
      });
      store.setState({ markedDays: [] });
      ui.updateTodayStatus(store.getState(), cal);
      const el = document.getElementById('today-status');
      expect(el.textContent).toBe('🕯️ Komunistiskā genocīda upuru piemiņas diena');
      expect(el.querySelector('span').title).toBe('Memorial Day');
    });

    it('shows swapped workday from calendarService without text', () => {
      const cal = createCalendarService({
        '2026-06-25': { type: 'swapped_workday', swap_source: 'Saturday' },
      });
      store.setState({ markedDays: [] });
      ui.updateTodayStatus(store.getState(), cal);
      const el = document.getElementById('today-status');
      expect(el.textContent).toBe('🔁 🔧');
      expect(el.querySelector('span').title).toBe('Shifted workday (originally Saturday)');
    });

    it('shows short day from calendarService with text', () => {
      const cal = createCalendarService({
        '2026-06-25': { type: 'workday', is_short_day: true, note: 'Pirmssvētku diena' },
      });
      store.setState({ markedDays: [] });
      ui.updateTodayStatus(store.getState(), cal);
      const el = document.getElementById('today-status');
      expect(el.textContent).toBe('⚠️ Pirmssvētku diena');
      expect(el.querySelector('span').title).toBe('Short day — pre-holiday');
    });

    it('calendarService takes priority over markedDays', () => {
      const cal = createCalendarService({
        '2026-06-25': { type: 'holiday', name: 'Jāņi' },
      });
      store.setState({ markedDays: [{ date: '2026-06-25', dayType: 'Vacation', description: 'User vacation' }] });
      ui.updateTodayStatus(store.getState(), cal);
      const el = document.getElementById('today-status');
      expect(el.textContent).toBe('🌿 Jāņi');
      expect(el.querySelector('span').title).toBe('Holiday');
    });

    it('includes note in tooltip from calendarService', () => {
      const cal = createCalendarService({
        '2026-06-25': { type: 'holiday', name: 'Jāņi', note: 'Public holiday' },
      });
      store.setState({ markedDays: [] });
      ui.updateTodayStatus(store.getState(), cal);
      expect(document.getElementById('today-status').querySelector('span').title).toBe('Holiday — Public holiday');
    });

    it('shows swapped holiday with memoriam and swap icon', () => {
      const cal = createCalendarService({
        '2026-06-25': {
          type: 'swapped_day_off', swap_source: '2026-06-27',
          is_memoriam: true, name: 'Varoņu piemiņas diena',
          note: 'Darba diena pārcelta',
        },
      });
      store.setState({ markedDays: [] });
      ui.updateTodayStatus(store.getState(), cal);
      const el = document.getElementById('today-status');
      expect(el.textContent).toBe('🔁 🌿 Varoņu piemiņas diena');
      expect(el.querySelector('span').title).toBe('Holiday / Memorial (swapped from 2026-06-27) — Darba diena pārcelta');
    });

    it('shows swapped day-off without name as just icon', () => {
      const cal = createCalendarService({
        '2026-01-02': { type: 'swapped_day_off', swap_source: '2026-01-17', note: 'Pārcelts' },
      });
      vi.setSystemTime(new Date('2026-01-02T12:00:00Z'));
      store.setState({ markedDays: [] });
      ui.updateTodayStatus(store.getState(), cal);
      const el = document.getElementById('today-status');
      expect(el.textContent).toBe('🔁 🌿');
      expect(el.querySelector('span').title).toBe('Holiday (swapped from 2026-01-17) — Pārcelts');
    });
  });

  describe('updateButtonStates', () => {
    it('disables start and enables stop/pause when running', () => {
      ui.updateButtonStates(true);
      expect(document.getElementById('start-btn').disabled).toBe(true);
      expect(document.getElementById('stop-btn').disabled).toBe(false);
      expect(document.getElementById('pause-btn').disabled).toBe(false);
    });

    it('enables start and disables stop/pause when not running', () => {
      ui.updateButtonStates(false);
      expect(document.getElementById('start-btn').disabled).toBe(false);
      expect(document.getElementById('stop-btn').disabled).toBe(true);
      expect(document.getElementById('pause-btn').disabled).toBe(true);
    });
  });

  describe('renderRecentSessions', () => {
    it('shows empty state when no sessions', () => {
      ui.renderRecentSessions();
      const html = document.getElementById('recent-sessions').innerHTML;
      expect(html).toContain('No recent sessions found');
    });

    it('renders up to 5 recent sessions', () => {
      store.setState({ sessions: mockSessions });
      ui.renderRecentSessions();
      const cards = document.querySelectorAll('.session-card');
      expect(cards.length).toBe(3);
    });

    it('renders grid-mode cards when _isGridMode is true', () => {
      store.setState({ sessions: mockSessions });
      ui.toggleRecentSessionsGrid();
      ui.renderRecentSessions();
      const cards = document.querySelectorAll('.session-card-grid');
      expect(cards.length).toBe(3);
      const container = document.getElementById('recent-sessions');
      expect(container.className).toContain('gap-3');
    });

    it('toggleRecentSessionsGrid flips _isGridMode', () => {
      expect(ui.toggleRecentSessionsGrid()).toBe(true);
      expect(ui.toggleRecentSessionsGrid()).toBe(false);
      expect(ui.toggleRecentSessionsGrid()).toBe(true);
    });

    it('returns to list mode after toggle back', () => {
      store.setState({ sessions: mockSessions });
      ui.toggleRecentSessionsGrid();
      ui.toggleRecentSessionsGrid();
      ui.renderRecentSessions();
      const cards = document.querySelectorAll('.session-card');
      expect(cards.length).toBeGreaterThan(0);
      const gridCards = document.querySelectorAll('.session-card-grid');
      expect(gridCards.length).toBe(0);
    });

    it('hides notes in grid mode', () => {
      store.setState({ sessions: mockSessions });
      ui.toggleRecentSessionsGrid();
      ui.renderRecentSessions();
      const container = document.getElementById('recent-sessions');
      expect(container.innerHTML).not.toContain('Weekend work');
    });
  });

  describe('renderAllSessions', () => {
    it('shows empty state when no sessions', () => {
      ui.renderAllSessions();
      const html = document.getElementById('all-sessions-list').innerHTML;
      expect(html).toContain('No sessions found');
    });

    it('renders sessions grouped by date', () => {
      store.setState({ sessions: mockSessions, markedDays: [] });
      ui.renderAllSessions();
      expect(document.querySelectorAll('.day-header').length).toBe(2);
    });
  });

  describe('populateYearSelector', () => {
    it('adds current year when no sessions', () => {
      ui.populateYearSelector();
      const sel = document.getElementById('year-selector');
      expect(sel.options.length).toBe(1);
      expect(sel.options[0].value).toBe(String(new Date().getFullYear()));
    });

    it('adds years from sessions', () => {
      store.setState({ sessions: mockSessions });
      ui.populateYearSelector();
      const sel = document.getElementById('year-selector');
      expect(sel.options.length).toBe(1);
      expect(sel.options[0].value).toBe('2026');
    });
  });

  describe('modals', () => {
    it('showAddSessionModal opens modal and initializes fields', () => {
      store.setState({ tags: mockTags });
      ui.showAddSessionModal();
      expect(document.getElementById('session-modal').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('modal-title').textContent).toBe('Add New Session');
    });

    it('hideSessionModal closes modal', () => {
      document.getElementById('session-modal').classList.remove('hidden');
      ui.hideSessionModal();
      expect(document.getElementById('session-modal').classList.contains('hidden')).toBe(true);
    });

    it('showMarkDayModal opens and sets fields', () => {
      ui.showMarkDayModal('Holiday');
      expect(document.getElementById('mark-day-modal').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('mark-day-type').value).toBe('Holiday');
    });

    it('hideMarkDayModal closes modal', () => {
      document.getElementById('mark-day-modal').classList.remove('hidden');
      ui.hideMarkDayModal();
      expect(document.getElementById('mark-day-modal').classList.contains('hidden')).toBe(true);
    });

    it('showDeleteModal sets session id and opens', () => {
      ui.showDeleteModal(42);
      const modal = document.getElementById('delete-modal');
      expect(modal.classList.contains('hidden')).toBe(false);
      expect(modal.dataset.sessionId).toBe('42');
    });

    it('hideDeleteModal clears session id and closes', () => {
      document.getElementById('delete-modal').classList.remove('hidden');
      document.getElementById('delete-modal').dataset.sessionId = '42';
      ui.hideDeleteModal();
      const modal = document.getElementById('delete-modal');
      expect(modal.classList.contains('hidden')).toBe(true);
      expect(modal.dataset.sessionId).toBeUndefined();
    });
  });

  describe('dark mode', () => {
    it('enableDarkMode adds class and updates toggle', () => {
      ui.enableDarkMode();
      expect(document.body.classList.contains('dark-mode')).toBe(true);
      expect(document.getElementById('dark-mode-toggle').innerHTML).toContain('fa-sun');
    });

    it('disableDarkMode removes class and updates toggle', () => {
      ui.disableDarkMode();
      expect(document.body.classList.contains('dark-mode')).toBe(false);
      expect(document.getElementById('dark-mode-toggle').innerHTML).toContain('fa-moon');
    });
  });

  describe('applyLatestConfig', () => {
    it('populates form fields from latest config', () => {
      store.setState({ configs: mockConfigs });
      ui.applyLatestConfig();
      expect(document.getElementById('working-hours').value).toBe('8');
      expect(document.getElementById('break-duration-setting').value).toBe('60');
      expect(document.getElementById('week-start').value).toBe('1');
    });

    it('does nothing with empty configs', () => {
      ui.applyLatestConfig();
      expect(document.getElementById('working-hours').value).toBe('');
    });
  });

  describe('getTagBadgeClass', () => {
    it('returns correct class for work tag when selected', () => {
      const cls = ui.getTagBadgeClass('work', true);
      expect(cls).toContain('bg-blue-100');
    });

    it('returns unselected class when not selected', () => {
      const cls = ui.getTagBadgeClass('work', false);
      expect(cls).toContain('text-gray-800');
    });
  });

  describe('initializeCurrentSessionTags', () => {
    it('renders tags with visible styling for unselected state', () => {
      store.setState({ tags: mockTags });
      ui.initializeCurrentSessionTags();
      const container = document.getElementById('current-session-tags');
      const tagEls = container.querySelectorAll('.tag');
      expect(tagEls.length).toBe(mockTags.filter(t => t.isEnabled).length);
      const unselected = container.querySelectorAll('.tag:not(.selected)');
      expect(unselected.length).toBeGreaterThan(0);
      const selected = container.querySelectorAll('.tag.selected');
      expect(selected.length).toBe(1);
      expect(selected[0].dataset.tag).toBe('work');
      for (const el of unselected) {
        expect(el.classList.contains('selected')).toBe(false);
        expect(el.textContent).toBeTruthy();
      }
    });
  });

  describe('initializeSessionModalTags', () => {
    it('renders tags with visible styling for unselected state', () => {
      store.setState({ tags: mockTags });
      ui.initializeSessionModalTags();
      const container = document.getElementById('tags-container');
      const tagEls = container.querySelectorAll('.tag');
      expect(tagEls.length).toBe(mockTags.filter(t => t.isEnabled).length);
      const unselected = container.querySelectorAll('.tag:not(.selected)');
      expect(unselected.length).toBeGreaterThan(0);
      for (const el of unselected) {
        expect(el.classList.contains('selected')).toBe(false);
        expect(el.textContent).toBeTruthy();
      }
    });
  });

  describe('getWorkDaysInMonth', () => {
    it('returns correct work days for June 2026', () => {
      const days = ui.getWorkDaysInMonth(2026, 5);
      expect(days).toBe(22);
    });
  });

  describe('timer display', () => {
    it('updateTimerDisplayEl shows correct duration and label', () => {
      ui.updateTimerDisplayEl(3661, false);
      expect(document.getElementById('active-duration').textContent).toBe('01:01:01');
      expect(document.getElementById('duration-label').textContent).toBe('Session Duration');
    });

    it('updateTimerDisplayEl switches label for break', () => {
      ui.updateTimerDisplayEl(600, true);
      expect(document.getElementById('duration-label').textContent).toBe('Break Duration');
      expect(document.querySelector('.duration-display').classList.contains('break-mode')).toBe(true);
    });
  });

  describe('switchTab', () => {
    it('switches visible tab and updates store', () => {
      document.getElementById('tracker-content').classList.remove('hidden');
      ui.switchTab('sessions');
      expect(store.getState().currentTab).toBe('sessions');
      expect(document.getElementById('tracker-content').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('sessions-content').classList.contains('hidden')).toBe(false);
    });
  });

  describe('switchSettingsTab', () => {
    it('shows selected settings tab', () => {
      const gen = document.getElementById('general-settings');
      const salary = document.getElementById('salary-settings');
      if (gen) gen.classList.remove('hidden');
      ui.switchSettingsTab('salary');
      expect(document.getElementById('general-settings').classList.contains('hidden')).toBe(true);
    });
  });

  describe('config history modal', () => {
    it('shows empty message when no configs', () => {
      ui.showConfigHistoryModal();
      expect(document.getElementById('config-history-modal').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('config-history-list').innerHTML).toContain('No configuration history');
    });

    it('renders config items when configs exist', () => {
      store.setState({ configs: mockConfigs });
      ui.showConfigHistoryModal();
      const items = document.getElementById('config-history-list').querySelectorAll('.config-version');
      expect(items.length).toBe(1);
    });
  });

  describe('renderTagSettings', () => {
    function setupTagsState(store) {
      store.setState({
        tags: [
          { name: 'work', isDefault: true, isEnabled: true, isCustom: false },
          { name: 'rest', isDefault: true, isEnabled: true, isCustom: false },
          { name: 'study', isDefault: false, isEnabled: true, isCustom: false },
          { name: 'music', isDefault: false, isEnabled: false, isCustom: false },
          { name: 'customTag', isDefault: false, isEnabled: true, isCustom: true },
          { name: 'read', isDefault: false, isEnabled: true, isCustom: false },
          { name: 'sleep', isDefault: false, isEnabled: true, isCustom: false },
        ],
        tagBuckets: {
          work: [],
          rest: ['read', 'sleep', 'music'],
          study: ['read'],
          sport: [],
          other: ['customTag'],
        },
      });
    }

    it('renders a collapsible bucket header for each bucket', () => {
      setupTagsState(store);
      ui.renderTagSettings();
      const headers = document.querySelectorAll('.tag-bucket-header');
      expect(headers.length).toBe(5);
      const hasBucketName = (name) => Array.from(headers).some(h => h.textContent.includes(name));
      expect(hasBucketName('work')).toBe(true);
      expect(hasBucketName('rest')).toBe(true);
      expect(hasBucketName('study')).toBe(true);
      expect(hasBucketName('sport')).toBe(true);
      expect(hasBucketName('other')).toBe(true);
    });

    it('renders subtag chips inside each bucket', () => {
      setupTagsState(store);
      ui.renderTagSettings();
      const restGroup = document.querySelector('[data-bucket="rest"]');
      expect(restGroup).toBeTruthy();
      const subtags = restGroup.querySelectorAll('.tag-item:not([data-default="true"])');
      expect(subtags.length).toBe(3);
    });

    it('renders collapse arrow on each header', () => {
      setupTagsState(store);
      ui.renderTagSettings();
      const arrows = document.querySelectorAll('.tag-bucket-header .collapse-arrow');
      expect(arrows.length).toBe(5);
      expect(arrows[0].textContent).toContain('▼');
    });

    it('toggles subtag visibility when header is clicked', () => {
      setupTagsState(store);
      ui.renderTagSettings();
      const header = document.querySelector('[data-bucket="rest"] .tag-bucket-header');
      const subtagsContainer = document.querySelector('[data-bucket="rest"] .tag-bucket-subtags');
      expect(subtagsContainer.classList.contains('collapsed')).toBe(false);
      header.click();
      expect(subtagsContainer.classList.contains('collapsed')).toBe(true);
      header.click();
      expect(subtagsContainer.classList.contains('collapsed')).toBe(false);
    });

    it('renders unassigned section with custom tags not in any bucket', () => {
      store.setState({
        tags: [
          { name: 'custom1', isDefault: false, isEnabled: true, isCustom: true },
          { name: 'custom2', isDefault: false, isEnabled: true, isCustom: true },
          { name: 'work', isDefault: true, isEnabled: true, isCustom: false },
        ],
        tagBuckets: { work: [], rest: [], study: [], sport: [], other: ['custom1'] },
      });
      ui.renderTagSettings();
      const unassignedGroup = document.querySelector('[data-bucket="unassigned"]');
      expect(unassignedGroup).toBeTruthy();
      const unassignedTags = unassignedGroup.querySelectorAll('.tag-item');
      expect(unassignedTags.length).toBe(1);
      expect(unassignedTags[0].textContent).toContain('custom2');
    });

    it('sets draggable on subtag chips but not default tags', () => {
      setupTagsState(store);
      ui.renderTagSettings();
      const defaultChips = document.querySelectorAll('.tag-item[data-default="true"]');
      defaultChips.forEach(chip => expect(chip.draggable).toBe(false));
      const subtagChips = document.querySelectorAll('.tag-item:not([data-default="true"])');
      subtagChips.forEach(chip => expect(chip.draggable).toBe(true));
    });

    it('dragstart sets tag name and source bucket in drag data', () => {
      setupTagsState(store);
      ui.renderTagSettings();
      const readChip = Array.from(document.querySelectorAll('.tag-item:not([data-default="true"])'))
        .find(c => c.textContent.includes('read'));
      expect(readChip).toBeTruthy();
      const dt = new MockDataTransfer();
      readChip.dispatchEvent(createDragEvent('dragstart', dt));
      expect(dt.getData('text/plain')).toBe('read');
      expect(dt.getData('application/x-source-bucket')).toBe('rest');
    });

    it('dragover adds drag-over class to subtags container', () => {
      setupTagsState(store);
      ui.renderTagSettings();
      const studySubtags = document.querySelector('[data-bucket="study"] .tag-bucket-subtags');
      expect(studySubtags.classList.contains('drag-over')).toBe(false);
      studySubtags.dispatchEvent(createDragEvent('dragover'));
      expect(studySubtags.classList.contains('drag-over')).toBe(true);
    });

    it('dragleave removes drag-over class', () => {
      setupTagsState(store);
      ui.renderTagSettings();
      const studySubtags = document.querySelector('[data-bucket="study"] .tag-bucket-subtags');
      studySubtags.dispatchEvent(createDragEvent('dragover'));
      expect(studySubtags.classList.contains('drag-over')).toBe(true);
      studySubtags.dispatchEvent(createDragEvent('dragleave'));
      expect(studySubtags.classList.contains('drag-over')).toBe(false);
    });

    it('drop moves subtag between buckets', () => {
      setupTagsState(store);
      ui.setOnTagBucketsChange(() => {});
      ui.renderTagSettings();
      const s = store.getState();
      expect(s.tagBuckets.rest).toContain('read');
      expect(s.tagBuckets.study).toContain('read');
      const readChip = Array.from(document.querySelectorAll('.tag-item:not([data-default="true"])'))
        .find(c => c.textContent.includes('read') && c.closest('[data-bucket="rest"]'));
      const dt = new MockDataTransfer();
      dt.setData('text/plain', 'read');
      dt.setData('application/x-source-bucket', 'rest');
      readChip.dispatchEvent(createDragEvent('dragstart', dt));
      const studySubtags = document.querySelector('[data-bucket="study"] .tag-bucket-subtags');
      studySubtags.dispatchEvent(createDragEvent('drop', dt));
      const stateAfter = store.getState();
      expect(stateAfter.tagBuckets.rest).not.toContain('read');
      expect(stateAfter.tagBuckets.study).toContain('read');
    });

    it('drop to same bucket is a no-op', () => {
      setupTagsState(store);
      ui.setOnTagBucketsChange(() => {});
      ui.renderTagSettings();
      const dt = new MockDataTransfer();
      dt.setData('text/plain', 'read');
      dt.setData('application/x-source-bucket', 'rest');
      const restSubtags = document.querySelector('[data-bucket="rest"] .tag-bucket-subtags');
      const originalState = store.getState();
      restSubtags.dispatchEvent(createDragEvent('drop', dt));
      const stateAfter = store.getState();
      expect(stateAfter.tagBuckets.rest).toEqual(originalState.tagBuckets.rest);
    });

    it('drop removes drag-over class', () => {
      setupTagsState(store);
      ui.setOnTagBucketsChange(() => {});
      ui.renderTagSettings();
      const studySubtags = document.querySelector('[data-bucket="study"] .tag-bucket-subtags');
      const dt = new MockDataTransfer();
      dt.setData('text/plain', 'read');
      dt.setData('application/x-source-bucket', 'rest');
      studySubtags.dispatchEvent(createDragEvent('dragover'));
      studySubtags.dispatchEvent(createDragEvent('drop', dt));
      expect(studySubtags.classList.contains('drag-over')).toBe(false);
    });

    it('ctrl+drag duplicates subtag into target bucket without removing from source', () => {
      setupTagsState(store);
      ui.setOnTagBucketsChange(() => {});
      ui.renderTagSettings();
      const dt = new MockDataTransfer();
      dt.setData('text/plain', 'read');
      dt.setData('application/x-source-bucket', 'rest');
      const workSubtags = document.querySelector('[data-bucket="work"] .tag-bucket-subtags');
      const stateBefore = store.getState();
      expect(stateBefore.tagBuckets.rest).toContain('read');
      expect(stateBefore.tagBuckets.work).not.toContain('read');
      workSubtags.dispatchEvent(createDragEvent('drop', dt, { ctrlKey: true }));
      const stateAfter = store.getState();
      expect(stateAfter.tagBuckets.rest).toContain('read');
      expect(stateAfter.tagBuckets.work).toContain('read');
    });

    it('ctrl+drag to bucket that already contains tag is a no-op', () => {
      setupTagsState(store);
      ui.setOnTagBucketsChange(() => {});
      ui.renderTagSettings();
      const dt = new MockDataTransfer();
      dt.setData('text/plain', 'read');
      dt.setData('application/x-source-bucket', 'rest');
      const studySubtags = document.querySelector('[data-bucket="study"] .tag-bucket-subtags');
      const stateBefore = store.getState();
      expect(stateBefore.tagBuckets.study).toContain('read');
      const countBefore = stateBefore.tagBuckets.study.length;
      studySubtags.dispatchEvent(createDragEvent('drop', dt, { ctrlKey: true }));
      const stateAfter = store.getState();
      expect(stateAfter.tagBuckets.study).toContain('read');
      expect(stateAfter.tagBuckets.study.length).toBe(countBefore);
    });
  });
});
