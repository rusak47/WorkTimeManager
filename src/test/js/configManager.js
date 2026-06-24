import { appState } from './state.js';
import { storageService } from './storage.js';

export const configManager = {
  loadConfigs() {
    const configs = storageService.loadConfigs();
    if (configs.length === 0) {
      return this.createDefaultConfig();
    }
    appState.updateState({ configs });
    return configs;
  },

  createDefaultConfig() {
    const defaultConfig = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      workingHours: 8,
      breakDuration: 60,
      weekStart: 1,
      salaryType: 'hourly',
      salaryTaxType: 'net',
      salaryValue: 15.00,
      salaryTax: 20,
      untaxedMin: 500.00,
      inflationRate: 2.5,
      darkMode: false
    };
    
    const configs = [defaultConfig];
    storageService.saveConfigs(configs);
    appState.updateState({ configs });
    return configs;
  },

  saveConfig(newConfig) {
    const { configs } = appState.getState();
    const updatedConfig = {
      ...newConfig,
      id: Date.now(),
      timestamp: new Date().toISOString()
    };
    
    const updatedConfigs = [updatedConfig, ...configs];
    appState.updateState({ configs: updatedConfigs });
    storageService.saveConfigs(updatedConfigs);
    return updatedConfig;
  },

  applyConfig(config) {
    appState.updateState({
      darkMode: config.darkMode
    });
    
    if (config.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
};