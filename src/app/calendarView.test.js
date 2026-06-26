// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStore } from './state.js';
import { createCalendarView } from './calendarView.js';
import { createCalendarService } from './calendarService.js';

function setupDOM() {
  document.body.innerHTML = `
    <div id="calendar-content" class="hidden fade-in">
      <div class="bg-white rounded-xl shadow-md p-6 dark:bg-gray-700 dark:text-white">
        <div class="flex justify-between items-center mb-4">
          <button id="cal-prev"></button>
          <h2 id="cal-month-year"></h2>
          <button id="cal-next"></button>
        </div>
        <div id="cal-grid"></div>
        <div id="cal-footer" class="mt-4">
          <div id="cal-total-hours" class="text-sm"></div>
          <div id="cal-details-wrap" class="mt-2">
            <button id="cal-more-btn" class="text-xs"><i class="fas fa-chevron-down mr-1"></i>Details</button>
            <div id="cal-details" class="hidden mt-2"></div>
          </div>
        </div>
      </div>
    </div>
    <div id="mark-day-modal" class="hidden">
      <input id="mark-date" />
      <input id="mark-day-type" />
      <input id="day-description" />
    </div>
    <div id="tracker-content" class="fade-in"></div>
  `;
}

const mockHolidays = {
  '2026-06-25': { type: 'holiday', name: 'Jāņi' },
};

describe('createCalendarView', () => {
  let store;
  let calView;
  let calendarService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
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
    calendarService = createCalendarService(mockHolidays);
    calView = createCalendarView(store);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns renderCalendar, nextMonth, prevMonth, and getCurrentMonth', () => {
    expect(calView.renderCalendar).toBeTypeOf('function');
    expect(calView.nextMonth).toBeTypeOf('function');
    expect(calView.prevMonth).toBeTypeOf('function');
    expect(calView.getCurrentMonth).toBeTypeOf('function');
  });

  it('renderCalendar shows current month in header', () => {
    calView.renderCalendar(calendarService);
    expect(document.getElementById('cal-month-year').textContent).toBe('June 2026');
  });

  it('renderCalendar renders 7 day-header cells', () => {
    calView.renderCalendar(calendarService);
    const headers = document.querySelectorAll('.cal-day-header');
    expect(headers.length).toBe(7);
    expect(headers[0].textContent).toBe('Mon');
    expect(headers[6].textContent).toBe('Sun');
  });

  it('renderCalendar renders correct number of day cells for June 2026', () => {
    calView.renderCalendar(calendarService);
    const days = document.querySelectorAll('.cal-day, .cal-day-other');
    expect(days.length).toBe(35);
  });

  it('renderCalendar marks holidays with cal-holiday class', () => {
    calView.renderCalendar(calendarService);
    const holiday = document.querySelector('[data-date="2026-06-25"]');
    expect(holiday).not.toBeNull();
    expect(holiday.classList.contains('cal-holiday')).toBe(true);
    expect(holiday.classList.contains('cal-day')).toBe(true);
  });

  it('renderCalendar shows holiday name in tooltip on holiday cells', () => {
    calView.renderCalendar(calendarService);
    const holiday = document.querySelector('[data-date="2026-06-25"]');
    expect(holiday.getAttribute('title')).toContain('Jāņi');
  });

  it('renderCalendar marks weekends with cal-weekend class', () => {
    calView.renderCalendar(calendarService);
    const sunday = document.querySelector('[data-date="2026-06-07"]');
    expect(sunday).not.toBeNull();
    expect(sunday.classList.contains('cal-weekend')).toBe(true);
  });

  it('renderCalendar marks today with cal-today class', () => {
    calView.renderCalendar(calendarService);
    const today = document.querySelector('[data-date="2026-06-15"]');
    expect(today.classList.contains('cal-today')).toBe(true);
  });

  it('renderCalendar marks days with sessions as cal-has-sessions', () => {
    store.setState({ sessions: [{ date: '2026-06-10' }, { date: '2026-06-15' }] });
    calView.renderCalendar(calendarService);
    expect(document.querySelector('[data-date="2026-06-10"]').classList.contains('cal-has-sessions')).toBe(true);
    expect(document.querySelector('[data-date="2026-06-15"]').classList.contains('cal-has-sessions')).toBe(true);
    expect(document.querySelector('[data-date="2026-06-01"]').classList.contains('cal-has-sessions')).toBe(false);
  });

  it('renderCalendar marks user vacation days with cal-vacation', () => {
    store.setState({ markedDays: [{ date: '2026-06-12', dayType: 'Vacation', description: 'Day off' }] });
    calView.renderCalendar(calendarService);
    const day = document.querySelector('[data-date="2026-06-12"]');
    expect(day.classList.contains('cal-vacation')).toBe(true);
  });

  it('renderCalendar marks user holidays with cal-holiday', () => {
    store.setState({ markedDays: [{ date: '2026-06-18', dayType: 'Holiday', description: 'My holiday' }] });
    calView.renderCalendar(calendarService);
    const day = document.querySelector('[data-date="2026-06-18"]');
    expect(day.classList.contains('cal-holiday')).toBe(true);
  });

  it('renderCalendar marks memoriam days with cal-memoriam', () => {
    const cal = createCalendarService({
      '2026-06-14': { type: 'workday', is_memoriam: true, name: 'Memorial Day' },
    });
    calView.renderCalendar(cal);
    const day = document.querySelector('[data-date="2026-06-14"]');
    expect(day.classList.contains('cal-memoriam')).toBe(true);
  });

  it('nextMonth advances to July 2026', () => {
    calView.renderCalendar(calendarService);
    calView.nextMonth();
    calView.renderCalendar(calendarService);
    expect(document.getElementById('cal-month-year').textContent).toBe('July 2026');
  });

  it('prevMonth goes back to May 2026', () => {
    calView.renderCalendar(calendarService);
    calView.prevMonth();
    calView.renderCalendar(calendarService);
    expect(document.getElementById('cal-month-year').textContent).toBe('May 2026');
  });

  it('nextMonth wraps to next year', () => {
    vi.setSystemTime(new Date('2026-12-15T12:00:00Z'));
    const cal = createCalendarService({});
    const decView = createCalendarView(store);
    decView.renderCalendar(cal);
    decView.nextMonth();
    decView.renderCalendar(cal);
    expect(document.getElementById('cal-month-year').textContent).toBe('January 2027');
  });

  it('prevMonth wraps to previous year', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
    const cal = createCalendarService({});
    const janView = createCalendarView(store);
    janView.renderCalendar(cal);
    janView.prevMonth();
    janView.renderCalendar(cal);
    expect(document.getElementById('cal-month-year').textContent).toBe('December 2025');
  });

  it('getCurrentMonth returns current year and month', () => {
    expect(calView.getCurrentMonth()).toEqual({ year: 2026, month: 5 });
  });

  it('getCurrentMonth reflects changes after navigation', () => {
    calView.nextMonth();
    expect(calView.getCurrentMonth()).toEqual({ year: 2026, month: 6 });
  });

  it('renderCalendar renders day headers Mon-Sun', () => {
    calView.renderCalendar(calendarService);
    const headers = document.querySelectorAll('.cal-day-header');
    expect(headers.length).toBe(7);
    expect(headers[0].textContent).toBe('Mon');
    expect(headers[6].textContent).toBe('Sun');
  });

  it('renderCalendar works without calendarService (graceful degradation)', () => {
    calView.renderCalendar(null);
    expect(document.getElementById('cal-month-year').textContent).toBe('June 2026');
    const day = document.querySelector('[data-date="2026-06-15"]');
    expect(day.classList.contains('cal-today')).toBe(true);
  });

  it('renderCalendar day cells show day number', () => {
    calView.renderCalendar(calendarService);
    const day = document.querySelector('[data-date="2026-06-15"]');
    const numEl = day.querySelector('.cal-day-num');
    expect(numEl.textContent).toBe('15');
  });

  it('renderCalendar shows tracked days and hours in footer, excluding breaks', () => {
    store.setState({
      sessions: [
        { date: '2026-06-10', durationSec: 28800 },
        { date: '2026-06-15', durationSec: 14400 },
        { date: '2026-06-10', durationSec: 1800, isBreak: true },
      ],
    });
    calView.renderCalendar(calendarService);
    const footer = document.getElementById('cal-total-hours');
    expect(footer.textContent).toMatch(/Tracked: 2d 12\.0h/);
  });

  it('renderCalendar shows only work day info when no sessions exist', () => {
    calView.renderCalendar(calendarService);
    const footer = document.getElementById('cal-total-hours');
    expect(footer.textContent).not.toContain('Tracked');
  });

  it('renderCalendar deducts short day hours in footer total', () => {
    const cal = createCalendarService({
      '2026-06-23': { type: 'workday', is_short_day: true, note: 'Pirmssvētku diena' },
    });
    calView.renderCalendar(cal);
    const footer = document.getElementById('cal-total-hours');
    expect(footer.textContent).toContain('(1 short day −1h)');
  });



  it('renderCalendar includes short day indicator', () => {
    const cal = createCalendarService({
      '2026-06-23': { type: 'workday', is_short_day: true, note: 'Pirmssvētku diena' },
    });
    calView.renderCalendar(cal);
    const day = document.querySelector('[data-date="2026-06-23"]');
    expect(day.classList.contains('cal-short')).toBe(true);
  });
});
