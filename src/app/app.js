import * as utils from '../js/utils.js';

const INITIAL_STATE = Object.freeze({
  sessions: [],
  configs: [],
  markedDays: [],
  tags: [],
  currentTab: 'tracker',
  currentStatsPeriod: 'daily',
  darkMode: false,
  tracker: { startTime: null, isPaused: false, pauseStart: null, accumulatedPauseTime: 0, isBreak: false },
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

  function loadStateFromStorage(state) {
    if (state && state.sessions) store.setState({ sessions: state.sessions });
    if (state && state.configs) store.setState({ configs: state.configs });
    if (state && state.markedDays) store.setState({ markedDays: state.markedDays });
    if (state && state.tags) store.setState({ tags: state.tags });
    if (state && state.darkMode !== undefined) store.setState({ darkMode: state.darkMode });
  }

  async function loadData() {
    try {
      const saved = await storage.loadState();
      if (saved) {
        loadStateFromStorage(saved);
      } else {
        const s = store.getState();
        if (s.configs.length === 0) {
          configManager.addConfig();
        }
        if (s.tags.length === 0) {
          const { DEFAULT_TAGS, PRESET_TAGS } = await import('./constants.js');
          const tags = [
            ...DEFAULT_TAGS.map(t => ({ name: t, isDefault: true, isEnabled: true, isCustom: false })),
            ...PRESET_TAGS.map(t => ({ name: t, isDefault: false, isEnabled: true, isCustom: false })),
          ];
          store.setState({ tags });
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  async function saveState() {
    const s = store.getState();
    try {
      await storage.saveState({
        sessions: s.sessions,
        configs: s.configs,
        markedDays: s.markedDays,
        tags: s.tags,
        darkMode: s.darkMode,
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
    ui.populateYearSelector();
    const s = store.getState();
    if (s.currentTab === 'stats') ui.updateStatistics();
  }

  function startSession() {
    clearInterval(timerInterval);
    sessionManager.startTracking();
    ui.updateButtonStates(true);
    timerInterval = setInterval(ui.updateTimerDisplay, 1000);
  }

  function stopSession() {
    const s = store.getState();
    const tracker = s.tracker;
    if (!tracker.startTime) return;
    clearInterval(timerInterval);
    const durEl = document.getElementById('active-duration');
    if (durEl) durEl.classList.remove('blink');
    const startTimeInput = document.getElementById('current-session-start-time-input');
    const endTimeInput = document.getElementById('current-session-end-time-input');
    const restDurationInput = document.getElementById('current-session-accumulated-rest-duration-input');
    if (startTimeInput) startTimeInput.value = tracker.startTime;
    if (endTimeInput) endTimeInput.value = Date.now();
    if (restDurationInput) restDurationInput.value = tracker.accumulatedPauseTime;
    ui.updateTimerDisplay();
    sessionManager.resetTracker();
    ui.updateButtonStates(false);
    const notes = document.getElementById('session-notes');
    if (notes) notes.classList.remove('hidden');
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
          isBreak: true,
        };
        sessionManager.addSession(breakSession);
      }
      sessionManager.resumeTracking();
      const pauseBtn = document.getElementById('pause-btn');
      if (pauseBtn) pauseBtn.innerHTML = '<i class="fas fa-pause mr-2"></i> Pause';
    } else {
      sessionManager.pauseTracking();
      const pauseBtn = document.getElementById('pause-btn');
      if (pauseBtn) pauseBtn.innerHTML = '<i class="fas fa-play mr-2"></i> Resume';
    }
    ui.updateTimerDisplay();
    persistAndRender();
  }

  async function saveSession() {
    const s = store.getState();
    const trackerStartInput = document.getElementById('current-session-start-time-input');
    const trackerEndInput = document.getElementById('current-session-end-time-input');
    const restInput = document.getElementById('current-session-accumulated-rest-duration-input');
    const notesInput = document.getElementById('notes');
    const startTimeMs = parseInt(trackerStartInput ? trackerStartInput.value : '0', 10);
    const endTimeMs = parseInt(trackerEndInput ? trackerEndInput.value : '0', 10);
    const accumulatedPauseTimeMs = parseInt(restInput ? restInput.value : '0', 10);
    const startDate = new Date(startTimeMs);
    const endDate = new Date(endTimeMs);
    const duration = Math.max(0, Math.floor((endTimeMs - startTimeMs - accumulatedPauseTimeMs) / 1000));
    const accumulatedPauseTimeSec = Math.floor(accumulatedPauseTimeMs / 1000);
    const date = utils.formatDate(startDate);
    const dayType = getDayType(date, s);
    const selectedTags = [];
    document.querySelectorAll('#current-session-tags .tag.selected').forEach(el => {
      selectedTags.push(el.dataset.tag);
    });
    if (selectedTags.length === 0) selectedTags.push('work');
    const moodInput = document.getElementById('current-session-mood-input');
    sessionManager.addSession({
      id: Date.now(),
      date,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      duration: utils.formatDuration(duration),
      durationSec: duration,
      accumulatedPauseTimeSec,
      notes: notesInput ? notesInput.value.trim() : '',
      dayType,
      tags: selectedTags,
      mood: moodInput ? parseFloat(moodInput.value) : 5,
    });
    if (notesInput) notesInput.value = '';
    const durEl = document.getElementById('active-duration');
    if (durEl) durEl.textContent = '00:00:00';
    const notes = document.getElementById('session-notes');
    if (notes) notes.classList.add('hidden');
    const moodContainer = document.getElementById('current-session-mood');
    if (moodContainer) moodContainer.dataset.rating = '5';
    const moodVal = document.getElementById('current-mood-value');
    if (moodVal) moodVal.textContent = '5.0';
    if (trackerStartInput) trackerStartInput.value = '0';
    if (trackerEndInput) trackerEndInput.value = '0';
    if (restInput) restInput.value = '0';
    document.querySelectorAll('#current-session-mood .star').forEach(star => { star.innerHTML = '\u2605'; });
    ui.initializeCurrentSessionTags();
    ui.initializeCurrentSessionMood();
    await saveState();
    ui.renderRecentSessions();
    ui.updateTodayTotal();
    const state = store.getState();
    if (state.currentTab === 'stats') ui.updateStatistics();
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
    const duration = Math.floor((endTime - startTime) / 1000);
    const dayType = dayTypeInput ? dayTypeInput.value : 'Workday';
    const notes = modalNotes ? modalNotes.value.trim() : '';
    const selectedTags = [];
    document.querySelectorAll('#tags-container .tag.selected').forEach(el => {
      selectedTags.push(el.dataset.tag);
    });
    const isBreak = selectedTags.includes('rest') && !selectedTags.includes('work');
    if (!isBreak && selectedTags.length === 0) selectedTags.unshift('work');
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
    const tagsContainer = document.getElementById('tags-container');
    if (tagsContainer) {
      tagsContainer.innerHTML = '';
      const enabledTags = s.tags.filter(t => t.isEnabled);
      for (const tag of enabledTags) {
        const tagEl = document.createElement('div');
        const isSelected = session.tags && session.tags.includes(tag.name);
        tagEl.className = `tag px-2 py-1 rounded-full text-sm cursor-pointer ${isSelected ? 'selected' : ''} ${ui.getTagBadgeClass(tag.name, isSelected)}`;
        tagEl.dataset.tag = tag.name;
        tagEl.textContent = tag.name;
        tagEl.addEventListener('click', () => {
          const selected = tagsContainer.querySelectorAll('.tag.selected');
          const selectedNames = Array.from(selected).map(el => el.dataset.tag);
          if (selectedNames.length <= 1 && selectedNames.includes(tag.name)) return;
          tagEl.classList.toggle('selected');
          tagEl.classList.toggle('bg-blue-100');
          tagEl.classList.toggle('text-blue-800');
          tagEl.classList.toggle('dark:bg-blue-900');
          tagEl.classList.toggle('dark:text-blue-300');
        });
        tagsContainer.appendChild(tagEl);
      }
    }
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
    persistAndRender();
  }

  function switchTab(tab) {
    ui.switchTab(tab);
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
      exportedAt: new Date().toISOString(),
      version: '1.1',
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
        const { DEFAULT_TAGS, PRESET_TAGS } = await import('./constants.js');
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
            ...PRESET_TAGS.map(t => ({ name: t, isDefault: false, isEnabled: true, isCustom: false })),
          ],
        });
        ui.renderRecentSessions();
        ui.renderAllSessions();
        ui.updateTodayTotal();
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
      store.setState({
        tags: [...s.tags, { name: tagName, isDefault: false, isEnabled: true, isCustom: true }],
      });
      input.value = '';
      ui.renderTagSettings();
      saveState();
    }
  }

  function deleteCustomTag(tagName) {
    if (!confirm(`Are you sure you want to delete the "${tagName}" tag?`)) return;
    const s = store.getState();
    store.setState({ tags: s.tags.filter(t => t.name !== tagName) });
    ui.renderTagSettings();
    saveState();
  }

  function showMarkDayModal(dayType) {
    ui.showMarkDayModal(dayType);
  }

  function hideMarkDayModal() {
    ui.hideMarkDayModal();
  }

  function setupEventListeners() {
    document.getElementById('add-tag-btn')?.addEventListener('click', addCustomTag);
    document.getElementById('tracker-tab')?.addEventListener('click', () => switchTab('tracker'));
    document.getElementById('sessions-tab')?.addEventListener('click', () => switchTab('sessions'));
    document.getElementById('stats-tab')?.addEventListener('click', () => switchTab('stats'));
    document.getElementById('config-tab')?.addEventListener('click', () => switchTab('config'));
    document.getElementById('start-btn')?.addEventListener('click', startSession);
    document.getElementById('stop-btn')?.addEventListener('click', stopSession);
    document.getElementById('pause-btn')?.addEventListener('click', togglePause);
    document.getElementById('save-session')?.addEventListener('click', saveSession);
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
    const tagSettingsTab = document.querySelector('[data-settings-tab="tags"]');
    if (tagSettingsTab) {
      tagSettingsTab.addEventListener('click', () => switchSettingsTab('tags'));
    }
    document.addEventListener('click', (e) => {
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
  }

  async function init() {
    a11y.setupAnnouncer();
    await loadData();
    const s = store.getState();
    ui.renderRecentSessions();
    ui.renderAllSessions();
    ui.updateTodayTotal();
    ui.populateYearSelector();
    ui.applyLatestConfig();
    ui.renderTagSettings();
    ui.initializeCurrentSessionTags();
    ui.initializeCurrentSessionMood();
    ui.updateCurrentTime();
    if (s.darkMode) ui.enableDarkMode();
    const markDateInput = document.getElementById('mark-date');
    if (markDateInput) markDateInput.value = utils.formatDate(new Date());
    const tagFilter = document.getElementById('tag-filter');
    if (tagFilter) {
      const enabledTags = s.tags.filter(t => t.isEnabled);
      tagFilter.innerHTML = `
        <option value="work" selected>Work</option>
        <option value="all">All Tags</option>
        ${enabledTags.filter(t => t.name !== 'work').map(t => `<option value="${t.name}">${t.name}</option>`).join('')}
      `;
    }
    setupEventListeners();
    setInterval(ui.updateCurrentTime, 1000);
    a11y.announce('Application loaded');
  }

  return {
    init,
    startSession, stopSession, togglePause, saveSession,
    showAddSessionModal, hideSessionModal, editSession, handleSessionFormSubmit,
    showDeleteModal, hideDeleteModal, confirmDeleteSession,
    applyFilters, saveMarkedDay, showMarkDayModal, hideMarkDayModal,
    switchTab, switchSettingsTab, switchStatsPeriod,
    toggleDarkMode, saveConfig,
    showConfigHistoryModal, hideConfigHistoryModal, restoreConfig,
    exportAllData, importData,
    resetSessionsFn, resetConfigFn, resetMarkedDaysFn,
    addCustomTag, deleteCustomTag, setupEventListeners, loadData,
    persistAndRender,
  };
}
