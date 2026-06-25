// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './state.js';
import { createUIManager } from './uiManager.js';

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
    <div id="default-tags"></div>
    <div id="preset-tags"></div>
    <div id="custom-tags"></div>
    <div id="current-session-start-time-input"></div>
    <div id="current-session-end-time-input"></div>
    <div id="current-session-accumulated-rest-duration-input"></div>
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

    it('sums today session durations', () => {
      store.setState({ sessions: mockSessions });
      ui.updateTodayTotal();
      const total = document.getElementById('today-total').textContent;
      expect(total).not.toBe('00:00:00');
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
});
