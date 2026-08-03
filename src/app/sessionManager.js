import { CURRENT_SESSION_INIT } from './constants.js';
import * as utils from '../js/utils.js';

function generateWorkBlockId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

export function createSessionManager(store) {
  function getSessions() {
    return store.getState().sessions || [];
  }

  function getTracker() {
    return store.getState().tracker || { ...CURRENT_SESSION_INIT };
  }

  return {
    getSessions,

    addSession(data) {
      const defaults = {
        id: Date.now(),
        notes: '',
        tags: ['work'],
        mood: 5,
      };
      const session = { ...defaults, ...data };
      store.setState({ sessions: [session, ...getSessions()] });
      return session;
    },

    updateSession(id, data) {
      const sessions = getSessions();
      const idx = sessions.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      const updated = { ...sessions[idx], ...data };
      const next = [...sessions];
      next[idx] = updated;
      store.setState({ sessions: next });
      return updated;
    },

    deleteSession(id) {
      const sessions = getSessions();
      const next = sessions.filter((s) => s.id !== id);
      if (next.length === sessions.length) return false;
      store.setState({ sessions: next });
      return true;
    },

    deleteSessionsByWorkBlockId(workBlockId) {
      const sessions = getSessions();
      const next = sessions.filter((s) => s.workBlockId !== workBlockId);
      if (next.length === sessions.length) return 0;
      const removed = sessions.length - next.length;
      store.setState({ sessions: next });
      return removed;
    },

    resetSessions() {
      store.setState({ sessions: [] });
    },

    getSessionsByFilter(filters = {}) {
      return getSessions().filter((s) => {
        if (filters.date && s.date !== filters.date) return false;
        if (filters.year && !s.date.startsWith(filters.year)) return false;
        if (filters.month) {
          const prefix = filters.year ? `${filters.year}-` : '';
          if (!s.date.startsWith(`${prefix}${filters.month}`)) return false;
        }
        if (filters.dayType && s.dayType !== filters.dayType) return false;
        if (filters.tag && !s.tags.includes(filters.tag)) return false;
        if (filters.mood && s.mood !== filters.mood) return false;
        return true;
      });
    },

    // Tracker
    getTracker,

    startTracking(options = {}) {
      const now = Date.now();
      const tracker = {
        startTime: now,
        isPaused: false,
        pauseStart: null,
        segmentStartTime: now,
        workBlockId: generateWorkBlockId(),
        totalSavedDurationMs: 0,
        isBreak: options.isBreak || false,
      };
      store.setState({ tracker });
      return tracker;
    },

    pauseTracking() {
      const tracker = getTracker();
      if (!tracker.startTime) return tracker;
      const updated = { ...tracker, isPaused: true, pauseStart: Date.now() };
      store.setState({ tracker: updated });
      return updated;
    },

    resumeTracking() {
      const tracker = getTracker();
      if (!tracker.startTime) return tracker;
      const now = Date.now();
      const updated = {
        ...tracker,
        isPaused: false,
        pauseStart: null,
        segmentStartTime: now,
      };
      store.setState({ tracker: updated });
      return updated;
    },

    stopTracking(meta = {}) {
      const tracker = getTracker();
      if (!tracker.startTime) return null;
      const now = Date.now();
      const segmentStart = tracker.segmentStartTime || tracker.startTime;
      const durationSec = Math.max(0, Math.floor((now - segmentStart) / 1000));

      const session = {
        id: Date.now(),
        date: meta.date || utils.formatDate(new Date()),
        startTime: new Date(segmentStart).toISOString(),
        endTime: new Date(now).toISOString(),
        duration: utils.formatDuration(durationSec),
        durationSec,
        dayType: meta.dayType || 'Workday',
        notes: meta.notes || '',
        tags: meta.tags || (tracker.isBreak ? ['rest'] : ['work']),
        mood: meta.mood !== undefined ? meta.mood : 5,
        bucket: meta.bucket,
        workBlockId: tracker.workBlockId,
        isBreak: tracker.isBreak,
      };

      store.setState({
        tracker: { ...CURRENT_SESSION_INIT },
        sessions: [session, ...getSessions()],
      });

      return session;
    },

    resetTracker() {
      store.setState({ tracker: { ...CURRENT_SESSION_INIT } });
    },

    injectRest(restStartMs, durationSec, formValues = {}, breakValues = {}) {
      const tracker = getTracker();
      const now = Date.now();
      if (!tracker.startTime) return { error: 'No active session' };
      if (tracker.isPaused) return { error: 'Session is paused, resume before injecting rest' };
      if (!Number.isFinite(restStartMs) || restStartMs < tracker.segmentStartTime) {
        return { error: 'Rest start must be after the current segment start' };
      }
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        return { error: 'Duration must be positive' };
      }
      const restEndMs = restStartMs + durationSec * 1000;
      if (restEndMs > now) return { error: 'Break end is in the future' };
      const workDurationSec = Math.floor((restStartMs - tracker.segmentStartTime) / 1000);

      const workSegment = {
        id: Date.now(),
        date: utils.formatDate(new Date(tracker.segmentStartTime)),
        startTime: new Date(tracker.segmentStartTime).toISOString(),
        endTime: new Date(restStartMs).toISOString(),
        duration: utils.formatDuration(workDurationSec),
        durationSec: workDurationSec,
        dayType: formValues.dayType || 'Workday',
        notes: formValues.notes || '',
        tags: formValues.tags || ['work'],
        mood: formValues.mood !== undefined ? formValues.mood : 5,
        bucket: formValues.bucket,
        workBlockId: tracker.workBlockId,
        isBreak: false,
      };
      const breakSession = {
        id: Date.now() + 1,
        date: utils.formatDate(new Date(restStartMs)),
        startTime: new Date(restStartMs).toISOString(),
        endTime: new Date(restEndMs).toISOString(),
        duration: utils.formatDuration(durationSec),
        durationSec,
        dayType: breakValues.dayType || 'Workday',
        notes: breakValues.notes || 'Break session',
        tags: breakValues.tags || ['rest'],
        mood: breakValues.mood !== undefined ? breakValues.mood : 5,
        workBlockId: tracker.workBlockId,
        isBreak: true,
      };
      store.setState({
        sessions: [breakSession, workSegment, ...getSessions()],
        tracker: {
          ...tracker,
          totalSavedDurationMs: tracker.totalSavedDurationMs + (restStartMs - tracker.segmentStartTime),
          segmentStartTime: restEndMs,
        },
      });
      return { workSession: workSegment, breakSession };
    },
  };
}
