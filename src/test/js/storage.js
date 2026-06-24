export const storageService = {
  // Generic methods
  getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return defaultValue;
    }
  },

  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
      if (error.name === 'QuotaExceededError') {
        this.handleStorageFull();
      }
      return false;
    }
  },

  handleStorageFull() {
    // Implement storage cleanup strategy
    alert('Local storage is full. Some data may not be saved.');
  },

  // App-specific methods
  saveSessions(sessions) {
    return this.setItem('workTimeSessions', sessions);
  },

  loadSessions() {
    return this.getItem('workTimeSessions', []);
  },

  saveConfigs(configs) {
    return this.setItem('workTimeConfigs', configs);
  },

  loadConfigs() {
    return this.getItem('workTimeConfigs', []);
  },

  saveMarkedDays(markedDays) {
    return this.setItem('workTimeMarkedDays', markedDays);
  },

  loadMarkedDays() {
    return this.getItem('workTimeMarkedDays', []);
  },

  saveTags(tags) {
    return this.setItem('workTimeTags', tags);
  },

  loadTags() {
    return this.getItem('workTimeTags', []);
  },

  exportData() {
    const { sessions, configs, markedDays } = appState.getState();
    
    const data = {
      sessions,
      configs,
      markedDays,
      exportedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const dataUrl = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `work-time-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.sessions) appState.updateState({ sessions: data.sessions });
      if (data.configs) appState.updateState({ configs: data.configs });
      if (data.markedDays) appState.updateState({ markedDays: data.markedDays });
      
      if (data.sessions) this.saveSessions(data.sessions);
      if (data.configs) this.saveConfigs(data.configs);
      if (data.markedDays) this.saveMarkedDays(data.markedDays);
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
};
