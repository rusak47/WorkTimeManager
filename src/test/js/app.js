import { appState } from './state.js';
import { uiManager } from './uiManager.js';
import { accessibility } from './accessibility.js';
import { sessionManager } from './sessionManager.js';
import { statsManager } from './statsManager.js';
import { configManager } from './configManager.js';
import { storageService } from './storage.js';

class WorkTimeTracker {
  constructor() {
    this.init();
  }

  init() {
    // Initialize accessibility
    accessibility.init();

    // Initialize UI
    uiManager.init();
    
    // Setup event listeners
    uiManager.setupEventListeners();

    // Load initial data
    this.loadInitialData();
  }

  async loadInitialData() {
    try {
      const sessions = sessionManager.loadSessions();
      const configs = configManager.loadConfigs();
      const markedDays = storageService.loadMarkedDays();
      
      appState.updateState({
        sessions,
        configs,
        markedDays
      });
      
      // Apply latest config
      if (configs.length > 0) {
        configManager.applyConfig(configs[0]);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WorkTimeTracker();
});
