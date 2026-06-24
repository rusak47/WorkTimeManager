import { describe, it, expect, vi } from 'vitest';
import { createCalendarService } from './calendarService.js';

const mockCalendarData = {
  '2026-01-01': { type: 'holiday', name: 'Jaungada diena', local_name: 'Jaungada diena', observed_date: '2026-01-01' },
  '2026-01-02': { type: 'swapped_day_off', swap_source: '2026-01-17', note: 'Pārcelta' },
  '2026-01-17': { type: 'swapped_workday', swap_source: '2026-01-02', note: 'Pārcelta' },
  '2026-01-20': { type: 'workday', is_memoriam: true, name: 'Barikāžu atceres diena' },
  '2026-03-08': { type: 'weekend', is_memoriam: true, name: 'Sieviešu diena' },
  '2026-04-02': { type: 'pre_holiday_short', note: 'Pirmssvētku diena' },
  '2026-05-01': { type: 'holiday', name: 'Darba svētki', local_name: 'Darba svētki', observed_date: '2026-05-01', is_memoriam: true },
};

describe('createCalendarService', () => {
  it('classifies weekend as weekend', () => {
    const svc = createCalendarService(mockCalendarData);
    const info = svc.classifyDate('2026-01-03');
    expect(info.dayType).toBe('weekend');
    expect(info.isWeekend).toBe(true);
    expect(info.isHoliday).toBe(false);
  });

  it('classifies holiday from calendar data', () => {
    const svc = createCalendarService(mockCalendarData);
    const info = svc.classifyDate('2026-01-01');
    expect(info.dayType).toBe('holiday');
    expect(info.isHoliday).toBe(true);
    expect(info.isWeekend).toBe(false);
    expect(info.isMemoriam).toBe(false);
  });

  it('classifies swapped day off as holiday', () => {
    const svc = createCalendarService(mockCalendarData);
    const info = svc.classifyDate('2026-01-02');
    expect(info.dayType).toBe('holiday');
    expect(info.isHoliday).toBe(true);
    expect(info.isWeekend).toBe(false);
    expect(info.name).toBeNull();
    expect(info.swapSource).toBe('2026-01-17');
  });

  it('classifies swapped workday as workday', () => {
    const svc = createCalendarService(mockCalendarData);
    const info = svc.classifyDate('2026-01-17');
    expect(info.dayType).toBe('workday');
    expect(info.isHoliday).toBe(false);
    expect(info.isWeekend).toBe(false);
    expect(info.swapSource).toBe('2026-01-02');
  });

  it('classifies pre-holiday short with isShortDay flag', () => {
    const svc = createCalendarService(mockCalendarData);
    const info = svc.classifyDate('2026-04-02');
    expect(info.dayType).toBe('workday');
    expect(info.isShortDay).toBe(true);
    expect(info.isHoliday).toBe(false);
  });

  it('classifies memoriam-only workday as workday + isMemoriam flag', () => {
    const svc = createCalendarService(mockCalendarData);
    const info = svc.classifyDate('2026-01-20');
    expect(info.dayType).toBe('workday');
    expect(info.isMemoriam).toBe(true);
    expect(info.isHoliday).toBe(false);
  });

  it('classifies dual-type holiday+memoriam as holiday + isMemoriam flag', () => {
    const svc = createCalendarService(mockCalendarData);
    const info = svc.classifyDate('2026-05-01');
    expect(info.dayType).toBe('holiday');
    expect(info.isHoliday).toBe(true);
    expect(info.isMemoriam).toBe(true);
  });

  it('classifies memoriam weekend as weekend + isMemoriam flag', () => {
    const svc = createCalendarService(mockCalendarData);
    const info = svc.classifyDate('2026-03-08');
    expect(info.dayType).toBe('weekend');
    expect(info.isWeekend).toBe(true);
    expect(info.isMemoriam).toBe(true);
  });

  it('normalises absent is_memoriam as false', () => {
    const svc = createCalendarService(mockCalendarData);
    const info = svc.classifyDate('2026-01-01');
    expect(info.isMemoriam).toBe(false);
  });

  it('returns DayInfo for a known date via getDayInfo', () => {
    const svc = createCalendarService(mockCalendarData);
    const info = svc.getDayInfo('2026-01-01');
    expect(info).not.toBeNull();
    expect(info.date).toBe('2026-01-01');
    expect(info.dayType).toBe('holiday');
  });

  it('returns DayInfo for a plain workday via getDayInfo', () => {
    const svc = createCalendarService(mockCalendarData);
    const info = svc.getDayInfo('2026-01-05');
    expect(info).not.toBeNull();
    expect(info.date).toBe('2026-01-05');
    expect(info.dayType).toBe('workday');
    expect(info.isWeekend).toBe(false);
  });

  it('returns dayType workday for invalid date string', () => {
    const svc = createCalendarService(mockCalendarData);
    expect(svc.classifyDate('not-a-date')).toBeNull();
    expect(svc.getDayInfo('not-a-date')).toBeNull();
  });

  it('handles empty calendar gracefully', () => {
    const svc = createCalendarService({});
    const info = svc.classifyDate('2026-01-01');
    expect(info.dayType).toBe('workday');
    expect(info.isHoliday).toBe(false);
    expect(info.isMemoriam).toBe(false);
  });

  it('honors user override for vacation', () => {
    const svc = createCalendarService(mockCalendarData);
    svc.setOverride('2026-01-05', 'dayType', 'vacation');
    svc.setOverride('2026-01-05', 'isVacation', true);
    const info = svc.getDayInfo('2026-01-05');
    expect(info.dayType).toBe('vacation');
    expect(info.isVacation).toBe(true);
  });

  it('honors user override for isMemoriam', () => {
    const svc = createCalendarService(mockCalendarData);
    svc.setOverride('2026-01-05', 'isMemoriam', true);
    const info = svc.getDayInfo('2026-01-05');
    expect(info.isMemoriam).toBe(true);
  });

  it('clearOverride removes all overrides for a date', () => {
    const svc = createCalendarService(mockCalendarData);
    svc.setOverride('2026-01-05', 'dayType', 'vacation');
    svc.clearOverride('2026-01-05');
    const info = svc.getDayInfo('2026-01-05');
    expect(info.dayType).toBe('workday');
    expect(info.isVacation).toBe(false);
  });

  it('classifyWithOverride applies overrides', () => {
    const svc = createCalendarService(mockCalendarData);
    svc.setOverride('2026-01-01', 'note', 'My custom note');
    const info = svc.classifyWithOverride('2026-01-01');
    expect(info.dayType).toBe('holiday');
    expect(info.note).toBe('My custom note');
  });

  it('getYearCalendar returns all dates in a year', () => {
    const svc = createCalendarService(mockCalendarData);
    const cal = svc.getYearCalendar('2026');
    expect(cal['2026-01-01']).toBeDefined();
    expect(cal['2026-12-31']).toBeDefined();
    expect(Object.keys(cal).length).toBe(365);
  });

  it('getRawCalendar returns the internal normalised data', () => {
    const svc = createCalendarService(mockCalendarData);
    const raw = svc.getRawCalendar();
    expect(raw['2026-01-01']).toBeDefined();
    expect(raw['2026-01-01'].dayType).toBe('holiday');
  });

  it('getYearCalendar returns DayInfo objects', () => {
    const svc = createCalendarService(mockCalendarData);
    const cal = svc.getYearCalendar('2026');
    const info = cal['2026-01-05'];
    expect(info.date).toBe('2026-01-05');
    expect(info.dayType).toBe('workday');
    expect(typeof info.isHoliday).toBe('boolean');
    expect(typeof info.isWeekend).toBe('boolean');
    expect(typeof info.isMemoriam).toBe('boolean');
    expect(typeof info.isShortDay).toBe('boolean');
  });
});
