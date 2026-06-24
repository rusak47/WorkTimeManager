import { appState } from './state.js';
import { storageService } from './storage.js';
import { formatDate, formatTime, formatDuration } from './utils.js';

export const sessionManager = {
  timerInterval: null,

  startSession() {
    const startTime = new Date();
    appState.updateState({ currentSession: { startTime } });
    console.log('Session started at', startTime);
  },

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      const { sessionStartTime } = appState.getState();
      if (!sessionStartTime) return;
      
      const now = new Date();
      const duration = Math.floor((now - sessionStartTime) / 1000);
      
      // Update UI through state (UI manager will listen)
      appState.updateState({ currentDuration: duration });
    }, 1000);
  },

  pauseSession() {
    console.log('Pausing session');
    const { isSessionPaused, sessionStartTime } = appState.getState();
    
    if (!sessionStartTime) return;
    
    if (isSessionPaused) {
      this.resumeSession();
    } else {
      this.pauseCurrentSession();
    }
  },

  pauseCurrentSession() {
    const now = new Date();
    appState.updateState({
      isSessionPaused: true,
      sessionPauseTime: now
    });
    
    this.clearTimer();
    this.saveBreakSession();
  },

  resumeSession() {
    const { sessionPauseTime, sessionStartTime } = appState.getState();
    const pauseDuration = (new Date() - sessionPauseTime) / 1000;
    
    appState.updateState({
      sessionStartTime: new Date(sessionStartTime.getTime() + pauseDuration * 1000),
      isSessionPaused: false,
      sessionPauseTime: 0
    });
    
    this.startTimer();
  },

  loadSessions() {
    const sessions = storageService.loadSessions();
    appState.updateState({ sessions });
    return sessions;
  },

  saveBreakSession() {
    const { sessionPauseTime, sessions } = appState.getState();
    const now = new Date();
    const pauseDuration = (now - sessionPauseTime) / 1000;
    
    const breakSession = {
      id: Date.now(),
      date: formatDate(sessionPauseTime),
      startTime: sessionPauseTime.toISOString(),
      endTime: now.toISOString(),
      duration: formatDuration(pauseDuration),
      durationSec: pauseDuration,
      notes: 'Break session',
      dayType: this.getDayType(formatDate(sessionPauseTime)),
      tags: ['rest'],
      mood: 5,
      isBreak: true
    };
    
    const updatedSessions = [breakSession, ...sessions];
    appState.updateState({ sessions: updatedSessions });
    storageService.saveSessions(updatedSessions);
  },

  editSession(sessionId, sessionData) {
    const { sessions } = appState.getState();
    const index = sessions.findIndex(s => s.id === sessionId);
    
    if (index !== -1) {
      const updatedSession = {
        ...sessions[index],
        ...sessionData
      };
      
      const updatedSessions = [...sessions];
      updatedSessions[index] = updatedSession;
      
      appState.updateState({ sessions: updatedSessions });
      storageService.saveSessions(updatedSessions);
      return updatedSession;
    }
    
    return null;
  },

  deleteSession(sessionId) {
    const { sessions } = appState.getState();
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    
    appState.updateState({ sessions: updatedSessions });
    storageService.saveSessions(updatedSessions);
  },

  stopSession() {
    const { currentSession } = appState.getState();
    if (!currentSession || !currentSession.startTime) {
      console.error('No session to stop');
      return;
    }

    const endTime = new Date();
    const duration = Math.floor((endTime - new Date(currentSession.startTime)) / 1000);
    const session = {
      ...currentSession,
      endTime,
      duration,
    };

    const { sessions } = appState.getState();
    appState.updateState({ sessions: [session, ...sessions], currentSession: null });
    console.log('Session stopped at', endTime);
  },

  saveSession(session) {
    const { sessions } = appState.getState();
    appState.updateState({ sessions: [session, ...sessions] });
    console.log('Session saved:', session);
  },

  getDayType(dateStr) {
    const { markedDays } = appState.getState();
    const markedDay = markedDays.find(d => d.date === dateStr);
    if (markedDay) return markedDay.dayType;
    
    const date = new Date(dateStr);
    return (date.getDay() === 0 || date.getDay() === 6) ? 'Weekend' : 'Workday';
  },

  clearTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
  }
  
};
