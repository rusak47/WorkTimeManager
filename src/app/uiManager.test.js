// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

function containerQSA(sel) {
  return document.getElementById('current-session-tags').querySelectorAll(sel);
}

function setupDOM() {
  document.body.innerHTML = `
    <div id="current-time"></div>
    <div id="current-session-tags"></div>
    <div id="tags-container"></div>
    <div id="current-session-mood"></div>
    <div id="recent-sessions"></div>
    <div id="all-sessions-list"></div>
    <div id="all-sessions-controls">
      <button id="view-year" class="view-toggle">Year</button>
      <button id="view-month" class="view-toggle">Month</button>
      <button id="view-week" class="view-toggle">Week</button>
    </div>
    <select id="date-filter"><option value="">All Dates</option></select>
    <select id="month-filter"><option value="">All Months</option></select>
    <select id="year-filter"><option value="">All Years</option></select>
    <select id="day-type-filter"><option value="">All Types</option></select>
    <div id="session-tag-filter-wrap" class="relative">
      <button id="session-tag-filter-btn" class="border border-gray-300 rounded-md px-3 py-2">Tags</button>
      <div id="session-tag-dropdown" class="hidden absolute z-10 bg-white border rounded-md shadow-lg"></div>
    </div>
    <div class="duration-display">
      <span id="duration-label">Current Duration</span>
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
    <div id="break-session-notes" class="hidden">
      <div id="break-session-tags"></div>
      <div id="break-session-mood" data-rating="5"></div>
      <input type="hidden" id="break-session-mood-input" value="5">
      <div id="break-mood-value">5.0</div>
    </div>
    <textarea id="break-notes"></textarea>
    <div id="delete-modal" class="hidden"></div>
    <div id="session-modal" class="hidden"></div>
    <div id="modal-title"></div>
    <div id="session-id"></div>
    <input id="start-time" />
    <input id="end-time" />
    <input id="day-type" />
    <textarea id="modal-notes"></textarea>
    <textarea id="notes"></textarea>
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
    <select id="subtag-filter"><option value="all" selected>All Subtags</option></select>
    <select id="mood-threshold"><option value="1">1</option></select>
    <div id="tag-bucket-settings"></div>
    <div id="current-session-start-time-input"></div>
    <div id="current-session-end-time-input"></div>
    <div id="current-session-accumulated-rest-duration-input"></div>
    <button id="recent-sessions-grid-toggle"></button>
    <div id="bucket-stats"></div>
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
      allSessionsView: 'month',
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
      expect(container.className).toContain('grid');
      expect(container.style.gridTemplateColumns).toContain('repeat(auto-fit');
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

    it('shows notes in title tooltip on grid cards', () => {
      store.setState({ sessions: mockSessions });
      ui.toggleRecentSessionsGrid();
      ui.renderRecentSessions();
      const cards = document.querySelectorAll('.session-card-grid');
      const cardWithNotes = cards[2]; // session id=3 has notes: 'Weekend work'
      expect(cardWithNotes.title).toBe('Weekend work');
    });

    it('omits title attribute when session has no notes', () => {
      store.setState({ sessions: mockSessions });
      ui.toggleRecentSessionsGrid();
      ui.renderRecentSessions();
      const cards = document.querySelectorAll('.session-card-grid');
      const cardWithoutNotes = cards[1]; // session id=2 has notes: ''
      expect(cardWithoutNotes.hasAttribute('title')).toBe(false);
    });

    it('renders action icons in hover overlay for grid cards', () => {
      store.setState({ sessions: mockSessions });
      ui.toggleRecentSessionsGrid();
      ui.renderRecentSessions();
      const card = document.querySelector('.session-card-grid');
      expect(card.className).toContain('group');
      const overlay = card.querySelector('.grid-actions');
      expect(overlay).toBeTruthy();
      expect(overlay.querySelector('.edit-session')).toBeTruthy();
      expect(overlay.querySelector('.delete-session')).toBeTruthy();
    });

    it('renders date in grid cards', () => {
      store.setState({ sessions: mockSessions });
      ui.toggleRecentSessionsGrid();
      ui.renderRecentSessions();
      const card = document.querySelector('.session-card-grid');
      const dateEl = card.querySelector('.day-type-pill');
      expect(dateEl).toBeTruthy();
      expect(dateEl.textContent).toContain('2026');
    });

    it('renders duration with clock icon in grid cards', () => {
      store.setState({ sessions: mockSessions });
      ui.toggleRecentSessionsGrid();
      ui.renderRecentSessions();
      const card = document.querySelector('.session-card-grid');
      const durationEl = card.querySelector('.grid-dur');
      expect(durationEl).toBeTruthy();
      expect(durationEl.querySelector('.fa-clock')).toBeTruthy();
    });

    it('renders stars in grid cards', () => {
      store.setState({ sessions: mockSessions });
      ui.toggleRecentSessionsGrid();
      ui.renderRecentSessions();
      const card = document.querySelector('.session-card-grid');
      const stars = card.querySelector('.grid-stars');
      expect(stars).toBeTruthy();
    });

    it('renders tags in grid cards', () => {
      store.setState({ sessions: mockSessions });
      ui.toggleRecentSessionsGrid();
      ui.renderRecentSessions();
      const card = document.querySelector('.session-card-grid');
      const tagsSection = card.querySelector('.grid-tags');
      expect(tagsSection).toBeTruthy();
      expect(tagsSection.querySelectorAll('.text-xs').length).toBeGreaterThan(0);
    });
  });

  describe('renderAllSessions', () => {
    it('shows empty state when no sessions', () => {
      ui.renderAllSessions();
      const html = document.getElementById('all-sessions-list').innerHTML;
      expect(html).toContain('No sessions found');
    });

    it('renders sessions grouped by date in week view', () => {
      document.getElementById('year-filter').value = '2026';
      document.getElementById('month-filter').value = '6';
      store.setState({
        sessions: mockSessions,
        markedDays: [],
        allSessionsView: 'week',
      });
      ui.renderAllSessions();
      expect(document.querySelectorAll('.group-header').length).toBe(2);
    });

    it('renders collapsible groups in month view', () => {
      document.getElementById('year-filter').value = '2026';
      document.getElementById('month-filter').value = '6';
      store.setState({
        sessions: mockSessions,
        markedDays: [],
        allSessionsView: 'month',
      });
      ui.renderAllSessions();
      const groups = document.querySelectorAll('.collapsible-group');
      expect(groups.length).toBeGreaterThan(0);
      groups.forEach(g => {
        expect(g.querySelector('.group-header')).toBeTruthy();
        expect(g.querySelector('.fa-chevron-right, .fa-chevron-down')).toBeTruthy();
      });
    });

    it('renders collapsible groups in year view', () => {
      document.getElementById('year-filter').value = '2026';
      store.setState({
        sessions: mockSessions,
        markedDays: [],
        allSessionsView: 'year',
      });
      ui.renderAllSessions();
      const groups = document.querySelectorAll('.collapsible-group');
      expect(groups.length).toBeGreaterThan(0);
    });

    it('renders flat groups in week view', () => {
      document.getElementById('year-filter').value = '2026';
      document.getElementById('month-filter').value = '6';
      store.setState({
        sessions: mockSessions,
        markedDays: [],
        allSessionsView: 'week',
      });
      ui.renderAllSessions();
      const groups = document.querySelectorAll('.collapsible-group');
      expect(groups.length).toBeGreaterThan(0);
    });

    it('session count badge shows correct count', () => {
      document.getElementById('year-filter').value = '2026';
      document.getElementById('month-filter').value = '6';
      store.setState({
        sessions: mockSessions,
        markedDays: [],
        allSessionsView: 'week',
      });
      ui.renderAllSessions();
      const badges = document.querySelectorAll('.group-session-count');
      const counts = Array.from(badges).map(b => parseInt(b.textContent));
      expect(counts).toContain(2);
    });

    it('filters sessions by selected tags', () => {
      document.getElementById('year-filter').value = '2026';
      document.getElementById('month-filter').value = '6';
      store.setState({
        sessions: mockSessions,
        markedDays: [],
        allSessionsView: 'week',
        tagBuckets: { work: [], study: [] },
      });
      ui.populateSessionTagFilter();
      const cb = document.querySelector('#session-tag-dropdown input[value="study"]');
      if (cb) cb.checked = false;
      ui.renderAllSessions();
      const counts = Array.from(document.querySelectorAll('.group-session-count')).map(el => parseInt(el.textContent));
      const total = counts.reduce((a, b) => a + b, 0);
      expect(total).toBe(3);
    });

    it('shows all sessions when all tags selected', () => {
      document.getElementById('year-filter').value = '2026';
      document.getElementById('month-filter').value = '6';
      store.setState({
        sessions: mockSessions,
        markedDays: [],
        allSessionsView: 'week',
        tagBuckets: { work: [], study: [] },
      });
      ui.populateSessionTagFilter();
      ui.renderAllSessions();
      const counts = Array.from(document.querySelectorAll('.group-session-count')).map(el => parseInt(el.textContent));
      const total = counts.reduce((a, b) => a + b, 0);
      expect(total).toBe(3);
    });
  });

  describe('populateSessionTagFilter', () => {
    it('renders checkboxes for each tag bucket', () => {
      store.setState({ tagBuckets: { work: [], rest: [], study: [] } });
      ui.populateSessionTagFilter();
      const dropdown = document.getElementById('session-tag-dropdown');
      const cbs = dropdown.querySelectorAll('input[type="checkbox"]');
      expect(cbs.length).toBe(3);
      expect(cbs[0].value).toBe('work');
      expect(cbs[1].value).toBe('rest');
      expect(cbs[2].value).toBe('study');
    });

    it('all checkboxes checked by default', () => {
      store.setState({ tagBuckets: { work: [], study: [] } });
      ui.populateSessionTagFilter();
      const cbs = document.querySelectorAll('#session-tag-dropdown input[type="checkbox"]');
      expect(Array.from(cbs).every(cb => cb.checked)).toBe(true);
    });

    it('preserves previous selection on re-populate', () => {
      store.setState({ tagBuckets: { work: [], rest: [], study: [] } });
      ui.populateSessionTagFilter();
      const cb = document.querySelector('#session-tag-dropdown input[value="rest"]');
      cb.checked = false;
      ui.populateSessionTagFilter();
      const restCb = document.querySelector('#session-tag-dropdown input[value="rest"]');
      expect(restCb.checked).toBe(false);
      const workCb = document.querySelector('#session-tag-dropdown input[value="work"]');
      expect(workCb.checked).toBe(true);
    });
  });

  describe('updateSessionTagBtnLabel', () => {
    it('shows "Tags" when all selected', () => {
      store.setState({ tagBuckets: { work: [], study: [] } });
      ui.populateSessionTagFilter();
      ui.updateSessionTagBtnLabel();
      expect(document.getElementById('session-tag-filter-btn').textContent).toBe('Tags');
    });

    it('shows count when some deselected', () => {
      store.setState({ tagBuckets: { work: [], rest: [], study: [] } });
      ui.populateSessionTagFilter();
      const cb = document.querySelector('#session-tag-dropdown input[value="rest"]');
      cb.checked = false;
      ui.updateSessionTagBtnLabel();
      expect(document.getElementById('session-tag-filter-btn').textContent).toBe('Tags (2)');
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

    it('returns correct class for rest tag when selected', () => {
      const cls = ui.getTagBadgeClass('rest', true);
      expect(cls).toContain('bg-purple-100');
    });

    it('returns correct class for study tag when selected', () => {
      const cls = ui.getTagBadgeClass('study', true);
      expect(cls).toContain('bg-orange-100');
    });

    it('returns correct class for sport tag when selected', () => {
      const cls = ui.getTagBadgeClass('sport', true);
      expect(cls).toContain('bg-green-100');
    });

    it('returns correct class for other tag when selected', () => {
      const cls = ui.getTagBadgeClass('other', true);
      expect(cls).toContain('bg-gray-100');
    });

    it('returns unselected class when not selected', () => {
      const cls = ui.getTagBadgeClass('work', false);
      expect(cls).toContain('text-gray-800');
    });

    it('returns gray for unknown tag when selected', () => {
      const cls = ui.getTagBadgeClass('unknown', true);
      expect(cls).toContain('bg-gray-100');
    });
  });

  describe('createPickerTagChip', () => {
    it('creates a chip element with tag name', () => {
      const chip = ui.createPickerTagChip('study');
      expect(chip.tagName).toBe('DIV');
      expect(chip.textContent).toBe('study');
      expect(chip.classList.contains('tag-chip')).toBe(true);
    });

    it('applies bucket color and selected class when selected', () => {
      const chip = ui.createPickerTagChip('study', true);
      expect(chip.classList.contains('selected')).toBe(true);
      expect(chip.className).toContain('bg-orange-100');
    });

    it('applies gray when not selected', () => {
      const chip = ui.createPickerTagChip('study', false);
      expect(chip.classList.contains('selected')).toBe(false);
      expect(chip.className).toContain('text-gray-800');
    });

    it('sets dataset.tag to tag name', () => {
      const chip = ui.createPickerTagChip('rest');
      expect(chip.dataset.tag).toBe('rest');
    });
  });

  describe('showStartPicker / hideStartPicker', () => {
    it('creates a floating picker with 5 bucket chips', () => {
      ui.showStartPicker(() => {});
      const picker = document.getElementById('start-picker');
      expect(picker).not.toBeNull();
      expect(picker.classList.contains('start-picker')).toBe(true);
      const chips = picker.querySelectorAll('.start-picker-chip');
      expect(chips.length).toBe(5);
      const names = Array.from(chips).map(c => c.dataset.tag);
      expect(names).toEqual(['rest', 'study', 'sport', 'other', 'work']);
    });

    it('calls onSelect with bucket name when chip clicked', () => {
      const onSelect = vi.fn();
      ui.showStartPicker(onSelect);
      const chips = document.querySelectorAll('.start-picker-chip');
      chips[2].click();
      expect(onSelect).toHaveBeenCalledWith('sport');
    });

    it('calls onSelect with bucket name for the last chip (work)', () => {
      const onSelect = vi.fn();
      ui.showStartPicker(onSelect);
      const chips = document.querySelectorAll('.start-picker-chip');
      chips[4].click();
      expect(onSelect).toHaveBeenCalledWith('work');
    });

    it('removes picker when hideStartPicker is called', () => {
      ui.showStartPicker(() => {});
      ui.hideStartPicker();
      expect(document.getElementById('start-picker')).toBeNull();
    });

    it('hides picker after chip click', () => {
      const onSelect = vi.fn();
      ui.showStartPicker(onSelect);
      const chips = document.querySelectorAll('.start-picker-chip');
      chips[0].click();
      expect(document.getElementById('start-picker')).toBeNull();
    });
  });

  describe('initHashtagAutocomplete', () => {
    const bucketData = {
      work: ['coding', 'meeting', 'email'],
      rest: ['sleep', 'read', 'music'],
      study: ['rtu', 'read'],
      sport: ['cycling'],
      other: [],
    };

    beforeEach(() => {
      store.setState({ tags: mockTags, tagBuckets: bucketData });
    });

    function typeText(id, text) {
      const ta = document.getElementById(id);
      ta.value = text;
      ta.selectionStart = ta.selectionEnd = text.length;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }

    it('shows dropdown when #prefix typed in modal-notes', () => {
      ui.initHashtagAutocomplete('modal-notes');
      typeText('modal-notes', 'Worked on #re');
      const dd = document.getElementById('hashtag-dropdown');
      expect(dd).not.toBeNull();
      expect(dd.querySelectorAll('.hashtag-item').length).toBeGreaterThanOrEqual(2);
    });

    it('shows dropdown when #prefix typed in notes', () => {
      ui.initHashtagAutocomplete('notes');
      typeText('notes', '#re');
      expect(document.getElementById('hashtag-dropdown')).not.toBeNull();
    });

    it('does not show dropdown when no hash', () => {
      ui.initHashtagAutocomplete('modal-notes');
      typeText('modal-notes', 'Worked on meeting');
      expect(document.getElementById('hashtag-dropdown')).toBeNull();
    });

    it('does not show dropdown for just #', () => {
      ui.initHashtagAutocomplete('modal-notes');
      typeText('modal-notes', '#');
      expect(document.getElementById('hashtag-dropdown')).toBeNull();
    });

    it('filters tags by prefix', () => {
      ui.initHashtagAutocomplete('modal-notes');
      typeText('modal-notes', '#si');
      const dd = document.getElementById('hashtag-dropdown');
      // 'si' matches nothing
      expect(dd).toBeNull();
    });

    it('clicking item inserts #tag text into textarea preserving hash', () => {
      ui.initHashtagAutocomplete('modal-notes');
      const textarea = document.getElementById('modal-notes');
      typeText('modal-notes', 'Worked on #re');
      const items = document.querySelectorAll('.hashtag-item');
      expect(items.length).toBeGreaterThan(0);
      items[0].click();
      expect(textarea.value).toMatch(/#(rest|read)\s/);
      expect(textarea.value.length).toBeGreaterThan('Worked on #re'.length);
      expect(textarea.value.startsWith('Worked on #')).toBe(true);
      expect(document.getElementById('hashtag-dropdown')).toBeNull();
    });

    it('escape key closes dropdown', () => {
      ui.initHashtagAutocomplete('modal-notes');
      typeText('modal-notes', '#re');
      expect(document.getElementById('hashtag-dropdown')).not.toBeNull();
      document.getElementById('modal-notes')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(document.getElementById('hashtag-dropdown')).toBeNull();
    });

    it('blur closes dropdown', () => new Promise(done => {
      ui.initHashtagAutocomplete('modal-notes');
      typeText('modal-notes', '#re');
      expect(document.getElementById('hashtag-dropdown')).not.toBeNull();
      document.getElementById('modal-notes').dispatchEvent(new Event('blur'));
      setTimeout(() => {
        expect(document.getElementById('hashtag-dropdown')).toBeNull();
        done();
      }, 200);
    }));

    it('includes default tags as suggestions', () => {
      ui.initHashtagAutocomplete('modal-notes');
      typeText('modal-notes', '#wo');
      const items = document.querySelectorAll('.hashtag-item');
      const names = Array.from(items).map(el => el.textContent.trim());
      expect(names).toContain('work');
    });
  });

  describe('initializeCurrentSessionTags', () => {
    const buckets = {
      work: ['coding', 'meeting', 'email', 'planning', 'review', 'deploy', 'docs'],
      rest: ['sleep', 'tv'],
      study: ['rtu'],
      sport: ['cycling'],
      other: [],
    };

    it('renders two rows: default tags and subtags', () => {
      store.setState({ tags: mockTags, tagBuckets: buckets });
      ui.initializeCurrentSessionTags();
      const container = document.getElementById('current-session-tags');
      expect(container.querySelector('.picker-row-1')).not.toBeNull();
      expect(container.querySelector('.picker-row-2')).not.toBeNull();
    });

    it('renders all 5 default tags in row 1', () => {
      store.setState({ tags: mockTags, tagBuckets: buckets });
      ui.initializeCurrentSessionTags();
      const chips = containerQSA('.picker-row-1 .tag-chip');
      expect(chips.length).toBe(5);
      const names = Array.from(chips).map(c => c.dataset.tag);
      expect(names).toEqual(['work', 'rest', 'study', 'sport', 'other']);
    });

    it('pre-selects work in row 1', () => {
      store.setState({ tags: mockTags, tagBuckets: buckets });
      ui.initializeCurrentSessionTags();
      const selected = containerQSA('.picker-row-1 .tag-chip.selected');
      expect(selected.length).toBe(1);
      expect(selected[0].dataset.tag).toBe('work');
    });

    it('pre-selects bucket passed as argument', () => {
      store.setState({ tags: mockTags, tagBuckets: buckets });
      ui.initializeCurrentSessionTags('rest');
      const selected = containerQSA('.picker-row-1 .tag-chip.selected');
      expect(selected.length).toBe(1);
      expect(selected[0].dataset.tag).toBe('rest');
    });

    it('shows up to 6 subtags of selected default in row 2', () => {
      store.setState({ tags: mockTags, tagBuckets: buckets });
      ui.initializeCurrentSessionTags();
      const subtagChips = containerQSA('.picker-row-2 .tag-chip');
      const names = Array.from(subtagChips).map(c => c.dataset.tag);
      expect(names).toEqual(['coding', 'meeting', 'email', 'planning', 'review', 'deploy']);
      expect(containerQSA('.picker-row-2 .tag-more-btn').length).toBe(1);
    });

    it('shows all subtags when 6 or fewer', () => {
      store.setState({ tags: mockTags, tagBuckets: { work: ['a', 'b', 'c'], rest: [], study: [], sport: [], other: [] } });
      ui.initializeCurrentSessionTags();
      const names = Array.from(containerQSA('.picker-row-2 .tag-chip')).map(c => c.dataset.tag);
      expect(names).toEqual(['a', 'b', 'c']);
    });

    it('clicking a different default tag switches row 2 subtags', () => {
      store.setState({ tags: mockTags, tagBuckets: buckets });
      ui.initializeCurrentSessionTags();
      const restChip = containerQSA('.picker-row-1 .tag-chip')[1];
      restChip.click();
      const subtagNames = Array.from(containerQSA('.picker-row-2 .tag-chip')).map(c => c.dataset.tag);
      expect(subtagNames).toEqual(['sleep', 'tv']);
    });

    it('limits subtags to 6 with +N more expander', () => {
      store.setState({ tags: mockTags, tagBuckets: buckets });
      ui.initializeCurrentSessionTags();
      const visibleChips = Array.from(containerQSA('.picker-row-2 .tag-chip:not(.tag-chip-hidden)'));
      expect(visibleChips.length).toBe(6);
      const expander = containerQSA('.picker-row-2 .tag-more-btn');
      expect(expander.length).toBe(1);
      expect(expander[0].textContent).toContain('+1 more');
    });

    it('expander click reveals hidden subtags', () => {
      store.setState({ tags: mockTags, tagBuckets: buckets });
      ui.initializeCurrentSessionTags();
      const moreBtn = containerQSA('.picker-row-2 .tag-more-btn')[0];
      moreBtn.click();
      const allChips = containerQSA('.picker-row-2 .tag-chip');
      expect(allChips.length).toBe(7);
      expect(containerQSA('.picker-row-2 .tag-more-btn').length).toBe(0);
    });

    it('toggles subtag selection on click', () => {
      store.setState({ tags: mockTags, tagBuckets: buckets });
      ui.initializeCurrentSessionTags();
      const chip = containerQSA('.picker-row-2 .tag-chip')[0];
      expect(chip.classList.contains('selected')).toBe(false);
      chip.click();
      expect(chip.classList.contains('selected')).toBe(true);
    });

    it('only one default can be selected at a time (radio-style)', () => {
      store.setState({ tags: mockTags, tagBuckets: buckets });
      ui.initializeCurrentSessionTags();
      const chips = containerQSA('.picker-row-1 .tag-chip');
      chips[1].click();
      const selected = containerQSA('.picker-row-1 .tag-chip.selected');
      expect(selected.length).toBe(1);
      expect(selected[0].dataset.tag).toBe('rest');
    });
  });

  describe('initializeSessionModalTags', () => {
    const modalBuckets = {
      work: ['coding', 'meeting', 'email'],
      rest: ['sleep'],
      study: ['rtu'],
      sport: ['cycling'],
      other: [],
    };

    it('renders two-row picker when tagBuckets present', () => {
      store.setState({ tags: mockTags, tagBuckets: modalBuckets });
      ui.initializeSessionModalTags();
      const container = document.getElementById('tags-container');
      const row1 = container.querySelector('.picker-row-1');
      const row2 = container.querySelector('.picker-row-2');
      expect(row1).toBeTruthy();
      expect(row2).toBeTruthy();
      const chips = container.querySelectorAll('.tag-chip');
      expect(chips.length).toBeGreaterThan(0);
    });

    it('pre-selects work bucket by default', () => {
      store.setState({ tags: mockTags, tagBuckets: modalBuckets });
      ui.initializeSessionModalTags();
      const selected = document.querySelectorAll('#tags-container .tag-chip.selected');
      expect(selected.length).toBe(1);
      expect(selected[0].dataset.tag).toBe('work');
    });

    it('pre-selects given bucket', () => {
      store.setState({ tags: mockTags, tagBuckets: modalBuckets });
      ui.initializeSessionModalTags('rest');
      const selected = document.querySelectorAll('#tags-container .tag-chip.selected');
      expect(selected.length).toBe(1);
      expect(selected[0].dataset.tag).toBe('rest');
    });

    it('pre-selects given subtags', () => {
      store.setState({ tags: mockTags, tagBuckets: modalBuckets });
      ui.initializeSessionModalTags('work', ['work', 'coding']);
      const row2Chips = document.querySelectorAll('#tags-container .picker-row-2 .tag-chip.selected');
      const selectedSubtagNames = Array.from(row2Chips).map(el => el.dataset.tag);
      expect(selectedSubtagNames).toContain('coding');
    });

    it('renders legacy subtags not in any bucket as selected read-only chips', () => {
      store.setState({ tags: mockTags, tagBuckets: modalBuckets });
      ui.initializeSessionModalTags('work', ['work', 'coding', 'legacyTag']);
      const row2Chips = document.querySelectorAll('#tags-container .picker-row-2 .tag-chip');
      const chipTags = Array.from(row2Chips).map(el => el.dataset.tag);
      expect(chipTags).toContain('legacyTag');
      const legacyChip = Array.from(row2Chips).find(el => el.dataset.tag === 'legacyTag');
      expect(legacyChip.classList.contains('selected')).toBe(true);
      expect(legacyChip.classList.contains('readonly')).toBe(true);
    });

    it('renders legacy subtags when bucket subtag list is empty', () => {
      store.setState({ tags: mockTags, tagBuckets: { work: [], rest: [], study: [], sport: [], other: [] } });
      ui.initializeSessionModalTags('work', ['work', 'legacyTag']);
      const row2Chips = document.querySelectorAll('#tags-container .picker-row-2 .tag-chip');
      expect(row2Chips.length).toBe(1);
      expect(row2Chips[0].dataset.tag).toBe('legacyTag');
      expect(row2Chips[0].classList.contains('selected')).toBe(true);
      expect(row2Chips[0].classList.contains('readonly')).toBe(true);
    });

    it('falls back to legacy picker when no tagBuckets', () => {
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

  describe('renderBucketStats', () => {
    it('renders nothing when no sessions', () => {
      ui.renderBucketStats();
      const container = document.getElementById('bucket-stats');
      expect(container.innerHTML).toBeFalsy();
    });

    it('renders bucket rows for sessions', () => {
      store.setState({
        sessions: [
          { id: 1, date: '2026-06-24', durationSec: 3600, bucket: 'work', tags: ['work', 'coding'] },
          { id: 2, date: '2026-06-24', durationSec: 1800, bucket: 'rest', tags: ['rest'] },
          { id: 3, date: '2026-06-23', durationSec: 7200, bucket: 'work', tags: ['work'] },
        ],
      });
      ui.renderBucketStats();
      const container = document.getElementById('bucket-stats');
      const rows = container.querySelectorAll('.bucket-stat-row');
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(container.innerHTML).toContain('work');
      expect(container.innerHTML).toContain('rest');
    });

    it('each bucket row shows bucket name and duration', () => {
      store.setState({
        sessions: [
          { id: 1, date: '2026-06-24', durationSec: 3600, bucket: 'work', tags: ['work'] },
        ],
      });
      ui.renderBucketStats();
      const container = document.getElementById('bucket-stats');
      expect(container.textContent).toContain('work');
      expect(container.textContent).toContain('01:00:00');
    });

    it('subtag drill-down expandable within bucket row', () => {
      store.setState({
        sessions: [
          { id: 1, date: '2026-06-24', durationSec: 3600, bucket: 'work', tags: ['work', 'coding'] },
          { id: 2, date: '2026-06-24', durationSec: 1800, bucket: 'work', tags: ['work', 'meeting'] },
        ],
      });
      ui.renderBucketStats();
      const container = document.getElementById('bucket-stats');
      const expandBtn = container.querySelector('.bucket-expand-btn');
      expect(expandBtn).toBeTruthy();
      expandBtn.click();
      const subtags = container.querySelectorAll('.bucket-subtag-row');
      expect(subtags.length).toBe(2);
    });

    it('no expand button when no subtags', () => {
      store.setState({
        sessions: [
          { id: 1, date: '2026-06-24', durationSec: 3600, bucket: 'work', tags: ['work'] },
        ],
      });
      ui.renderBucketStats();
      const container = document.getElementById('bucket-stats');
      expect(container.querySelector('.bucket-expand-btn')).toBeFalsy();
    });

    it('shows work bucket with correct color class', () => {
      store.setState({
        sessions: [
          { id: 1, date: '2026-06-24', durationSec: 3600, bucket: 'work', tags: ['work'] },
        ],
      });
      ui.renderBucketStats();
      const row = document.querySelector('.bucket-stat-row');
      expect(row.className).toContain('border-l-blue-500');
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
      expect(document.getElementById('duration-label').textContent).toBe('Current Duration');
    });

    it('updateTimerDisplayEl switches label for break', () => {
      ui.updateTimerDisplayEl(600, true);
      expect(document.getElementById('duration-label').textContent).toBe('Break Duration');
      expect(document.querySelector('.duration-display').classList.contains('break-mode')).toBe(true);
    });

    it('clicking active-duration during running toggles segment-only vs total duration', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      store.setState({
        tracker: {
          startTime: now - 900000,
          isPaused: false,
          pauseStart: null,
          segmentStartTime: now - 600000,
          totalSavedDurationMs: 300000,
          workBlockId: 'test',
          isBreak: false,
        },
      });

      ui = createUIManager(store);

      const display = document.getElementById('active-duration');

      ui.updateTimerDisplay();
      expect(display.textContent).toBe('00:10:00');
      expect(document.getElementById('duration-label').textContent).toBe('Current Duration');

      display.click();
      expect(display.textContent).toBe('00:15:00');
      expect(document.getElementById('duration-label').textContent).toBe('Segment Duration');

      display.click();
      expect(display.textContent).toBe('00:10:00');
      expect(document.getElementById('duration-label').textContent).toBe('Current Duration');

      vi.useRealTimers();
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

    it('re-renders tag settings when switching to tags tab', () => {
      store.setState({
        tags: [
          { name: 'work', isDefault: true, isEnabled: true, isCustom: false },
          { name: 'rest', isDefault: true, isEnabled: true, isCustom: false },
          { name: 'study', isDefault: true, isEnabled: true, isCustom: false },
          { name: 'sport', isDefault: true, isEnabled: true, isCustom: false },
          { name: 'other', isDefault: true, isEnabled: true, isCustom: false },
          { name: 'hiking', isDefault: false, isEnabled: true, isCustom: true },
        ],
        tagBuckets: {
          work: [], rest: [], study: [], sport: ['hiking'], other: [],
        },
      });
      ui.switchSettingsTab('tags');
      const sportGroup = document.querySelector('[data-bucket="sport"]');
      expect(sportGroup).toBeTruthy();
      expect(sportGroup.textContent).toContain('hiking');
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

    it('renders subtag chips even when tag objects missing from s.tags', () => {
      store.setState({
        tags: [
          { name: 'work', isDefault: true, isEnabled: true },
          { name: 'sport', isDefault: true, isEnabled: true },
        ],
        tagBuckets: { work: [], sport: ['cycling', 'horse', 'running'], other: [] },
      });
      ui.renderTagSettings();
      const sportGroup = document.querySelector('[data-bucket="sport"]');
      expect(sportGroup).toBeTruthy();
      const chips = sportGroup.querySelectorAll('.tag-item');
      const chipNames = Array.from(chips).map(c => c.textContent.trim());
      expect(chipNames).toContain('cycling');
      expect(chipNames).toContain('horse');
      expect(chipNames).toContain('running');
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

    it('renders remove button on each non-default subtag chip', () => {
      setupTagsState(store);
      ui.renderTagSettings();
      const restSubtagChips = document.querySelectorAll('[data-bucket="rest"] .tag-item:not([data-default="true"])');
      restSubtagChips.forEach(chip => {
        const removeBtn = chip.querySelector('.tag-remove-btn');
        expect(removeBtn).toBeTruthy();
      });
    });

    it('does not render remove button on default tag chips', () => {
      setupTagsState(store);
      ui.renderTagSettings();
      const defaultChips = document.querySelectorAll('.tag-item[data-default="true"]');
      defaultChips.forEach(chip => {
        expect(chip.querySelector('.tag-remove-btn')).toBeFalsy();
      });
    });

    it('clicking remove button removes subtag from bucket', () => {
      setupTagsState(store);
      ui.setOnTagBucketsChange(() => {});
      ui.renderTagSettings();
      const stateBefore = store.getState();
      expect(stateBefore.tagBuckets.rest).toContain('read');
      const readChip = Array.from(document.querySelectorAll('[data-bucket="rest"] .tag-item:not([data-default="true"])'))
        .find(c => c.textContent.includes('read'));
      const removeBtn = readChip.querySelector('.tag-remove-btn');
      removeBtn.click();
      const stateAfter = store.getState();
      expect(stateAfter.tagBuckets.rest).not.toContain('read');
      expect(stateAfter.tagBuckets.study).toContain('read');
    });

    it('shows no-subtags placeholder when bucket has no subtags', () => {
      setupTagsState(store);
      ui.setOnTagBucketsChange(() => {});
      ui.renderTagSettings();
      const workSubtags = document.querySelector('[data-bucket="work"] .tag-bucket-subtags');
      expect(workSubtags.textContent).toContain('no subtags');
    });

    it('drag from unassigned adds tag to target bucket', () => {
      store.setState({
        tags: [
          { name: 'work', isDefault: true, isEnabled: true, isCustom: false },
          { name: 'rest', isDefault: true, isEnabled: true, isCustom: false },
          { name: 'read', isDefault: false, isEnabled: true, isCustom: false },
          { name: 'untagged', isDefault: false, isEnabled: true, isCustom: true },
        ],
        tagBuckets: { work: [], rest: [], sport: [], study: [], other: [] },
      });
      ui.setOnTagBucketsChange(() => {});
      ui.renderTagSettings();
      const unassignedGroup = document.querySelector('[data-bucket="unassigned"]');
      expect(unassignedGroup).toBeTruthy();
      const dt = new MockDataTransfer();
      dt.setData('text/plain', 'untagged');
      dt.setData('application/x-source-bucket', 'unassigned');
      const workSubtags = document.querySelector('[data-bucket="work"] .tag-bucket-subtags');
      workSubtags.dispatchEvent(createDragEvent('drop', dt));
      const stateAfter = store.getState();
      expect(stateAfter.tagBuckets.work).toContain('untagged');
    });
  });

  describe('break session init functions', () => {
    const breakBuckets = {
      work: ['coding', 'meeting'],
      rest: ['walk', 'snack'],
      study: [],
      sport: [],
      other: [],
    };

    it('initializeBreakSessionTags renders tags in container', () => {
      store.setState({ tags: mockTags, tagBuckets: breakBuckets });
      ui.initializeBreakSessionTags();
      const container = document.getElementById('break-session-tags');
      const chips = container.querySelectorAll('.tag-chip');
      expect(chips.length).toBeGreaterThanOrEqual(5);
    });

    it('initializeBreakSessionMood renders 5 stars', () => {
      ui.initializeBreakSessionMood();
      const container = document.getElementById('break-session-mood');
      const stars = container.querySelectorAll('.star');
      expect(stars.length).toBe(5);
      stars.forEach(star => {
        expect(star.innerHTML).toBe('\u2605');
      });
    });

    it('createStarsForBreakSession fills/unfills stars based on data-rating', () => {
      const container = document.getElementById('break-session-mood');
      container.dataset.rating = '3';
      container.innerHTML = '';
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement('div');
        star.className = 'star text-2xl cursor-pointer';
        star.dataset.value = i;
        container.appendChild(star);
      }
      ui.createStarsForBreakSession();
      const stars = container.querySelectorAll('.star');
      expect(stars[0].innerHTML).toBe('\u2605');
      expect(stars[1].innerHTML).toBe('\u2605');
      expect(stars[2].innerHTML).toBe('\u2605');
      expect(stars[3].innerHTML).toBe('\u2606');
      expect(stars[4].innerHTML).toBe('\u2606');
    });
  });
});
