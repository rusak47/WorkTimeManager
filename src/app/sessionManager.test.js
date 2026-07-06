import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './state.js';
import { createSessionManager } from './sessionManager.js';

describe('sessionManager', () => {
  let store;
  let sm;

  const sampleSession = {
    date: '2026-06-24',
    startTime: '2026-06-24T08:00:00.000Z',
    endTime: '2026-06-24T10:00:00.000Z',
    duration: '02:00:00',
    durationSec: 7200,
    dayType: 'Workday',
    notes: 'Morning work',
    tags: ['work'],
    mood: 5,
  };

  beforeEach(() => {
    store = createStore({ sessions: [] });
    sm = createSessionManager(store);
  });

  it('getSessions returns empty array initially', () => {
    expect(sm.getSessions()).toEqual([]);
  });

  it('addSession prepends a session and returns it with id', () => {
    const session = sm.addSession(sampleSession);
    expect(session.id).toBeTypeOf('number');
    expect(session.duration).toBe('02:00:00');
    expect(sm.getSessions()).toHaveLength(1);
  });

  it('addSession stores bucket from data', () => {
    const session = sm.addSession({ ...sampleSession, bucket: 'study' });
    expect(session.bucket).toBe('study');
  });

  it('addSession does not set bucket when absent', () => {
    const session = sm.addSession(sampleSession);
    expect(session.bucket).toBeUndefined();
  });

  it('getSessions returns sessions sorted newest first', () => {
    const s1 = sm.addSession({ ...sampleSession, id: 1, date: '2026-06-23' });
    const s2 = sm.addSession({ ...sampleSession, id: 2, date: '2026-06-24' });
    expect(sm.getSessions()[0].id).toBe(2);
  });

  it('updateSession merges data into existing session', () => {
    const session = sm.addSession({ ...sampleSession, id: 1 });
    const updated = sm.updateSession(1, { notes: 'Updated notes', mood: 3 });
    expect(updated.notes).toBe('Updated notes');
    expect(updated.mood).toBe(3);
    expect(updated.duration).toBe('02:00:00');
  });

  it('updateSession returns null for nonexistent id', () => {
    expect(sm.updateSession(999, { notes: 'x' })).toBeNull();
  });

  it('deleteSession removes session by id', () => {
    const s1 = sm.addSession({ ...sampleSession, id: 1 });
    const s2 = sm.addSession({ ...sampleSession, id: 2 });
    expect(sm.deleteSession(1)).toBe(true);
    expect(sm.getSessions()).toHaveLength(1);
    expect(sm.getSessions()[0].id).toBe(2);
  });

  it('deleteSession returns false for nonexistent id', () => {
    expect(sm.deleteSession(999)).toBe(false);
  });

  it('resetSessions clears all sessions', () => {
    sm.addSession(sampleSession);
    sm.addSession(sampleSession);
    sm.resetSessions();
    expect(sm.getSessions()).toEqual([]);
  });

  it('getSessionsByFilter filters by date', () => {
    sm.addSession({ ...sampleSession, id: 1, date: '2026-06-23' });
    sm.addSession({ ...sampleSession, id: 2, date: '2026-06-24' });
    const filtered = sm.getSessionsByFilter({ date: '2026-06-24' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].date).toBe('2026-06-24');
  });

  it('getSessionsByFilter filters by year', () => {
    sm.addSession({ ...sampleSession, id: 1, date: '2025-12-31' });
    sm.addSession({ ...sampleSession, id: 2, date: '2026-06-24' });
    const filtered = sm.getSessionsByFilter({ year: '2025' });
    expect(filtered).toHaveLength(1);
  });

  it('getSessionsByFilter filters by dayType', () => {
    sm.addSession({ ...sampleSession, id: 1, dayType: 'Workday' });
    sm.addSession({ ...sampleSession, id: 2, dayType: 'Weekend' });
    const filtered = sm.getSessionsByFilter({ dayType: 'Weekend' });
    expect(filtered).toHaveLength(1);
  });

  it('getSessionsByFilter with no filters returns all sessions', () => {
    sm.addSession(sampleSession);
    sm.addSession(sampleSession);
    expect(sm.getSessionsByFilter({})).toHaveLength(2);
  });

  it('startTracking sets tracker state without accumulatedPauseTime', () => {
    const tracker = sm.startTracking();
    expect(tracker.startTime).toBeTypeOf('number');
    expect(tracker.isPaused).toBe(false);
    expect(tracker.isBreak).toBe(false);
    expect(tracker.workBlockId).toBeTypeOf('string');
    expect(tracker.segmentStartTime).toBeTypeOf('number');
    expect(tracker.totalSavedDurationMs).toBe(0);
    expect(tracker).not.toHaveProperty('accumulatedPauseTime');
  });

  it('startTracking with isBreak true sets break mode', () => {
    const tracker = sm.startTracking({ isBreak: true });
    expect(tracker.isBreak).toBe(true);
  });

  it('startTracking workBlockId is a UUID-like string', () => {
    const t1 = sm.startTracking();
    const id1 = t1.workBlockId;
    sm.resetTracker();
    const t2 = sm.startTracking();
    expect(t2.workBlockId).not.toBe(id1);
    expect(t2.workBlockId.length).toBeGreaterThan(8);
  });

  it('getTracker returns current tracker state', () => {
    sm.startTracking();
    const tracker = sm.getTracker();
    expect(tracker.startTime).toBeTypeOf('number');
    expect(tracker.workBlockId).toBeTypeOf('string');
  });

  it('pauseTracking sets paused state with timestamp, no accumulatedPauseTime', () => {
    sm.startTracking();
    const tracker = sm.pauseTracking();
    expect(tracker.isPaused).toBe(true);
    expect(tracker.pauseStart).toBeTypeOf('number');
    expect(tracker).not.toHaveProperty('accumulatedPauseTime');
  });

  it('resumeTracking clears pause but does not track accumulatedPauseTime', () => {
    sm.startTracking();
    sm.pauseTracking();
    const tracker = sm.resumeTracking();
    expect(tracker.isPaused).toBe(false);
    expect(tracker.pauseStart).toBeNull();
    expect(tracker).not.toHaveProperty('accumulatedPauseTime');
  });

  it('stopTracking returns session with workBlockId and no accumulatedPauseTimeSec', () => {
    sm.startTracking();
    const session = sm.stopTracking({ date: '2026-06-24', dayType: 'Workday' });
    expect(session.date).toBe('2026-06-24');
    expect(session.dayType).toBe('Workday');
    expect(session.startTime).toBeTypeOf('string');
    expect(session.durationSec).toBeGreaterThanOrEqual(0);
    expect(session.workBlockId).toBeTypeOf('string');
    expect(session).not.toHaveProperty('accumulatedPauseTimeSec');
    expect(sm.getTracker().startTime).toBeNull();
  });

  it('stopTracking stores bucket and workBlockId from meta', () => {
    sm.startTracking();
    const session = sm.stopTracking({ date: '2026-06-24', bucket: 'sport' });
    expect(session.bucket).toBe('sport');
    expect(session.workBlockId).toBeTypeOf('string');
  });

  it('stopTracking without active tracker returns null', () => {
    const result = sm.stopTracking({ date: '2026-06-24', dayType: 'Workday' });
    expect(result).toBeNull();
  });

  it('resetTracker clears tracker to initial state', () => {
    sm.startTracking();
    sm.resetTracker();
    const tracker = sm.getTracker();
    expect(tracker.startTime).toBeNull();
    expect(tracker.isPaused).toBe(false);
    expect(tracker.workBlockId).toBeNull();
    expect(tracker.segmentStartTime).toBeNull();
    expect(tracker.totalSavedDurationMs).toBe(0);
  });
});
