// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from './storage.js';

describe('storage', () => {
  const mockData = { sessions: [], config: { workHours: 8 } };

  beforeEach(() => {
    window.api = {
      loadData: () => Promise.resolve(mockData),
      saveData: (data) => Promise.resolve(true),
      loadCalendar: (year) => Promise.resolve({ '2026-01-01': { type: 'holiday' } }),
    };
  });

  it('loadState returns data from IPC', async () => {
    const result = await storage.loadState();
    expect(result).toEqual(mockData);
  });

  it('saveState sends data to IPC', async () => {
    const result = await storage.saveState(mockData);
    expect(result).toBe(true);
  });

  it('saveState serialises and sends the full state', async () => {
    let saved;
    window.api = {
      ...window.api,
      saveData: (data) => {
        saved = data;
        return Promise.resolve(true);
      },
    };
    await storage.saveState(mockData);
    expect(saved).toEqual(mockData);
  });

  it('loadCalendar returns calendar data for a year', async () => {
    const result = await storage.loadCalendar('2026');
    expect(result['2026-01-01'].type).toBe('holiday');
  });

  it('loadCalendar passes year to IPC', async () => {
    let passedYear;
    window.api = {
      ...window.api,
      loadCalendar: (year) => {
        passedYear = year;
        return Promise.resolve({});
      },
    };
    await storage.loadCalendar('2026');
    expect(passedYear).toBe('2026');
  });

  it('loadState returns null when no data saved', async () => {
    window.api = {
      ...window.api,
      loadData: () => Promise.resolve(null),
    };
    const result = await storage.loadState();
    expect(result).toBeNull();
  });

  it('handles IPC errors gracefully', async () => {
    window.api = {
      ...window.api,
      loadData: () => Promise.reject(new Error('IPC error')),
    };
    await expect(storage.loadState()).rejects.toThrow('IPC error');
  });
});
