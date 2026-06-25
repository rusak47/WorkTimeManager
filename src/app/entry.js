import { createStore } from './state.js';
import { createEventHandlers, INITIAL_STATE } from './app.js';
import { createUIManager } from './uiManager.js';
import { createAccessibility } from './accessibility.js';
import { createSessionManager } from './sessionManager.js';
import { createConfigManager } from './configManager.js';
import { createStatsManager } from './statsManager.js';
import { storage } from '../storage/storage.js';

const store = createStore(INITIAL_STATE);
const sessionManager = createSessionManager(store);
const configManager = createConfigManager(store);
const statsManager = createStatsManager(store);
const ui = createUIManager(store);
const a11y = createAccessibility();

const app = createEventHandlers({
  store,
  storage,
  sessionManager,
  configManager,
  statsManager,
  ui,
  a11y,
});

app.init();
