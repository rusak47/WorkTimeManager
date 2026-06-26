export const DATA_VERSION = '1.1';

export const DEFAULT_TAGS = ['work', 'rest'];

export const PRESET_TAGS = [
  'sleep', 'read', 'study', 'socialize',
  'write', 'sport', 'music', 'hygiene',
  'tv', 'online', 'home tasks',
];

export const DAY_TYPES = ['Workday', 'Weekend', 'Holiday', 'Vacation'];

export const CHART_COLORS = {
  primary: 'rgba(59, 130, 246, 0.8)',
  secondary: 'rgba(16, 185, 129, 0.8)',
  tertiary: 'rgba(249, 115, 22, 0.8)',
  quaternary: 'rgba(139, 92, 246, 0.8)',
  background: 'rgba(59, 130, 246, 0.2)',
  border: 'rgba(59, 130, 246, 1)',
  gridLines: 'rgba(229, 231, 235, 1)',
  text: 'rgba(75, 85, 99, 1)',
};

export const SECONDS_PER_HOUR = 3600;

export const DEFAULTS = {
  workingHours: 8,
  breakDuration: 60,
  weekStart: 1,
  salaryType: 'hourly',
  salaryTaxType: 'net',
  salaryValue: 15.00,
  salaryTax: 20,
  untaxedMin: 500.00,
  inflationRate: 2.5,
  darkMode: false,
  mood: 5,
};

export const STORAGE_KEYS = {
  sessions: 'workTimeSessions',
  configs: 'workTimeConfigs',
  markedDays: 'workTimeMarkedDays',
  tags: 'workTimeTags',
  darkMode: 'darkMode',
};

export const CURRENT_SESSION_INIT = {
  startTime: null,
  isPaused: false,
  pauseStart: null,
  accumulatedPauseTime: 0,
  isBreak: false,
};

export const DEFAULT_BACKUP_INTERVAL_MS = 300000; // 5 minutes

export const STATS_PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];
