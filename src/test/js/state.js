import { defaultTags, presetTags } from './constants.js';

class AppState {
  constructor() {
    this.state = {
      sessions: [],
      breakSessions: [],
      configs: [],
      markedDays: [],
      tags: this.loadInitialTags(),
      currentTab: 'tracker',
      currentStatsPeriod: 'daily',
      darkMode: localStorage.getItem('darkMode') === 'true',
      sessionStartTime: null,
      sessionPauseTime: 0,
      isSessionPaused: false,
      sessionToDelete: null
    };
  }

  loadInitialTags() {
    const savedTags = localStorage.getItem('workTimeTags');
    if (savedTags) return JSON.parse(savedTags);
    
    return [
      ...defaultTags.map(tag => ({ name: tag, isDefault: true, isEnabled: true, isCustom: false })),
      ...presetTags.map(tag => ({ name: tag, isDefault: false, isEnabled: true, isCustom: false }))
    ];
  }

  getState() {
    return this.state;
  }

  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners(updates);
  }

  addListener(callback) {
    this.listeners = this.listeners || [];
    this.listeners.push(callback);
  }

  notifyListeners(updates) {
    if (!this.listeners) return;
    this.listeners.forEach(callback => callback(updates));
  }
}

export const appState = new AppState();