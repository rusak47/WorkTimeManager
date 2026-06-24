export function createStore(initialState) {
  const initial = Object.freeze({ ...initialState });
  let state = { ...initial };
  const listeners = new Set();

  return {
    getState() {
      return { ...state };
    },

    setState(partial) {
      const keys = Object.keys(partial);
      if (keys.length === 0) return;
      let changed = false;
      for (const key of keys) {
        if (state[key] !== partial[key]) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...partial };
      for (const listener of listeners) {
        listener(state);
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    reset() {
      state = { ...initial };
      for (const listener of listeners) {
        listener(state);
      }
    },
  };
}
