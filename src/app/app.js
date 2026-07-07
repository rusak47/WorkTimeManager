import * as utils from '../js/utils.js';
import { createCalendarView } from './calendarView.js';
import { DEFAULT_BACKUP_INTERVAL_MS, CURRENT_SESSION_INIT, DEFAULT_TAGS } from './constants.js';
import { resolveSessionBucket } from './tagManager.js';

const INITIAL_STATE = Object.freeze({
  sessions: [],
  configs: [],
  markedDays: [],
  tags: [],
  currentTab: 'tracker',
  currentStatsPeriod: 'daily',
  darkMode: false,
  backupIntervalMs: 300000,
  tracker: { startTime: null, isPaused: false, pauseStart: null, accumulatedPauseTime: 0, isBreak: false },
  tagBuckets: {},
});

function getDayType(dateStr, state) {
  const marked = state.markedDays.find(d => d.date === dateStr);
  if (marked) return marked.dayType;
  const date = new Date(dateStr);
  return (date.getDay() === 0 || date.getDay() === 6) ? 'Weekend' : 'Workday';
}

export { INITIAL_STATE };

export function createEventHandlers(deps) {
  const { store, storage, sessionManager, configManager, statsManager, ui, a11y } = deps;
  let timerInterval = null;
  let backupInterval = null;
  let calendarService = null;
  let calendarView = null;

  function loadStateFromStorage(state) {
    if (state && state.sessions) store.setState({ sessions: state.sessions });
    if (state && state.configs) store.setState({ configs: state.configs });
    if (state && state.markedDays) store.setState({ markedDays: state.markedDays });
    if (state && state.tags) store.setState({ tags: state.tags });
    if (state && state.darkMode !== undefined) store.setState({ darkMode: state.darkMode });
    if (state && state.backupIntervalMs) store.setState({ backupIntervalMs: state.backupIntervalMs });
    if (state && state.tagBuckets) store.setState({ tagBuckets: state.tagBuckets });
    if (state && state.tracker && state.tracker.startTime) {
      const age = Date.now() - state.tracker.startTime;
      if (age < 24 * 3600 * 1000) {
        store.setState({ tracker: state.tracker });
      }
    }
  }

  async function loadData() {
    try {
      const saved = await storage.loadState();
      if (saved) {
        if (!saved._migrationVersion) {
          const { migrateSessionTags } = await import('../../migration/v1.0.0-to-v1.1.0.js');
          const migrated = { ...saved, _migrationVersion: '1.1.0' };
          if (migrated.sessions) {
            migrated.sessions = migrateSessionTags(migrated.sessions);
          }
          await storage.saveState(migrated);
          loadStateFromStorage(migrated);
        } else {
          loadStateFromStorage(saved);
        }
      } else {
        const s = store.getState();
        if (s.configs.length === 0) {
          configManager.addConfig();
        }
        if (s.tags.length === 0) {
          const { DEFAULT_TAGS, DEFAULT_BUCKET_MAP } = await import('./constants.js');
          const subtagNames = [...new Set(Object.values(DEFAULT_BUCKET_MAP).flat())];
          const tags = [
            ...DEFAULT_TAGS.map(t => ({ name: t, isDefault: true, isEnabled: true, isCustom: false })),
            ...subtagNames.map(t => ({ name: t, isDefault: false, isEnabled: true, isCustom: false })),
          ];
          store.setState({ tags });
        }
      }
      const s = store.getState();
      const { DEFAULT_TAGS, DEFAULT_BUCKET_MAP } = await import('./constants.js');
      const allDefaultKeysPresent = s.tagBuckets
        && DEFAULT_TAGS.every(t => Object.prototype.hasOwnProperty.call(s.tagBuckets, t));
      if (!allDefaultKeysPresent) {
        store.setState({ tagBuckets: { ...DEFAULT_BUCKET_MAP } });
      }
      if (s.tags.length > 0 && typeof s.tags[0] === 'string') {
        const subtagNames = [...new Set(Object.values(DEFAULT_BUCKET_MAP).flat())];
        store.setState({
          tags: [
            ...DEFAULT_TAGS.map(t => ({ name: t, isDefault: true, isEnabled: true, isCustom: false })),
            ...subtagNames.map(t => ({ name: t, isDefault: false, isEnabled: s.tags.includes(t), isCustom: false })),
          ],
        });
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  async function saveState() {
    const s = store.getState();
    const tracker = { ...s.tracker };
    if (tracker.startTime) {
      const notesEl = document.getElementById('notes');
      if (notesEl) tracker.backupNotes = notesEl.value;
      const moodEl = document.getElementById('current-session-mood-input');
      if (moodEl) tracker.backupMood = moodEl.value;
    }
    try {
      await storage.saveState({
        sessions: s.sessions,
        configs: s.configs,
        markedDays: s.markedDays,
        tags: s.tags,
        darkMode: s.darkMode,
        tracker,
        backupIntervalMs: s.backupIntervalMs,
        tagBuckets: s.tagBuckets,
      });
    } catch (err) {
      console.error('Failed to save data:', err);
    }
  }

  function persistAndRender() {
    saveState();
    ui.renderRecentSessions();
    ui.renderAllSessions();
    ui.updateTodayTotal();
    ui.updateTodayStatus(store.getState(), calendarService);
    ui.populateYearSelector();
    const s = store.getState();
    if (s.currentTab === 'stats') ui.updateStatistics();
  }

  ui.setOnTagBucketsChange(saveState);
  ui.setOnDeleteCustomTag(deleteCustomTag);

  function readTrackerFormValues() {
    const notesInput = document.getElementById('notes');
    const moodInput = document.getElementById('current-session-mood-input');
    const selectedTags = [];
    let bucket;
    document.querySelectorAll('#current-session-tags .tag-chip.selected').forEach(el => {
      selectedTags.push(el.dataset.tag);
      const parentRow = el.closest('.picker-row-1');
      if (parentRow) bucket = el.dataset.tag;
    });
    if (selectedTags.length === 0) selectedTags.push('work');
    const notesValue = notesInput ? notesInput.value.trim() : '';
    const syncResult = syncHashtagTags(notesValue, bucket);
    if (syncResult) {
      syncResult.foundTags.forEach(t => { if (!selectedTags.includes(t)) selectedTags.push(t); });
    }
    return {
      notes: syncResult ? syncResult.cleanedNotes : notesValue,
      tags: selectedTags,
      mood: moodInput ? parseFloat(moodInput.value) : 5,
      bucket,
    };
  }

  function startSession(bucket) {
    if (bucket) {
      ui.initializeCurrentSessionTags(bucket);
    }
    clearInterval(timerInterval);
    clearInterval(backupInterval);
    sessionManager.startTracking();
    ui.updateButtonStates(true);
    timerInterval = setInterval(ui.updateTimerDisplay, 1000);
    const s = store.getState();
    const intervalMs = s.backupIntervalMs || DEFAULT_BACKUP_INTERVAL_MS;
    backupInterval = setInterval(saveState, intervalMs);
    const notes = document.getElementById('session-notes');
    if (notes) notes.classList.remove('hidden');
  }

  function stopSession() {
    const s = store.getState();
    const tracker = s.tracker;
    if (!tracker.startTime) return;
    clearInterval(timerInterval);
    clearInterval(backupInterval);
    backupInterval = null;

    let lastSegment = null;

    if (tracker.isPaused) {
      const breakDuration = Math.floor((Date.now() - tracker.pauseStart) / 1000);
      if (breakDuration >= 2) {
        const d = new Date(tracker.pauseStart);
        const breakSession = {
          id: Date.now(),
          date: utils.formatDate(d),
          startTime: d.toISOString(),
          endTime: new Date().toISOString(),
          duration: utils.formatDuration(breakDuration),
          durationSec: breakDuration,
          notes: 'Break session',
          dayType: getDayType(utils.formatDate(d), s),
          tags: ['rest'],
          mood: 5,
          workBlockId: tracker.workBlockId,
          isBreak: true,
        };
        sessionManager.addSession(breakSession);
      }
      store.setState({
        tracker: {
          ...tracker,
          isPaused: false,
          pauseStart: null,
        },
      });
      const sessions = store.getState().sessions;
      const prevWork = [...sessions].find(ses => !ses.isBreak && ses.workBlockId === tracker.workBlockId);
      if (prevWork) lastSegment = prevWork;
    } else {
      const now = Date.now();
      const segmentDuration = Math.floor((now - tracker.segmentStartTime) / 1000);
      const d = new Date(tracker.segmentStartTime);
      const formValues = readTrackerFormValues();
      const workSegment = {
        id: Date.now(),
        date: utils.formatDate(d),
        startTime: d.toISOString(),
        endTime: new Date(now).toISOString(),
        duration: utils.formatDuration(segmentDuration),
        durationSec: segmentDuration,
        dayType: getDayType(utils.formatDate(d), s),
        workBlockId: tracker.workBlockId,
        isBreak: false,
        ...formValues,
      };
      sessionManager.addSession(workSegment);
      lastSegment = workSegment;
    }

    const durEl = document.getElementById('active-duration');
    if (durEl) durEl.classList.remove('blink');
    const startTimeInput = document.getElementById('current-session-start-time-input');
    const endTimeInput = document.getElementById('current-session-end-time-input');
    const restDurationInput = document.getElementById('current-session-accumulated-rest-duration-input');
    const trackerSessionIdInput = document.getElementById('tracker-session-id');
    if (startTimeInput && lastSegment) startTimeInput.value = new Date(lastSegment.startTime).getTime().toString();
    if (endTimeInput && lastSegment) endTimeInput.value = new Date(lastSegment.endTime).getTime().toString();
    if (restDurationInput) restDurationInput.value = '0';
    if (trackerSessionIdInput && lastSegment) trackerSessionIdInput.value = lastSegment.id.toString();
    sessionManager.resetTracker();
    if (durEl) durEl.textContent = '00:00:00';
    ui.updateButtonStates(false);
    persistAndRender();
    const notes = document.getElementById('notes');
    if (notes) notes.value = '';
    const moodInput = document.getElementById('current-session-mood-input');
    if (moodInput) moodInput.value = '5';
    const notesContainer = document.getElementById('session-notes');
    if (notesContainer) notesContainer.classList.add('hidden');
  }

  function togglePause() {
    const s = store.getState();
    const tracker = s.tracker;
    if (!tracker.startTime) return;
    if (tracker.isPaused) {
      const breakDuration = Math.floor((Date.now() - tracker.pauseStart) / 1000);
      if (breakDuration >= 2) {
        const d = new Date(tracker.pauseStart);
        const breakSession = {
          id: Date.now(),
          date: utils.formatDate(d),
          startTime: d.toISOString(),
          endTime: new Date().toISOString(),
          duration: utils.formatDuration(breakDuration),
          durationSec: breakDuration,
          notes: 'Break session',
          dayType: getDayType(utils.formatDate(d), s),
          tags: ['rest'],
          mood: 5,
          workBlockId: tracker.workBlockId,
          isBreak: true,
        };
        sessionManager.addSession(breakSession);
      }
      sessionManager.resumeTracking();
      const pauseBtn = document.getElementById('pause-btn');
      if (pauseBtn) pauseBtn.innerHTML = '<i class="fas fa-pause sm:mr-2"></i> <span class="hidden sm:inline">Pause</span>';
    } else {
      const now = Date.now();
      const segmentDuration = Math.floor((now - tracker.segmentStartTime) / 1000);
      if (segmentDuration >= 2) {
        const d = new Date(tracker.segmentStartTime);
        const formValues = readTrackerFormValues();
        const workSegment = {
          id: Date.now(),
          date: utils.formatDate(d),
          startTime: d.toISOString(),
          endTime: new Date(now).toISOString(),
          duration: utils.formatDuration(segmentDuration),
          durationSec: segmentDuration,
          dayType: getDayType(utils.formatDate(d), s),
          workBlockId: tracker.workBlockId,
          isBreak: false,
          ...formValues,
        };
        sessionManager.addSession(workSegment);
      }
      const elapsed = now - tracker.segmentStartTime;
      store.setState({
        tracker: {
          ...tracker,
          isPaused: true,
          pauseStart: now,
          totalSavedDurationMs: tracker.totalSavedDurationMs + Math.max(0, elapsed),
        },
      });
      const pauseBtn = document.getElementById('pause-btn');
      if (pauseBtn) pauseBtn.innerHTML = '<i class="fas fa-play sm:mr-2"></i> <span class="hidden sm:inline">Resume</span>';
    }
    ui.updateTimerDisplay();
    persistAndRender();
  }

  function showAddSessionModal() {
    ui.showAddSessionModal();
  }

  function hideSessionModal() {
    ui.hideSessionModal();
  }

  function handleSessionFormSubmit(e) {
    e.preventDefault();
    const s = store.getState();
    const sessionIdEl = document.getElementById('session-id');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const dayTypeInput = document.getElementById('day-type');
    const modalNotes = document.getElementById('modal-notes');
    const moodInput = document.getElementById('session-mood');
    if (!startTimeInput || !endTimeInput) return;
    const sessionId = sessionIdEl ? sessionIdEl.value : '';
    const startTime = new Date(startTimeInput.value);
    const endTime = new Date(endTimeInput.value);
    if (endTime <= startTime) {
      alert('End time must be after start time');
      return;
    }
    const existingSession = sessionId ? s.sessions.find(sess => sess.id === parseInt(sessionId, 10)) : null;
    const accumulatedPauseMs = existingSession ? (existingSession.accumulatedPauseTimeSec || 0) * 1000 : 0;
    const duration = Math.max(0, Math.floor((endTime - startTime - accumulatedPauseMs) / 1000));
    const dayType = dayTypeInput ? dayTypeInput.value : 'Workday';
    let notes = modalNotes ? modalNotes.value.trim() : '';
    const selectedTags = [];
    let bucket;
    const chips = document.querySelectorAll('#tags-container .tag-chip.selected');
    if (chips.length > 0) {
      chips.forEach(el => {
        selectedTags.push(el.dataset.tag);
        const parentRow = el.closest('.picker-row-1');
        if (parentRow) bucket = el.dataset.tag;
      });
    } else {
      document.querySelectorAll('#tags-container .tag.selected').forEach(el => {
        selectedTags.push(el.dataset.tag);
      });
    }
    const isBreak = selectedTags.includes('rest') && !selectedTags.includes('work');
    if (!isBreak && selectedTags.length === 0) selectedTags.unshift('work');
    const syncResult = syncHashtagTags(notes, bucket);
    if (syncResult) {
      syncResult.foundTags.forEach(t => { if (!selectedTags.includes(t)) selectedTags.push(t); });
      notes = syncResult.cleanedNotes;
    }
    const mood = moodInput ? parseFloat(moodInput.value) : 5;
    if (sessionId) {
      sessionManager.updateSession(parseInt(sessionId, 10), {
        date: utils.formatDate(startTime),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: utils.formatDuration(duration),
        durationSec: duration,
        dayType,
        notes,
        tags: selectedTags,
        mood,
        isBreak,
        bucket,
      });
    } else {
      sessionManager.addSession({
        id: Date.now(),
        date: utils.formatDate(startTime),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: utils.formatDuration(duration),
        durationSec: duration,
        dayType,
        notes,
        tags: selectedTags,
        mood,
        isBreak,
        bucket,
      });
    }
    ui.hideSessionModal();
    persistAndRender();
  }

  function editSession(sessionId) {
    const s = store.getState();
    const session = s.sessions.find(sess => sess.id === sessionId);
    if (!session) return;
    const titleEl = document.getElementById('modal-title');
    const sessionIdEl = document.getElementById('session-id');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const dayTypeInput = document.getElementById('day-type');
    const modalNotes = document.getElementById('modal-notes');
    const moodRating = document.getElementById('mood-rating');
    const moodInput = document.getElementById('session-mood');
    const moodValue = document.getElementById('mood-value');
    if (titleEl) titleEl.textContent = 'Edit Session';
    if (sessionIdEl) sessionIdEl.value = session.id;
    if (startTimeInput) startTimeInput.value = utils.formatDateTimeLocal(new Date(session.startTime));
    if (endTimeInput) endTimeInput.value = utils.formatDateTimeLocal(new Date(session.endTime));
    if (dayTypeInput) dayTypeInput.value = session.dayType || 'Workday';
    if (modalNotes) modalNotes.value = session.notes || '';
    const bucket = session.bucket || resolveSessionBucket(session);
    const sessionTags = session.tags || [];
    const defaultsInTags = sessionTags.filter(t => DEFAULT_TAGS.includes(t));
    if (defaultsInTags.length > 1) {
      const existingWarning = document.getElementById('multiple-defaults-warning');
      if (!existingWarning) {
        const warning = document.createElement('div');
        warning.id = 'multiple-defaults-warning';
        warning.className = 'text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded mb-2';
        warning.textContent = `Session has multiple bucket tags (${defaultsInTags.join(', ')}). Only one bucket can be active.`;
        const tagsContainer = document.getElementById('tags-container');
        if (tagsContainer && tagsContainer.parentNode) {
          tagsContainer.parentNode.insertBefore(warning, tagsContainer);
        }
      }
    }
    ui.initializeSessionModalTags(bucket, sessionTags);
    const rating = session.mood || 5;
    if (moodRating) moodRating.dataset.rating = rating;
    if (moodInput) moodInput.value = rating;
    if (moodValue) moodValue.textContent = rating + '.0';
    ui.createStars();
    const modal = document.getElementById('session-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function showDeleteModal(sessionId) {
    ui.showDeleteModal(sessionId);
  }

  function hideDeleteModal() {
    ui.hideDeleteModal();
  }

  function confirmDeleteSession() {
    const modal = document.getElementById('delete-modal');
    const sessionId = modal ? modal.dataset.sessionId : null;
    if (!sessionId) return;
    sessionManager.deleteSession(parseInt(sessionId, 10));
    ui.hideDeleteModal();
    persistAndRender();
  }

  function applyFilters() {
    const dateFilter = document.getElementById('date-filter');
    const monthFilter = document.getElementById('month-filter');
    const yearFilter = document.getElementById('year-filter');
    const dayTypeFilter = document.getElementById('day-type-filter');
    const s = store.getState();
    let filtered = [...s.sessions];
    if (dateFilter && dateFilter.value) {
      filtered = filtered.filter(sess => sess.date === dateFilter.value);
    }
    if (monthFilter && monthFilter.value) {
      const m = parseInt(monthFilter.value, 10);
      filtered = filtered.filter(sess => new Date(sess.startTime).getMonth() + 1 === m);
    }
    if (yearFilter && yearFilter.value) {
      const y = parseInt(yearFilter.value, 10);
      filtered = filtered.filter(sess => new Date(sess.startTime).getFullYear() === y);
    }
    if (dayTypeFilter && dayTypeFilter.value) {
      filtered = filtered.filter(sess => sess.dayType === dayTypeFilter.value);
    }
    ui.renderAllSessions(filtered);
  }

  function saveMarkedDay() {
    const dateInput = document.getElementById('mark-date');
    const dayTypeInput = document.getElementById('mark-day-type');
    const descInput = document.getElementById('day-description');
    if (!dateInput || !dayTypeInput) return;
    const date = dateInput.value;
    const dayType = dayTypeInput.value;
    const description = descInput ? descInput.value.trim() : '';
    const s = store.getState();
    const existingIndex = s.markedDays.findIndex(d => d.date === date);
    let updated;
    const entry = { date, dayType, description };
    if (existingIndex >= 0) {
      updated = s.markedDays.map((d, i) => i === existingIndex ? entry : d);
    } else {
      updated = [...s.markedDays, entry];
    }
    store.setState({ markedDays: updated });
    ui.hideMarkDayModal();
    if (calendarService) {
      calendarService.clearOverride(date);
      const dayTypeMap = { Holiday: 'holiday', Weekend: 'weekend', Workday: 'workday' };
      if (dayTypeMap[dayType]) calendarService.setOverride(date, 'dayType', dayTypeMap[dayType]);
      if (dayType === 'Vacation') calendarService.setOverride(date, 'isVacation', true);
    }
    persistAndRender();
  }

  function switchTab(tab) {
    ui.switchTab(tab);
    if (tab === 'calendar' && calendarView) {
      calendarView.renderCalendar(calendarService);
    }
  }

  function switchSettingsTab(tab) {
    ui.switchSettingsTab(tab);
  }

  function switchStatsPeriod(period) {
    ui.switchStatsPeriod(period);
  }

  function toggleDarkMode() {
    store.setState({ darkMode: !store.getState().darkMode });
    const s = store.getState();
    if (s.darkMode) {
      ui.enableDarkMode();
    } else {
      ui.disableDarkMode();
    }
    const configs = s.configs;
    if (configs.length > 0) {
      const updated = [{ ...configs[0], darkMode: s.darkMode }, ...configs.slice(1)];
      store.setState({ configs: updated });
    }
    saveState();
  }

  function saveConfig() {
    const workingHoursInput = document.getElementById('working-hours');
    const breakDurationSetting = document.getElementById('break-duration-setting');
    const weekStartSelect = document.getElementById('week-start');
    const hourlySalaryRadio = document.getElementById('hourly-salary');
    const monthlySalaryRadio = document.getElementById('monthly-salary');
    const netSalaryRadio = document.getElementById('net-salary');
    const bruttoSalaryRadio = document.getElementById('brutto-salary');
    const salaryValueInput = document.getElementById('salary-value');
    const salaryTaxInput = document.getElementById('salary-tax');
    const untaxedMinInput = document.getElementById('untaxed-min');
    const inflationRateInput = document.getElementById('inflation-rate');
    const darkModeSetting = document.getElementById('dark-mode-setting');
    const backupIntervalInput = document.getElementById('backup-interval');
    const backupIntervalSec = parseInt(backupIntervalInput ? backupIntervalInput.value : '300', 10);
    store.setState({ backupIntervalMs: Math.max(30000, backupIntervalSec * 1000) });
    configManager.addConfig({
      workingHours: parseInt(workingHoursInput ? workingHoursInput.value : '8', 10) || 8,
      breakDuration: parseInt(breakDurationSetting ? breakDurationSetting.value : '60', 10) || 60,
      weekStart: parseInt(weekStartSelect ? weekStartSelect.value : '1', 10) || 1,
      salaryType: hourlySalaryRadio && hourlySalaryRadio.checked ? 'hourly' : 'monthly',
      salaryTaxType: netSalaryRadio && netSalaryRadio.checked ? 'net' : 'brutto',
      salaryValue: parseFloat(salaryValueInput ? salaryValueInput.value : '0') || 0,
      salaryTax: parseFloat(salaryTaxInput ? salaryTaxInput.value : '0') || 0,
      untaxedMin: parseFloat(untaxedMinInput ? untaxedMinInput.value : '0') || 0,
      inflationRate: parseFloat(inflationRateInput ? inflationRateInput.value : '0') || 0,
      darkMode: darkModeSetting ? darkModeSetting.checked : false,
    });
    ui.applyLatestConfig();
    const s = store.getState();
    if (s.currentTab === 'stats') ui.updateStatistics();
    saveState();
    alert('Configuration saved successfully!');
  }

  function showConfigHistoryModal() {
    ui.showConfigHistoryModal();
  }

  function hideConfigHistoryModal() {
    ui.hideConfigHistoryModal();
  }

  function restoreConfig(configId) {
    const result = configManager.restoreConfig(parseInt(configId, 10));
    if (!result) return;
    ui.applyLatestConfig();
    ui.hideConfigHistoryModal();
    const s = store.getState();
    if (s.currentTab === 'stats') ui.updateStatistics();
    saveState();
    alert('Configuration restored successfully!');
  }

  function exportAllData() {
    const s = store.getState();
    const sessionsToExport = s.sessions.map(session => ({
      ...session,
      tags: Array.isArray(session.tags) && session.tags.length > 0 ? session.tags : ['work'],
      mood: typeof session.mood === 'number' && !isNaN(session.mood) ? session.mood : 5,
    }));
    const data = {
      sessions: sessionsToExport,
      configs: s.configs,
      markedDays: s.markedDays,
      tags: s.tags,
      tagBuckets: s.tagBuckets,
      exportedAt: new Date().toISOString(),
      version: '1.2',
    };
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `work-time-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importData() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput ? fileInput.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== 'object') throw new Error('Invalid data format');
        if (!confirm('Are you sure you want to import this data? This will overwrite your current data.')) return;
        const { DEFAULT_TAGS, DEFAULT_BUCKET_MAP } = await import('./constants.js');
        const subtagNames = [...new Set(Object.values(DEFAULT_BUCKET_MAP).flat())];
        store.setState({
          sessions: Array.isArray(data.sessions) ? data.sessions.map(s => ({
            ...s,
            tags: Array.isArray(s.tags) && s.tags.length > 0 ? s.tags : ['work'],
            mood: typeof s.mood === 'number' && !isNaN(s.mood) ? s.mood : 5,
          })) : [],
          configs: Array.isArray(data.configs) ? data.configs : [],
          markedDays: Array.isArray(data.markedDays) ? data.markedDays : [],
          tags: Array.isArray(data.tags) ? data.tags : [
            ...DEFAULT_TAGS.map(t => ({ name: t, isDefault: true, isEnabled: true, isCustom: false })),
            ...subtagNames.map(t => ({ name: t, isDefault: false, isEnabled: true, isCustom: false })),
          ],
          tagBuckets: data.tagBuckets && Object.keys(data.tagBuckets).length > 0 ? data.tagBuckets : { ...DEFAULT_BUCKET_MAP },
        });
        const impState = store.getState();

        if (calendarService) {
          const dayTypeMap = { Holiday: 'holiday', Weekend: 'weekend', Workday: 'workday' };
          for (const md of impState.markedDays) {
            calendarService.clearOverride(md.date);
            if (dayTypeMap[md.dayType]) calendarService.setOverride(md.date, 'dayType', dayTypeMap[md.dayType]);
            if (md.dayType === 'Vacation') calendarService.setOverride(md.date, 'isVacation', true);
          }
        }

        ui.renderRecentSessions();
        ui.renderAllSessions();
        ui.updateTodayTotal();
        ui.updateTodayStatus(impState, calendarService);
        ui.populateYearSelector();
        ui.applyLatestConfig();
        ui.renderTagSettings();
        ui.initializeCurrentSessionTags();
        ui.initializeCurrentSessionMood();
        saveState();
        alert('Data imported successfully!');
      } catch (err) {
        alert('Error importing data: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (fileInput) fileInput.value = '';
  }

  function resetSessionsFn() {
    sessionManager.resetSessions();
    persistAndRender();
    saveState();
    alert('All sessions have been reset.');
  }

  function resetConfigFn() {
    configManager.resetConfig();
    ui.applyLatestConfig();
    saveState();
    alert('All settings have been reset to defaults.');
  }

  function resetMarkedDaysFn() {
    store.setState({ markedDays: [] });
    persistAndRender();
    saveState();
    alert('All marked days have been reset.');
  }

  function addCustomTag() {
    const input = document.getElementById('new-tag-input');
    const s = store.getState();
    if (!input) return;
    const tagName = input.value.trim();
    if (tagName && !s.tags.some(t => t.name === tagName)) {
      const tagBuckets = { ...s.tagBuckets };
      if (!tagBuckets.other) tagBuckets.other = [];
      tagBuckets.other = [...tagBuckets.other, tagName];
      store.setState({
        tags: [...s.tags, { name: tagName, isDefault: false, isEnabled: true, isCustom: true }],
        tagBuckets,
      });
      input.value = '';
      ui.renderTagSettings();
      saveState();
    }
  }

  function deleteCustomTag(tagName) {
    if (!confirm(`Are you sure you want to delete the "${tagName}" tag?`)) return;
    const s = store.getState();
    const tagBuckets = { ...s.tagBuckets };
    for (const bucket of Object.keys(tagBuckets)) {
      if (tagBuckets[bucket].includes(tagName)) {
        tagBuckets[bucket] = tagBuckets[bucket].filter(t => t !== tagName);
      }
    }
    store.setState({
      tags: s.tags.filter(t => t.name !== tagName),
      tagBuckets,
    });
    ui.renderTagSettings();
    saveState();
  }

  function syncHashtagTags(notes, bucket) {
    if (!notes) return { addedTags: [], foundTags: [], cleanedNotes: notes };
    const s = store.getState();
    const existing = new Set(s.tags.map(t => t.name));
    const allTagNames = new Set(existing);
    for (const b of Object.keys(s.tagBuckets || {})) {
      allTagNames.add(b);
      for (const st of (s.tagBuckets[b] || [])) allTagNames.add(st);
    }
    const hashtagRegex = /#(\w+)/g;
    const toAdd = [];
    const found = [];
    let match;
    while ((match = hashtagRegex.exec(notes)) !== null) {
      const name = match[1];
      if (!found.includes(name)) found.push(name);
      if (!allTagNames.has(name) && !toAdd.includes(name)) {
        toAdd.push(name);
      }
    }
    if (found.length > 0) {
      const removePattern = new RegExp(`#(${found.join('|')})\\b`, 'g');
      notes = notes.replace(removePattern, '').replace(/\s{2,}/g, ' ').trim();
    }
    if (toAdd.length > 0) {
      const tagBuckets = { ...s.tagBuckets };
      const targetBucket = bucket && tagBuckets[bucket] ? bucket : 'other';
      if (!tagBuckets[targetBucket]) tagBuckets[targetBucket] = [];
      tagBuckets[targetBucket] = [...tagBuckets[targetBucket], ...toAdd];
      store.setState({
        tags: [...s.tags, ...toAdd.map(name => ({ name, isDefault: false, isEnabled: true, isCustom: true }))],
        tagBuckets,
      });
      ui.renderTagSettings();
    }
    return { addedTags: toAdd, foundTags: found, cleanedNotes: notes };
  }

  function showMarkDayModal(dayType) {
    ui.showMarkDayModal(dayType);
  }

  function hideMarkDayModal() {
    ui.hideMarkDayModal();
  }

  function setupEventListeners() {
        document.getElementById('cal-prev')?.addEventListener('click', () => { calendarView?.prevMonth(); calendarView?.renderCalendar(calendarService); });
        document.getElementById('cal-next')?.addEventListener('click', () => { calendarView?.nextMonth(); calendarView?.renderCalendar(calendarService); });
        document.getElementById('cal-more-btn')?.addEventListener('click', () => {
          const details = document.getElementById('cal-details');
          const btn = document.getElementById('cal-more-btn');
          if (!details || !btn) return;
          const isHidden = details.classList.toggle('hidden');
          btn.innerHTML = isHidden ? '<i class="fas fa-chevron-down mr-1"></i>Details' : '<i class="fas fa-chevron-up mr-1"></i>Details';
        });
    document.getElementById('dismiss-recovery-banner')?.addEventListener('click', () => ui.hideCrashRecoveryBanner());
    document.getElementById('add-tag-btn')?.addEventListener('click', addCustomTag);
    document.getElementById('tracker-tab')?.addEventListener('click', () => switchTab('tracker'));
    document.getElementById('sessions-tab')?.addEventListener('click', () => switchTab('sessions'));
    document.getElementById('stats-tab')?.addEventListener('click', () => switchTab('stats'));
    document.getElementById('calendar-tab')?.addEventListener('click', () => switchTab('calendar'));
    document.getElementById('config-tab')?.addEventListener('click', () => switchTab('config'));
    let startPressTimer = null;
    let startLongPress = false;

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      let pressX, pressY;
      startBtn.addEventListener('mousedown', (e) => {
        ui.hideStartPicker();
        pressX = e.clientX;
        pressY = e.clientY;
        startLongPress = false;
        startPressTimer = setTimeout(() => {
          startLongPress = true;
          ui.showStartPicker((bucket) => {
            startSession(bucket);
          }, pressX, pressY);
        }, 500);
      });
      startBtn.addEventListener('mouseup', () => {
        clearTimeout(startPressTimer);
        startPressTimer = null;
        if (startLongPress) {
          startLongPress = false;
          return;
        }
        ui.hideStartPicker();
        startSession();
      });
      startBtn.addEventListener('mouseleave', () => {
        clearTimeout(startPressTimer);
        startPressTimer = null;
      });
      startBtn.addEventListener('touchstart', (e) => {
        ui.hideStartPicker();
        pressX = e.touches[0].clientX;
        pressY = e.touches[0].clientY;
        startLongPress = false;
        startPressTimer = setTimeout(() => {
          startLongPress = true;
          ui.showStartPicker((bucket) => {
            startSession(bucket);
          }, pressX, pressY);
        }, 500);
      }, { passive: true });
      startBtn.addEventListener('touchend', () => {
        clearTimeout(startPressTimer);
        startPressTimer = null;
        if (startLongPress) {
          startLongPress = false;
          return;
        }
        ui.hideStartPicker();
        startSession();
      });
      startBtn.addEventListener('touchcancel', () => {
        clearTimeout(startPressTimer);
        startPressTimer = null;
      });
    }
    document.getElementById('stop-btn')?.addEventListener('click', stopSession);
    document.getElementById('pause-btn')?.addEventListener('click', togglePause);
    document.getElementById('recent-sessions-grid-toggle')?.addEventListener('click', () => ui.toggleRecentSessionsGrid());
    document.getElementById('add-session-btn')?.addEventListener('click', showAddSessionModal);
    document.getElementById('close-modal')?.addEventListener('click', hideSessionModal);
    document.getElementById('cancel-session')?.addEventListener('click', hideSessionModal);
    document.getElementById('session-form')?.addEventListener('submit', handleSessionFormSubmit);
    document.getElementById('apply-filters')?.addEventListener('click', applyFilters);
    document.getElementById('mark-holiday')?.addEventListener('click', () => showMarkDayModal('Holiday'));
    document.getElementById('mark-vacation')?.addEventListener('click', () => showMarkDayModal('Vacation'));
    document.getElementById('save-mark-day')?.addEventListener('click', saveMarkedDay);
    document.getElementById('cancel-mark-day')?.addEventListener('click', hideMarkDayModal);
    document.getElementById('daily-stats')?.addEventListener('click', () => switchStatsPeriod('daily'));
    document.getElementById('weekly-stats')?.addEventListener('click', () => switchStatsPeriod('weekly'));
    document.getElementById('monthly-stats')?.addEventListener('click', () => switchStatsPeriod('monthly'));
    document.getElementById('yearly-stats')?.addEventListener('click', () => switchStatsPeriod('yearly'));
    document.getElementById('year-selector')?.addEventListener('change', ui.updateStatistics);
    document.getElementById('close-delete-modal')?.addEventListener('click', hideDeleteModal);
    document.getElementById('cancel-delete')?.addEventListener('click', hideDeleteModal);
    document.getElementById('confirm-delete')?.addEventListener('click', confirmDeleteSession);
    document.getElementById('dark-mode-toggle')?.addEventListener('click', toggleDarkMode);
    document.getElementById('dark-mode-setting')?.addEventListener('change', toggleDarkMode);
    document.getElementById('save-settings')?.addEventListener('click', saveConfig);
    document.getElementById('view-config-history')?.addEventListener('click', showConfigHistoryModal);
    document.getElementById('close-config-history')?.addEventListener('click', hideConfigHistoryModal);
    document.getElementById('export-all-data')?.addEventListener('click', exportAllData);
    document.getElementById('import-data')?.addEventListener('click', () => document.getElementById('import-file')?.click());
    document.getElementById('import-file')?.addEventListener('change', importData);
    document.getElementById('reset-sessions')?.addEventListener('click', () => {
      if (confirm('Reset Sessions\n\nAre you sure you want to delete all sessions?')) resetSessionsFn();
    });
    document.getElementById('reset-config')?.addEventListener('click', () => {
      if (confirm('Reset Config\n\nAre you sure you want to reset all settings?')) resetConfigFn();
    });
    document.getElementById('reset-marked-days')?.addEventListener('click', () => {
      if (confirm('Reset Marked Days\n\nAre you sure you want to reset all marked days?')) resetMarkedDaysFn();
    });
    document.querySelectorAll('[data-settings-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-settings-tab');
        switchSettingsTab(tab);
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#hashtag-dropdown, #hashtag-dropdown *')) {
        const dd = document.getElementById('hashtag-dropdown');
        if (dd && !e.target.closest('.hashtag-item') && !e.target.closest('textarea')) {
          dd.remove();
        }
      }
      if (!e.target.closest('#start-picker, #start-picker *, #start-btn')) {
        ui.hideStartPicker();
      }
      const editBtn = e.target.closest('.edit-session');
      if (editBtn && editBtn.dataset.id) {
        editSession(parseInt(editBtn.dataset.id, 10));
        return;
      }
      const deleteBtn = e.target.closest('.delete-session');
      if (deleteBtn && deleteBtn.dataset.id) {
        showDeleteModal(parseInt(deleteBtn.dataset.id, 10));
        return;
      }
      const sessionCard = e.target.closest('.session-card');
      if (sessionCard && !e.target.closest('button')) {
        const sid = sessionCard.dataset.sessionId || sessionCard.querySelector('[data-id]')?.dataset.id;
        if (sid) editSession(parseInt(sid, 10));
      }
    });
    const moodRating = document.getElementById('mood-rating');
    if (moodRating) {
      moodRating.addEventListener('click', ui.handleStarClick);
      moodRating.addEventListener('mousemove', ui.handleStarHover);
      moodRating.addEventListener('mouseleave', ui.resetStarDisplay);
    }
    ui.initHashtagAutocomplete('notes');
    ui.initHashtagAutocomplete('modal-notes');
  }

  async function init() {
    a11y.setupAnnouncer();
    await loadData();
    const s = store.getState();

    const thisYear = new Date().getFullYear().toString();
    try {
      const { createCalendarService } = await import('./calendarService.js');
      const rawData = await storage.loadCalendar(thisYear);
      calendarService = createCalendarService(rawData);
      for (const md of s.markedDays) {
        const dayTypeMap = { Holiday: 'holiday', Weekend: 'weekend', Workday: 'workday' };
        if (dayTypeMap[md.dayType]) calendarService.setOverride(md.date, 'dayType', dayTypeMap[md.dayType]);
        if (md.dayType === 'Vacation') calendarService.setOverride(md.date, 'isVacation', true);
      }
    } catch (err) {
      console.error('Failed to load calendar:', err);
    }

    const recoveredTracker = store.getState().tracker;
    if (recoveredTracker && recoveredTracker.startTime) {
      clearInterval(timerInterval);
      clearInterval(backupInterval);
      ui.updateButtonStates(true);
      timerInterval = setInterval(ui.updateTimerDisplay, 1000);
      const intervalMs = s.backupIntervalMs || DEFAULT_BACKUP_INTERVAL_MS;
      backupInterval = setInterval(saveState, intervalMs);
      ui.showCrashRecoveryBanner();
    }

    calendarView = createCalendarView(store);
    ui.renderRecentSessions();
    ui.renderAllSessions();
    ui.updateTodayTotal();
    ui.updateTodayStatus(s, calendarService);
    ui.populateYearSelector();
    ui.applyLatestConfig();
    ui.renderTagSettings();
    ui.initializeCurrentSessionTags();
    ui.initializeCurrentSessionMood();
    if (recoveredTracker && recoveredTracker.startTime) {
      const notesInput = document.getElementById('notes');
      if (notesInput && recoveredTracker.backupNotes !== undefined) {
        notesInput.value = recoveredTracker.backupNotes;
      }
      document.getElementById('session-notes')?.classList.remove('hidden');
    }
    ui.updateCurrentTime();
    if (s.darkMode) ui.enableDarkMode();
    const markDateInput = document.getElementById('mark-date');
    if (markDateInput) markDateInput.value = utils.formatDate(new Date());
    const tagFilter = document.getElementById('tag-filter');
    if (tagFilter) {
      tagFilter.innerHTML = `
        <option value="all">All Tags</option>
        ${DEFAULT_TAGS.map(t => `<option value="${t}"${t === 'work' ? ' selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
      `;
    }
    const subtagFilter = document.getElementById('subtag-filter');
    if (subtagFilter) {
      const enabledSubtags = s.tags.filter(t => t.isEnabled && !DEFAULT_TAGS.includes(t.name));
      subtagFilter.innerHTML = `
        <option value="all" selected>All Subtags</option>
        ${enabledSubtags.map(t => `<option value="${t.name}">${t.name}</option>`).join('')}
      `;
    }
    setupEventListeners();
    setInterval(ui.updateCurrentTime, 1000);
    a11y.announce('Application loaded');
  }

  return {
    init,
    startSession, stopSession, togglePause,
    showAddSessionModal, hideSessionModal, editSession, handleSessionFormSubmit,
    showDeleteModal, hideDeleteModal, confirmDeleteSession,
    applyFilters, saveMarkedDay, showMarkDayModal, hideMarkDayModal,
    switchTab, switchSettingsTab, switchStatsPeriod,
    toggleDarkMode, saveConfig,
    showConfigHistoryModal, hideConfigHistoryModal, restoreConfig,
    exportAllData, importData,
    resetSessionsFn, resetConfigFn, resetMarkedDaysFn,
    addCustomTag, deleteCustomTag, syncHashtagTags, setupEventListeners, loadData,
    persistAndRender,
  };
}
