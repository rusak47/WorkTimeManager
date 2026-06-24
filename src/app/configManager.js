import { DEFAULTS } from './constants.js';

export function createConfigManager(store) {
  function getConfigs() {
    return store.getState().configs || [];
  }

  return {
    getConfig() {
      const configs = getConfigs();
      return configs.length > 0 ? configs[0] : null;
    },

    addConfig(overrides = {}) {
      const config = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        workingHours: DEFAULTS.workingHours,
        breakDuration: DEFAULTS.breakDuration,
        weekStart: DEFAULTS.weekStart,
        salaryType: DEFAULTS.salaryType,
        salaryTaxType: DEFAULTS.salaryTaxType,
        salaryValue: DEFAULTS.salaryValue,
        salaryTax: DEFAULTS.salaryTax,
        untaxedMin: DEFAULTS.untaxedMin,
        inflationRate: DEFAULTS.inflationRate,
        darkMode: DEFAULTS.darkMode,
        ...overrides,
      };
      const configs = [config, ...getConfigs()];
      store.setState({ configs });
      return config;
    },

    restoreConfig(configId) {
      const all = getConfigs();
      const idx = all.findIndex((c) => c.id === configId);
      if (idx === -1) return null;
      const target = all[idx];
      const rest = all.filter((_, i) => i !== idx);
      store.setState({ configs: [target, ...rest] });
      return target;
    },

    resetConfig() {
      const config = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...DEFAULTS,
      };
      store.setState({ configs: [config] });
      return config;
    },

    getConfigHistory() {
      return getConfigs();
    },
  };
}
