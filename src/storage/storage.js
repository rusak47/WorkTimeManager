function getApi() {
  return window.api;
}

export const storage = {
  async loadState() {
    return await getApi().loadData();
  },

  async saveState(state) {
    return await getApi().saveData(state);
  },

  async loadCalendar(year) {
    return await getApi().loadCalendar(year);
  },
};
