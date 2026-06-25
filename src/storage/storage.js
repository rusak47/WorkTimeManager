const STORAGE_KEY = 'worktimemanager_state';

function hasElectronApi() {
  return typeof window !== 'undefined' && window.api && typeof window.api.saveData === 'function';
}

export const storage = {
  async loadState() {
    if (hasElectronApi()) {
      return await window.api.loadData();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async saveState(state) {
    if (hasElectronApi()) {
      return await window.api.saveData(state);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  },

  async loadCalendar(year) {
    if (hasElectronApi()) {
      return await window.api.loadCalendar(year);
    }
    try {
      const resp = await fetch(`/resources/${year}-holidays.json`);
      if (!resp.ok) return {};
      const raw = await resp.json();
      const countryKey = Object.keys(raw)[0];
      return countryKey ? raw[countryKey] : {};
    } catch {
      return {};
    }
  },
};
