import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './state.js';
import { createStatsManager } from './statsManager.js';

describe('statsManager', () => {
  let store;
  let stats;

  beforeEach(() => {
    store = createStore({
      sessions: [
        { id: 1, date: '2026-06-24', durationSec: 3600, dayType: 'Workday' },
        { id: 2, date: '2026-06-24', durationSec: 1800, dayType: 'Workday' },
        { id: 3, date: '2026-06-23', durationSec: 7200, dayType: 'Workday' },
      ],
      configs: [{ workingHours: 8, salaryValue: 15, salaryType: 'hourly', salaryTaxType: 'net', salaryTax: 20 }],
      markedDays: [
        { date: '2026-06-25', dayType: 'Holiday' },
        { date: '2026-06-26', dayType: 'Vacation' },
      ],
    });
    stats = createStatsManager(store);
  });

  it('computeTodayTotal returns total seconds for a date', () => {
    const result = stats.computeTodayTotal('2026-06-24');
    expect(result.totalSec).toBe(5400);
    expect(result.formatted).toBe('01:30:00');
  });

  it('computeTodayTotal returns 0 for date with no sessions', () => {
    const result = stats.computeTodayTotal('2026-06-25');
    expect(result.totalSec).toBe(0);
    expect(result.formatted).toBe('00:00:00');
  });

  it('getWorkDaysInMonth returns number of weekdays', () => {
    // June 2026: Mon-Sat calendar, 22 weekdays (Mon-Fri)
    const count = stats.getWorkDaysInMonth(2026, 5);
    expect(count).toBe(22);
  });

  it('computePeriodStats returns chart data for daily period', () => {
    const result = stats.computePeriodStats('daily', new Date(2026, 5, 24));
    expect(result.labels).toHaveLength(7);
    expect(result.data).toHaveLength(7);
    expect(result.totalSec).toBe(12600);
  });

  it('computePeriodStats returns chart data for yearly period', () => {
    const result = stats.computePeriodStats('yearly', new Date(2026, 5, 24));
    expect(result.labels).toHaveLength(12);
    expect(result.data).toHaveLength(12);
    // Only June has 3 sessions = 12600 sec = 3.5 hours
    expect(result.data[5]).toBe(3.5);
  });

  it('computeYearlyTable returns 12-month breakdown', () => {
    const table = stats.computeYearlyTable(2026);
    expect(table).toHaveLength(12);
    // June (index 5) has sessions
    expect(table[5].totalHours).toBe(3.5);
    expect(table[5].workDays).toBe(2); // June 23, 24 are weekdays
    expect(table[5].avgHoursPerDay).toBe(1.8);
  });

  it('computeIncome returns monthly income array for hourly rate', () => {
    const income = stats.computeIncome(2026);
    expect(income).toHaveLength(12);
    expect(income[5]).toBeCloseTo(3.5 * 15, 1); // 3.5h * $15 = $52.5
    // All non-June months should be 0
    expect(income[0]).toBe(0);
  });

  it('computeIncome returns 0 for all months when no config', () => {
    store.setState({ configs: [] });
    const income = stats.computeIncome(2026);
    expect(income.every((v) => v === 0)).toBe(true);
  });

  it('computePeriodStats filters sessions by tag', () => {
    store.setState({
      sessions: [
        { id: 1, date: '2026-06-24', durationSec: 3600, dayType: 'Workday', tags: ['work'] },
        { id: 2, date: '2026-06-24', durationSec: 1800, dayType: 'Workday', tags: ['rest'] },
      ],
    });
    const result = stats.computePeriodStats('daily', new Date(2026, 5, 24), { tags: ['work'] });
    expect(result.totalSec).toBe(3600);
  });
});
