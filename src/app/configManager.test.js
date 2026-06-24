import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './state.js';
import { createConfigManager } from './configManager.js';

describe('configManager', () => {
  let store;
  let configManager;

  beforeEach(() => {
    store = createStore({ configs: [] });
    configManager = createConfigManager(store);
  });

  it('getConfig returns null when no configs exist', () => {
    expect(configManager.getConfig()).toBeNull();
  });

  it('addConfig creates a config with defaults merged with overrides', () => {
    const cfg = configManager.addConfig({ workingHours: 7 });
    expect(cfg.workingHours).toBe(7);
    expect(cfg.breakDuration).toBe(60);
    expect(cfg.salaryValue).toBe(15.00);
    expect(cfg.id).toBeTypeOf('number');
    expect(cfg.timestamp).toBeTypeOf('string');
  });

  it('getConfig returns the latest config after add', () => {
    configManager.addConfig({ workingHours: 6 });
    const cfg = configManager.getConfig();
    expect(cfg.workingHours).toBe(6);
  });

  it('addConfig prepends to configs array', () => {
    configManager.addConfig({ workingHours: 8 });
    configManager.addConfig({ workingHours: 7 });
    const all = store.getState().configs;
    expect(all[0].workingHours).toBe(7);
    expect(all[1].workingHours).toBe(8);
  });

  it('resetConfig creates a single default config', () => {
    configManager.addConfig({ workingHours: 7 });
    configManager.resetConfig();
    const cfg = configManager.getConfig();
    expect(cfg.workingHours).toBe(8);
    expect(store.getState().configs.length).toBe(1);
  });

  it('restoreConfig promotes a historical config to latest', () => {
    const c1 = configManager.addConfig({ workingHours: 8, id: 1 });
    const c2 = configManager.addConfig({ workingHours: 7, id: 2 });
    configManager.restoreConfig(1);
    const cfg = configManager.getConfig();
    expect(cfg.workingHours).toBe(8);
    expect(cfg.id).toBe(1);
  });

  it('getConfigHistory returns all configs', () => {
    configManager.addConfig({ workingHours: 8 });
    configManager.addConfig({ workingHours: 7 });
    const history = configManager.getConfigHistory();
    expect(history.length).toBe(2);
  });
});
