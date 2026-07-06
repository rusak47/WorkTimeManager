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
  };
}
