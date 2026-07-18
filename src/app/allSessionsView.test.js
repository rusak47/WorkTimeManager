import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  groupByYear,
  groupByMonth,
  groupByWeek,
  getDefaultPeriod,
  getPrevPeriod,
  filterByPeriod,
  toggleGroup,
  isGroupExpanded,
  getTotalDuration,
} from './allSessionsView.js';

const sessions = [
  { id: 1, date: '2026-07-14', startTime: '2026-07-14T08:00:00', endTime: '2026-07-14T09:00:00', durationSec: 3600, duration: '01:00:00' },
  { id: 2, date: '2026-07-14', startTime: '2026-07-14T10:00:00', endTime: '2026-07-14T11:30:00', durationSec: 5400, duration: '01:30:00' },
  { id: 3, date: '2026-07-15', startTime: '2026-07-15T09:00:00', endTime: '2026-07-15T10:00:00', durationSec: 3600, duration: '01:00:00' },
  { id: 4, date: '2026-06-10', startTime: '2026-06-10T08:00:00', endTime: '2026-06-10T12:00:00', durationSec: 14400, duration: '04:00:00' },
  { id: 5, date: '2025-12-20', startTime: '2025-12-20T09:00:00', endTime: '2025-12-20T10:00:00', durationSec: 3600, duration: '01:00:00' },
];

describe('groupByYear', () => {
  it('groups sessions by year then month then date', () => {
    const result = groupByYear(sessions);
    expect(result).toHaveProperty('2026');
    expect(result).toHaveProperty('2025');
    expect(result['2026']).toHaveProperty('July');
    expect(result['2026']).toHaveProperty('June');
    expect(result['2026']['July']).toHaveProperty('2026-07-14');
    expect(result['2026']['July']).toHaveProperty('2026-07-15');
    expect(result['2026']['July']['2026-07-14']).toHaveLength(2);
    expect(result['2026']['July']['2026-07-15']).toHaveLength(1);
    expect(result['2026']['June']['2026-06-10']).toHaveLength(1);
    expect(result['2025']['December']['2025-12-20']).toHaveLength(1);
  });

  it('returns empty object for empty sessions', () => {
    expect(groupByYear([])).toEqual({});
  });
});

describe('groupByMonth', () => {
  it('groups sessions by ISO week number then date', () => {
    const result = groupByMonth(sessions.filter(s => s.date.startsWith('2026-07')));
    const weeks = Object.keys(result);
    expect(weeks.length).toBeGreaterThanOrEqual(1);
    for (const week of weeks) {
      expect(week).toMatch(/^\d{4}-W\d{2}$/);
      for (const date of Object.keys(result[week])) {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('groups July 14 and 15 into correct weeks', () => {
    const julySessions = sessions.filter(s => s.date.startsWith('2026-07'));
    const result = groupByMonth(julySessions);
    const allDates = Object.values(result).flatMap(week => Object.keys(week));
    expect(allDates).toContain('2026-07-14');
    expect(allDates).toContain('2026-07-15');
  });
});

describe('groupByWeek', () => {
  it('groups sessions by date only', () => {
    const result = groupByWeek(sessions.filter(s => s.date.startsWith('2026-07')));
    expect(result).toHaveProperty('2026-07-14');
    expect(result).toHaveProperty('2026-07-15');
    expect(result['2026-07-14']).toHaveLength(2);
    expect(result['2026-07-15']).toHaveLength(1);
  });
});

describe('getDefaultPeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-18T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns current year for year view', () => {
    expect(getDefaultPeriod('year')).toBe('2026');
  });

  it('returns current month for month view', () => {
    expect(getDefaultPeriod('month')).toBe('2026-07');
  });

  it('returns current week for week view', () => {
    const week = getDefaultPeriod('week');
    expect(week).toMatch(/^2026-W\d{2}$/);
  });
});

describe('getPrevPeriod', () => {
  it('returns previous year', () => {
    expect(getPrevPeriod('year', '2026')).toBe('2025');
  });

  it('returns previous month', () => {
    expect(getPrevPeriod('month', '2026-07')).toBe('2026-06');
  });

  it('rolls back year from January', () => {
    expect(getPrevPeriod('month', '2026-01')).toBe('2025-12');
  });

  it('returns previous week', () => {
    expect(getPrevPeriod('week', '2026-W29')).toBe('2026-W28');
  });

  it('rolls back year from W01', () => {
    expect(getPrevPeriod('week', '2026-W01')).toBe('2025-W52');
  });
});

describe('filterByPeriod', () => {
  it('filters sessions to given year', () => {
    const result = filterByPeriod(sessions, 'year', '2026');
    expect(result).toHaveLength(4);
    expect(result.every(s => s.startTime.startsWith('2026'))).toBe(true);
  });

  it('filters sessions to given month', () => {
    const result = filterByPeriod(sessions, 'month', '2026-07');
    expect(result).toHaveLength(3);
    expect(result.every(s => s.startTime.startsWith('2026-07'))).toBe(true);
  });

  it('filters sessions to given week', () => {
    const result = filterByPeriod(sessions, 'week', '2026-W29');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(s => {
      const d = new Date(s.startTime);
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
      return `2026-W${String(weekNum).padStart(2, '0')}` === '2026-W29';
    })).toBe(true);
  });

  it('returns all sessions for unknown period', () => {
    const result = filterByPeriod(sessions, 'year', '9999');
    expect(result).toHaveLength(0);
  });
});

describe('toggleGroup', () => {
  it('adds id to set when not present', () => {
    const expanded = new Set();
    const result = toggleGroup(expanded, 'month-2026-07');
    expect(result.has('month-2026-07')).toBe(true);
  });

  it('removes id from set when present', () => {
    const expanded = new Set(['month-2026-07']);
    const result = toggleGroup(expanded, 'month-2026-07');
    expect(result.has('month-2026-07')).toBe(false);
  });

  it('does not mutate original set', () => {
    const expanded = new Set();
    toggleGroup(expanded, 'month-2026-07');
    expect(expanded.has('month-2026-07')).toBe(false);
  });
});

describe('isGroupExpanded', () => {
  it('returns true when id is in set', () => {
    expect(isGroupExpanded(new Set(['foo']), 'foo')).toBe(true);
  });

  it('returns false when id is not in set', () => {
    expect(isGroupExpanded(new Set(), 'foo')).toBe(false);
  });
});

describe('getTotalDuration', () => {
  it('sums durationSec from sessions', () => {
    expect(getTotalDuration(sessions.slice(0, 2))).toBe(9000);
  });

  it('returns 0 for empty array', () => {
    expect(getTotalDuration([])).toBe(0);
  });
});
