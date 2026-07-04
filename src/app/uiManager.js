import { Chart } from 'chart.js/auto';
import * as utils from '../js/utils.js';
import { moveSubtagBetweenBuckets, removeTagFromBucket } from './tagManager.js';

export function createUIManager(store) {
  let _showCurrentRest = true;
  let _onTagBucketsChange = null;
  let _showTodayWorkOnly = true;
  let _isGridMode = false;
  let timeChart = null;
  let distributionChart = null;
  let incomeChart = null;

  const display = document.getElementById('active-duration');
  if (display) {
    display.style.cursor = 'pointer';
    display.addEventListener('click', () => {
      const s = store.getState();
      if (s.tracker && s.tracker.isPaused) {
        _showCurrentRest = !_showCurrentRest;
        updateTimerDisplay();
      }
    });
  }

  const todayTotal = document.getElementById('today-total');
  if (todayTotal) {
    todayTotal.style.cursor = 'pointer';
    todayTotal.addEventListener('click', () => {
      _showTodayWorkOnly = !_showTodayWorkOnly;
      updateTodayTotal();
    });
  }

  function getTagBadgeClass(tag, selected = false) {
    if (!selected) return 'text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    switch (tag) {
      case 'work':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'rest':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  function updateCurrentTime() {
    const el = document.getElementById('current-time');
    if (el) el.textContent = utils.formatTime(new Date());
  }

  function updateTimerDisplay(els) {
    const s = store.getState();
    const tracker = s.tracker;
    if (!(tracker.startTime || tracker.pauseStart)) return;
    const now = Date.now();
    let elapsedSeconds;
    if (tracker.isPaused) {
      const rawMs = now - tracker.pauseStart;
      const currentRestSec = Math.floor(rawMs / 1000);
      const totalRestSec = currentRestSec + Math.floor(tracker.accumulatedPauseTime / 1000);
      elapsedSeconds = _showCurrentRest ? currentRestSec : totalRestSec;
      updateTimerDisplayEl(elapsedSeconds, tracker.isBreak, _showCurrentRest);
    } else {
      const rawMs = now - tracker.startTime;
      elapsedSeconds = Math.max(0, Math.floor((rawMs - tracker.accumulatedPauseTime) / 1000));
      updateTimerDisplayEl(elapsedSeconds, tracker.isBreak);
    }
  }

  function updateTimerDisplayEl(seconds, isBreak, showCurrentRest) {
    const display = document.getElementById('active-duration');
    const container = document.querySelector('.duration-display');
    const label = document.getElementById('duration-label');
    if (!display || !label) return;
    display.textContent = utils.formatDuration(Math.max(0, seconds));
    const s = store.getState();
    const isPaused = s.tracker && s.tracker.isPaused;
    if (isPaused) {
      if (container) container.classList.add('break-mode');
      label.textContent = showCurrentRest ? 'Current Rest' : 'Total Rest';
    } else if (isBreak) {
      if (container) container.classList.add('break-mode');
      label.textContent = 'Break Duration';
    } else {
      if (container) container.classList.remove('break-mode');
      label.textContent = 'Session Duration';
    }
  }

  function updateTodayTotal() {
    const s = store.getState();
    const today = utils.formatDate(new Date());
    const todaySessions = s.sessions.filter(session => session.date === today);
    const workSec = todaySessions
      .filter(session => session.tags && session.tags.includes('work'))
      .reduce((sum, session) => sum + session.durationSec, 0);
    const totalSec = todaySessions.reduce((sum, session) => sum + session.durationSec, 0);
    const el = document.getElementById('today-total');
    const label = document.getElementById('today-total-label');
    if (!el) return;
    if (_showTodayWorkOnly) {
      el.textContent = utils.formatDuration(workSec);
      if (label) label.textContent = "Today's Work";
    } else {
      el.textContent = utils.formatDuration(totalSec);
      if (label) label.textContent = "Today's Total";
    }
  }

  function updateTodayStatus(state, calendarService) {
    const today = utils.formatDate(new Date());
    const el = document.getElementById('today-status');
    if (!el) return;

    const existing = el.querySelector('span');
    if (existing) existing.remove();

    let text = null;

    let tooltip = null;
    let display = null;

    if (calendarService) {
      const info = calendarService.getDayInfo(today);
      if (info) {
        let emoji = '';
        let displayName = '';

        if (info.isHoliday && info.isMemoriam) {
          emoji = '🌿';
          displayName = info.name || '';
          tooltip = 'Holiday / Memorial';
        } else if (info.isHoliday) {
          emoji = '🌿';
          displayName = info.name || '';
          tooltip = 'Holiday';
        } else if (info.isMemoriam) {
          emoji = '🕯️';
          displayName = info.name || '';
          tooltip = 'Memorial Day';
        } else if (info.isShortDay) {
          emoji = '⚠️';
          displayName = info.note || '';
          tooltip = 'Short day — pre-holiday';
        }

        if (info.swapSource && !emoji) {
          display = '🔁 🔧';
          tooltip = `Shifted workday (originally ${info.swapSource})`;
        } else if (info.swapSource && emoji) {
          const namePart = displayName ? ' ' + displayName : '';
          display = `🔁 ${emoji}${namePart}`;
          tooltip += ` (swapped from ${info.swapSource})`;
        } else if (emoji) {
          const namePart = displayName ? ' ' + displayName : '';
          display = `${emoji}${namePart}`;
        }

        if (info.note && !info.isShortDay) tooltip += ` — ${info.note}`;
      }
    }

    if (!display) {
      const marked = state.markedDays.find(d => d.date === today);
      if (marked && marked.dayType === 'Holiday') {
        display = marked.description ? `🌿 ${marked.description}` : '🌿';
        tooltip = 'Holiday';
      } else if (marked && marked.dayType === 'Vacation') {
        display = marked.description ? `🌿 ${marked.description}` : '🌿';
        tooltip = 'Vacation';
      }
    }

    if (display) {
      const span = document.createElement('span');
      span.textContent = display;
      if (tooltip) span.title = tooltip;
      el.appendChild(span);
    }
  }

  function updateButtonStates(isRunning) {
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const pauseBtn = document.getElementById('pause-btn');
    if (!startBtn || !stopBtn || !pauseBtn) return;
    startBtn.disabled = isRunning;
    stopBtn.disabled = !isRunning;
    pauseBtn.disabled = !isRunning;
    if (isRunning) {
      startBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      startBtn.classList.add('bg-gray-300', 'cursor-not-allowed');
      stopBtn.classList.remove('bg-gray-200');
      stopBtn.classList.add('bg-red-500', 'hover:bg-red-600', 'text-white');
      pauseBtn.classList.remove('bg-gray-200');
      pauseBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600', 'text-white');
    } else {
      startBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
      startBtn.classList.remove('bg-gray-300', 'cursor-not-allowed');
      stopBtn.classList.add('bg-gray-200');
      stopBtn.classList.remove('bg-red-500', 'hover:bg-red-600', 'text-white');
      pauseBtn.classList.add('bg-gray-200');
      pauseBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600', 'text-white');
      pauseBtn.innerHTML = '<i class="fas fa-pause sm:mr-2"></i> <span class="hidden sm:inline">Pause</span>';
    }
  }

  function switchTab(tab) {
    store.setState({ currentTab: tab });
    const tabs = ['tracker', 'sessions', 'stats', 'calendar', 'config'];
    const tabIds = {
      tracker: 'tracker-tab',
      sessions: 'sessions-tab',
      stats: 'stats-tab',
      calendar: 'calendar-tab',
      config: 'config-tab',
    };
    const contentIds = {
      tracker: 'tracker-content',
      sessions: 'sessions-content',
      stats: 'stats-content',
      calendar: 'calendar-content',
      config: 'config-content',
    };
    for (const t of tabs) {
      const tabEl = document.getElementById(tabIds[t]);
      const contentEl = document.getElementById(contentIds[t]);
      if (tabEl) {
        tabEl.classList.remove('tab-active');
        tabEl.classList.add('text-gray-500', 'hover:text-gray-700', 'dark:hover:text-gray-300');
      }
      if (contentEl) contentEl.classList.add('hidden');
    }
    const activeTabEl = document.getElementById(tabIds[tab]);
    const activeContentEl = document.getElementById(contentIds[tab]);
    if (activeTabEl) {
      activeTabEl.classList.add('tab-active');
      activeTabEl.classList.remove('text-gray-500', 'hover:text-gray-700', 'dark:hover:text-gray-300');
    }
    if (activeContentEl) activeContentEl.classList.remove('hidden');
    if (tab === 'stats') {
      updateStatistics();
    }
  }

  function switchSettingsTab(tab) {
    const tabMap = { general: 'general-settings', salary: 'salary-settings', tags: 'tags-settings', backup: 'backup-settings' };
    const containerId = tabMap[tab];
    if (!containerId) return;
    const buttons = document.querySelectorAll('[data-settings-tab]');
    const allContainers = Object.values(tabMap);
    for (const id of allContainers) {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    }
    for (const btn of buttons) {
      btn.classList.remove('settings-tab-active');
    }
    const target = document.getElementById(containerId);
    if (target) target.classList.remove('hidden');
    const activeBtn = document.querySelector(`[data-settings-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('settings-tab-active');
  }

  function switchStatsPeriod(period) {
    store.setState({ currentStatsPeriod: period });
    const btnIds = { daily: 'daily-stats', weekly: 'weekly-stats', monthly: 'monthly-stats', yearly: 'yearly-stats' };
    const titles = { daily: 'Daily Statistics', weekly: 'Weekly Statistics', monthly: 'Monthly Statistics', yearly: 'Yearly Statistics' };
    const inactiveClasses = ['bg-gray-200', 'text-gray-800', 'dark:bg-gray-600', 'dark:text-white'];
    const activeClasses = ['bg-blue-600', 'text-white'];
    for (const [key, id] of Object.entries(btnIds)) {
      const btn = document.getElementById(id);
      if (!btn) continue;
      btn.classList.remove(...activeClasses);
      btn.classList.add(...inactiveClasses);
    }
    const activeBtn = document.getElementById(btnIds[period]);
    if (activeBtn) {
      activeBtn.classList.add(...activeClasses);
      activeBtn.classList.remove(...inactiveClasses);
    }
    const titleEl = document.getElementById('stats-period-title');
    if (titleEl) titleEl.textContent = titles[period];
    const yearlyTable = document.getElementById('yearly-stats-table');
    const incomeContainer = document.getElementById('income-chart-container');
    if (period === 'yearly') {
      if (yearlyTable) yearlyTable.classList.remove('hidden');
      const s = store.getState();
      if (s.configs.length > 0 && s.configs[0].salaryValue) {
        if (incomeContainer) incomeContainer.classList.remove('hidden');
      } else {
        if (incomeContainer) incomeContainer.classList.add('hidden');
      }
    } else {
      if (yearlyTable) yearlyTable.classList.add('hidden');
      if (incomeContainer) incomeContainer.classList.add('hidden');
    }
    updateStatistics();
  }

  function toggleRecentSessionsGrid() {
    _isGridMode = !_isGridMode;
    const toggleBtn = document.getElementById('recent-sessions-grid-toggle');
    if (toggleBtn) {
      toggleBtn.innerHTML = _isGridMode
        ? '<i class="fas fa-list"></i>'
        : '<i class="fas fa-th"></i>';
      toggleBtn.title = _isGridMode ? 'Switch to list view' : 'Switch to grid view';
    }
    renderRecentSessions();
    return _isGridMode;
  }

  function renderRecentSessions() {
    const container = document.getElementById('recent-sessions');
    const s = store.getState();
    if (!container) return;
    if (s.sessions.length === 0) {
      container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No recent sessions found. Start tracking to see your sessions here.</p>';
      return;
    }
    const recent = s.sessions.slice(0, 5);
    container.className = _isGridMode
      ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3'
      : 'space-y-3';
    container.innerHTML = recent.map(session => _isGridMode
      ? `
      <div class="session-card-grid bg-white border border-gray-200 rounded-lg p-3 transition-all duration-200 dark:bg-gray-600 dark:border-gray-500">
        <div class="mb-2">
          <h3 class="font-medium text-gray-800 text-sm dark:text-white">${session.date}</h3>
          <p class="text-xs text-gray-600 dark:text-gray-300">${utils.formatTime(new Date(session.startTime))} - ${utils.formatTime(new Date(session.endTime))}</p>
          <span class="inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${utils.getDayTypeBadgeClass(session.dayType)}">
            ${session.dayType}
          </span>
        </div>
        <div class="flex items-center justify-between mb-2">
          <span class="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300">${session.duration}</span>
          ${session.mood ? `
          <div class="flex items-center">
            <div class="flex">
              ${Array.from({length: 5}).map((_, i) => `
                <span class="text-xs ${i < Math.floor(session.mood) ? 'text-yellow-500' : 'text-gray-400'}">${i < Math.floor(session.mood) ? '\u2605' : '\u2606'}</span>
              `).join('')}
            </div>
          </div>
          ` : ''}
        </div>
        ${session.accumulatedPauseTimeSec ? `<div class="text-xs text-gray-500 dark:text-gray-400 mb-2">Rest ${utils.formatDuration(session.accumulatedPauseTimeSec)}</div>` : ''}
        <div class="flex justify-between items-center">
          <div class="flex flex-wrap gap-1">
            ${session.tags ? session.tags.map(tag => `
              <span class="text-xs px-1.5 py-0.5 rounded-full ${getTagBadgeClass(tag)}">${tag}</span>
            `).join('') : ''}
          </div>
          <div class="flex space-x-2">
            <button class="edit-session text-blue-600 hover:text-blue-800 text-xs dark:text-blue-400 dark:hover:text-blue-300" data-id="${session.id}"><i class="fas fa-edit"></i></button>
            <button class="delete-session text-red-600 hover:text-red-800 text-xs dark:text-red-400 dark:hover:text-red-300" data-id="${session.id}"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      </div>`
      : `
      <div class="session-card bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 dark:bg-gray-600 dark:border-gray-500">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-medium text-gray-800 dark:text-white">${session.date}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">${utils.formatTime(new Date(session.startTime))} - ${utils.formatTime(new Date(session.endTime))}</p>
            <span class="inline-block mt-1 text-xs px-2 py-1 rounded-full ${utils.getDayTypeBadgeClass(session.dayType)}">
              ${session.dayType}
            </span>
          </div>
          <div class="text-right">
            <span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300">${session.duration}</span>
            ${session.accumulatedPauseTimeSec ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Rest ${utils.formatDuration(session.accumulatedPauseTimeSec)}</div>` : ''}
            ${session.mood ? `
            <div class="mt-1 flex items-center justify-end">
              <span class="text-xs mr-1">${session.mood.toFixed(1)}</span>
              <div class="flex">
                ${Array.from({length: 5}).map((_, i) => `
                  <span class="text-xs ${i < Math.floor(session.mood) ? 'text-yellow-500' : 'text-gray-400'}">
                    ${i < Math.floor(session.mood) ? '\u2605' : '\u2606'}
                  </span>
                `).join('')}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        ${session.notes ? `<p class="mt-2 text-gray-700 dark:text-gray-300">${session.notes}</p>` : ''}
        <div class="flex justify-between items-center mt-3">
          <div class="flex flex-wrap gap-1">
            ${session.tags ? session.tags.map(tag => `
              <span class="text-xs px-2 py-1 rounded-full ${getTagBadgeClass(tag)}">
                ${tag}
              </span>
            `).join('') : ''}
          </div>
          <div class="flex space-x-2">
            <button class="edit-session text-blue-600 hover:text-blue-800 text-sm font-medium dark:text-blue-400 dark:hover:text-blue-300" data-id="${session.id}">
              <i class="fas fa-edit mr-1"></i>Edit
            </button>
            <button class="delete-session text-red-600 hover:text-red-800 text-sm font-medium dark:text-red-400 dark:hover:text-red-300" data-id="${session.id}">
              <i class="fas fa-trash-alt mr-1"></i>Delete
            </button>
          </div>
        </div>
      </div>`
    ).join('');
  }

  function renderAllSessions(filteredSessions) {
    const container = document.getElementById('all-sessions-list');
    const s = store.getState();
    if (!container) return;
    const sessionsToRender = filteredSessions || s.sessions;
    if (sessionsToRender.length === 0) {
      container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No sessions found. Start tracking or add a session manually.</p>';
      return;
    }
    const sessionsByDate = {};
    for (const session of sessionsToRender) {
      if (!sessionsByDate[session.date]) sessionsByDate[session.date] = [];
      sessionsByDate[session.date].push(session);
    }
    container.innerHTML = '';
    const markedDay = (dateStr) => s.markedDays.find(d => d.date === dateStr);
    for (const [date, dateSessions] of Object.entries(sessionsByDate)) {
      const md = markedDay(date);
      const dayType = md ? md.dayType : (() => { const d = new Date(date); return (d.getDay() === 0 || d.getDay() === 6) ? 'Weekend' : 'Workday'; })();
      const dateHeader = document.createElement('div');
      dateHeader.className = `day-header px-4 py-2 rounded-t-lg flex justify-between items-center ${dayType.toLowerCase()}`;
      const dateText = document.createElement('span');
      dateText.className = 'font-medium';
      dateText.textContent = new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const dayTypeBadge = document.createElement('span');
      dayTypeBadge.className = 'text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-600';
      dayTypeBadge.textContent = dayType;
      dateHeader.appendChild(dateText);
      dateHeader.appendChild(dayTypeBadge);
      container.appendChild(dateHeader);
      for (const session of dateSessions) {
        const sessionCard = document.createElement('div');
        sessionCard.className = 'session-card bg-white border border-gray-200 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:hover:bg-gray-500';
        sessionCard.dataset.sessionId = session.id;
        const sessionInfo = document.createElement('div');
        const timeRange = document.createElement('div');
        timeRange.className = 'text-sm font-medium dark:text-white';
        timeRange.textContent = `${utils.formatTime(new Date(session.startTime))} - ${utils.formatTime(new Date(session.endTime))}`;
        const duration = document.createElement('div');
        duration.className = 'text-xs text-gray-500 dark:text-gray-300';
        duration.textContent = session.duration;
        sessionInfo.appendChild(timeRange);
        sessionInfo.appendChild(duration);
        if (session.accumulatedPauseTimeSec) {
          const restEl = document.createElement('div');
          restEl.className = 'text-xs text-gray-400 dark:text-gray-400';
          restEl.textContent = `Rest ${utils.formatDuration(session.accumulatedPauseTimeSec)}`;
          sessionInfo.appendChild(restEl);
        }
        const sessionNotes = document.createElement('div');
        sessionNotes.className = 'text-sm text-gray-600 truncate max-w-xs dark:text-gray-200';
        sessionNotes.textContent = session.notes || 'No notes';
        sessionCard.appendChild(sessionInfo);
        sessionCard.appendChild(sessionNotes);
        container.appendChild(sessionCard);
      }
    }
  }

  function populateYearSelector() {
    const selector = document.getElementById('year-selector');
    const s = store.getState();
    if (!selector) return;
    const currentYear = new Date().getFullYear();
    selector.innerHTML = '';
    const years = new Set();
    for (const session of s.sessions) {
      years.add(new Date(session.startTime).getFullYear());
    }
    if (years.size === 0) years.add(currentYear);
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    for (const year of sortedYears) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      if (year === currentYear) option.selected = true;
      selector.appendChild(option);
    }
  }

  function showAddSessionModal() {
    const titleEl = document.getElementById('modal-title');
    const sessionIdEl = document.getElementById('session-id');
    const startInput = document.getElementById('start-time');
    const endInput = document.getElementById('end-time');
    const dayTypeInput = document.getElementById('day-type');
    const modalNotes = document.getElementById('modal-notes');
    const modal = document.getElementById('session-modal');
    if (!modal) return;
    if (titleEl) titleEl.textContent = 'Add New Session';
    if (sessionIdEl) sessionIdEl.value = '';
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
    if (startInput) startInput.value = utils.formatDateTimeLocal(oneHourAgo);
    if (endInput) endInput.value = utils.formatDateTimeLocal(now);
    if (dayTypeInput) dayTypeInput.value = 'Workday';
    if (modalNotes) modalNotes.value = '';
    initializeSessionModalTags();
    const moodRating = document.getElementById('mood-rating');
    const moodInput = document.getElementById('session-mood');
    const moodValue = document.getElementById('mood-value');
    if (moodRating) moodRating.dataset.rating = '5';
    if (moodInput) moodInput.value = '5';
    if (moodValue) moodValue.textContent = '5.0';
    createStars();
    modal.classList.remove('hidden');
  }

  function hideSessionModal() {
    const modal = document.getElementById('session-modal');
    if (modal) modal.classList.add('hidden');
  }

  function showMarkDayModal(dayType) {
    const dateInput = document.getElementById('mark-date');
    const typeInput = document.getElementById('mark-day-type');
    const descInput = document.getElementById('day-description');
    const modal = document.getElementById('mark-day-modal');
    if (!modal) return;
    if (dateInput) dateInput.value = utils.formatDate(new Date());
    if (typeInput) typeInput.value = dayType || 'Holiday';
    if (descInput) descInput.value = '';
    modal.classList.remove('hidden');
  }

  function hideMarkDayModal() {
    const modal = document.getElementById('mark-day-modal');
    if (modal) modal.classList.add('hidden');
  }

  function showDeleteModal(sessionId) {
    const modal = document.getElementById('delete-modal');
    if (modal) {
      modal.dataset.sessionId = sessionId;
      modal.classList.remove('hidden');
    }
  }

  function hideDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
      delete modal.dataset.sessionId;
      modal.classList.add('hidden');
    }
  }

  function showConfigHistoryModal() {
    const list = document.getElementById('config-history-list');
    const modal = document.getElementById('config-history-modal');
    const s = store.getState();
    if (!list || !modal) return;
    list.innerHTML = '';
    if (s.configs.length === 0) {
      list.innerHTML = '<div class="text-center py-4 text-gray-500 dark:text-gray-400">No configuration history available</div>';
    } else {
      for (const [index, config] of s.configs.entries()) {
        const configItem = document.createElement('div');
        configItem.className = `config-version p-3 border-l-3 mb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${index === 0 ? 'border-blue-500' : 'border-gray-300'}`;
        configItem.dataset.configId = config.id;
        const configDate = document.createElement('div');
        configDate.className = 'text-sm font-medium';
        configDate.textContent = new Date(config.timestamp).toLocaleString();
        const configSummary = document.createElement('div');
        configSummary.className = 'text-xs text-gray-500 dark:text-gray-400 mt-1';
        let summaryText = `${config.workingHours}h/day, ${config.breakDuration}m break`;
        if (config.salaryValue > 0) {
          summaryText += `, ${config.salaryType} ${config.salaryTaxType} \u20AC${config.salaryValue.toFixed(2)}`;
        }
        configSummary.textContent = summaryText;
        configItem.appendChild(configDate);
        configItem.appendChild(configSummary);
        if (index > 0) {
          const restoreBtn = document.createElement('button');
          restoreBtn.className = 'text-xs text-blue-600 hover:text-blue-800 mt-2 dark:text-blue-400 dark:hover:text-blue-300';
          restoreBtn.textContent = 'Restore this version';
          restoreBtn.dataset.configId = config.id;
          configItem.appendChild(restoreBtn);
        }
        configItem.addEventListener('click', () => {
          viewConfigDetails(config.id);
        });
        list.appendChild(configItem);
      }
    }
    modal.classList.remove('hidden');
  }

  function hideConfigHistoryModal() {
    const modal = document.getElementById('config-history-modal');
    if (modal) modal.classList.add('hidden');
  }

  function viewConfigDetails(configId) {
    const s = store.getState();
    const config = s.configs.find(c => c.id === configId);
    if (!config) return;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    alert(`Configuration Details:\n\n` +
      `Date: ${new Date(config.timestamp).toLocaleString()}\n` +
      `Working Hours: ${config.workingHours}h/day\n` +
      `Break Duration: ${config.breakDuration}m\n` +
      `Week Starts On: ${days[config.weekStart] || 'Monday'}\n` +
      `Salary Type: ${config.salaryType} ${config.salaryTaxType}\n` +
      `Salary Value: \u20AC${config.salaryValue.toFixed(2)}\n` +
      `Tax Rate: ${config.salaryTax}%\n` +
      `Untaxed Minimum: \u20AC${config.untaxedMin.toFixed(2)}\n` +
      `Inflation Rate: ${config.inflationRate}%`);
  }

  function initializeCurrentSessionTags() {
    const container = document.getElementById('current-session-tags');
    const s = store.getState();
    if (!container) return;
    container.innerHTML = '';
    const enabledTags = s.tags.filter(t => t.isEnabled);
    for (const tag of enabledTags) {
      const tagEl = document.createElement('div');
      tagEl.className = `tag px-2 py-1 rounded-full text-sm cursor-pointer ${tag.name === 'work' ? 'selected' : ''} ${getTagBadgeClass(tag.name)}`;
      tagEl.dataset.tag = tag.name;
      tagEl.textContent = tag.name;
      tagEl.addEventListener('click', () => {
        const selected = container.querySelectorAll('.tag.selected');
        const selectedNames = Array.from(selected).map(el => el.dataset.tag);
        if (selectedNames.length <= 1 && selectedNames.includes(tag.name)) return;
        tagEl.classList.toggle('selected');
        tagEl.classList.toggle('bg-blue-100');
        tagEl.classList.toggle('text-blue-800');
        tagEl.classList.toggle('dark:bg-blue-900');
        tagEl.classList.toggle('dark:text-blue-300');
      });
      container.appendChild(tagEl);
    }
  }

  function initializeSessionModalTags() {
    const container = document.getElementById('tags-container');
    const s = store.getState();
    if (!container) return;
    container.innerHTML = '';
    const enabledTags = s.tags.filter(t => t.isEnabled);
    for (const tag of enabledTags) {
      const tagEl = document.createElement('div');
      tagEl.className = `tag px-2 py-1 rounded-full text-sm cursor-pointer ${tag.name === 'work' ? 'selected' : ''} ${getTagBadgeClass(tag.name)}`;
      tagEl.dataset.tag = tag.name;
      tagEl.textContent = tag.name;
      tagEl.addEventListener('click', () => {
        const selected = container.querySelectorAll('.tag.selected');
        const selectedNames = Array.from(selected).map(el => el.dataset.tag);
        if (selectedNames.length <= 1 && selectedNames.includes(tag.name)) return;
        tagEl.classList.toggle('selected');
        tagEl.classList.toggle('bg-blue-100', tagEl.classList.contains('selected'));
        tagEl.classList.toggle('text-blue-800', tagEl.classList.contains('selected'));
        tagEl.classList.toggle('dark:bg-blue-900', tagEl.classList.contains('selected'));
        tagEl.classList.toggle('dark:text-blue-300', tagEl.classList.contains('selected'));
      });
      container.appendChild(tagEl);
    }
  }

  function setOnTagBucketsChange(cb) {
    _onTagBucketsChange = cb;
  }

  function setupDropZone(container, bucketName) {
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.classList.add('drag-over');
      if (e.ctrlKey || e.metaKey) {
        container.classList.add('drag-over-ctrl');
      } else {
        container.classList.remove('drag-over-ctrl');
      }
    });

    container.addEventListener('dragleave', () => {
      container.classList.remove('drag-over');
      container.classList.remove('drag-over-ctrl');
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      container.classList.remove('drag-over');
      container.classList.remove('drag-over-ctrl');
      const tagName = e.dataTransfer.getData('text/plain');
      const sourceBucket = e.dataTransfer.getData('application/x-source-bucket');
      if (!tagName || !sourceBucket || sourceBucket === bucketName) return;
      const s = store.getState();
      let newBuckets;
      const isCopy = e.ctrlKey || e.metaKey;
      const isUnassignedSrc = sourceBucket === 'unassigned' || !s.tagBuckets[sourceBucket];
      if (isCopy || isUnassignedSrc) {
        if (s.tagBuckets[bucketName] && s.tagBuckets[bucketName].includes(tagName)) return;
        newBuckets = {};
        for (const [bucket, subtags] of Object.entries(s.tagBuckets)) {
          newBuckets[bucket] = [...subtags];
        }
        if (newBuckets[bucketName]) {
          newBuckets[bucketName] = [...newBuckets[bucketName], tagName];
        } else {
          newBuckets[bucketName] = [tagName];
        }
      } else {
        newBuckets = moveSubtagBetweenBuckets(tagName, sourceBucket, bucketName, s.tagBuckets);
      }
      store.setState({ tagBuckets: newBuckets });
      renderTagSettings();
      if (_onTagBucketsChange) _onTagBucketsChange();
    });
  }

  function renderTagSettings() {
    const container = document.getElementById('tag-bucket-settings');
    const s = store.getState();
    if (!container) return;
    container.innerHTML = '';

    const allSubtags = new Set(Object.values(s.tagBuckets).flat());
    const unassignedTags = s.tags.filter(t => !t.isDefault && !allSubtags.has(t.name) && !s.tagBuckets[t.name]);

    for (const [bucketName, subtagNames] of Object.entries(s.tagBuckets)) {
      const bucketTag = s.tags.find(t => t.name === bucketName && t.isDefault);
      const bucketSubtags = subtagNames
        .map(name => s.tags.find(t => t.name === name))
        .filter(Boolean);

      const group = document.createElement('div');
      group.className = 'tag-bucket-group';
      group.dataset.bucket = bucketName;

      const header = document.createElement('button');
      header.className = 'tag-bucket-header text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize flex items-center gap-2 w-full text-left';
      header.type = 'button';

      const arrow = document.createElement('span');
      arrow.className = 'collapse-arrow';
      arrow.textContent = '▼';
      header.appendChild(arrow);

      const nameSpan = document.createElement('span');
      nameSpan.textContent = bucketName;
      header.appendChild(nameSpan);

      const subtagsContainer = document.createElement('div');
      subtagsContainer.className = 'tag-bucket-subtags flex flex-wrap gap-2 ml-4 mt-1';

      if (bucketTag && bucketTag.isDefault) {
        subtagsContainer.appendChild(createTagChip(bucketTag, true));
      }

      if (bucketSubtags.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.className = 'text-xs text-gray-400 italic';
        placeholder.textContent = '(no subtags)';
        subtagsContainer.appendChild(placeholder);
      }

      for (const tag of bucketSubtags) {
        const chip = createTagChip(tag, false);
        chip.dataset.sourceBucket = bucketName;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'ml-2 text-gray-400 hover:text-red-500 tag-remove-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const s = store.getState();
          const newBuckets = removeTagFromBucket(tag.name, bucketName, s.tagBuckets);
          store.setState({ tagBuckets: newBuckets });
          renderTagSettings();
          if (_onTagBucketsChange) _onTagBucketsChange();
        });
        chip.appendChild(removeBtn);
        subtagsContainer.appendChild(chip);
      }

      header.addEventListener('click', () => {
        subtagsContainer.classList.toggle('collapsed');
        arrow.textContent = subtagsContainer.classList.contains('collapsed') ? '▶' : '▼';
      });

      setupDropZone(subtagsContainer, bucketName);

      group.appendChild(header);
      group.appendChild(subtagsContainer);
      container.appendChild(group);
    }

    if (unassignedTags.length > 0) {
      const group = document.createElement('div');
      group.className = 'tag-bucket-group';
      group.dataset.bucket = 'unassigned';

      const header = document.createElement('button');
      header.className = 'tag-bucket-header text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 w-full text-left';
      header.type = 'button';

      const arrow = document.createElement('span');
      arrow.className = 'collapse-arrow';
      arrow.textContent = '▼';
      header.appendChild(arrow);

      const nameSpan = document.createElement('span');
      nameSpan.textContent = 'Unassigned';
      header.appendChild(nameSpan);

      const subtagsContainer = document.createElement('div');
      subtagsContainer.className = 'tag-bucket-subtags flex flex-wrap gap-2 ml-4 mt-1';

      for (const tag of unassignedTags) {
        const chip = createTagChip(tag, false);
        chip.dataset.sourceBucket = 'unassigned';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'ml-2 text-gray-500 hover:text-red-500';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        chip.appendChild(deleteBtn);
        subtagsContainer.appendChild(chip);
      }

      header.addEventListener('click', () => {
        subtagsContainer.classList.toggle('collapsed');
        arrow.textContent = subtagsContainer.classList.contains('collapsed') ? '▶' : '▼';
      });

      setupDropZone(subtagsContainer, 'unassigned');

      group.appendChild(header);
      group.appendChild(subtagsContainer);
      container.appendChild(group);
    }
  }

  function createTagChip(tag, isDefault) {
    const chip = document.createElement('div');
    chip.className = `tag-item flex items-center px-3 py-1 rounded-full text-sm ${getTagBadgeClass(tag.name, tag.isEnabled)}`;
    if (isDefault) chip.dataset.default = 'true';
    chip.draggable = !isDefault;
    chip.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', tag.name);
      e.dataTransfer.setData('application/x-source-bucket', chip.dataset.sourceBucket || '');
    });
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = tag.isEnabled;
    checkbox.className = 'mr-2';
    checkbox.disabled = isDefault;
    checkbox.addEventListener('change', () => {
      const s = store.getState();
      const updated = s.tags.map(t => t.name === tag.name ? { ...t, isEnabled: checkbox.checked } : t);
      store.setState({ tags: updated });
    });
    chip.appendChild(checkbox);
    chip.appendChild(document.createTextNode(tag.name));
    return chip;
  }

  function createStars() {
    const moodRating = document.getElementById('mood-rating');
    if (!moodRating) return;
    const rating = parseFloat(moodRating.dataset.rating) || 5;
    moodRating.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('div');
      star.className = 'star text-2xl cursor-pointer';
      star.dataset.value = i;
      star.innerHTML = i <= rating ? '\u2605' : '\u2606';
      moodRating.appendChild(star);
    }
  }

  function handleStarClick(e) {
    const moodRating = document.getElementById('mood-rating');
    if (!moodRating) return;
    if (e.target.classList.contains('star')) {
      const value = parseFloat(e.target.dataset.value);
      const currentRating = parseFloat(moodRating.dataset.rating) || 5;
      const newRating = value === 0.5 + currentRating ? value - 0.5 : value;
      moodRating.dataset.rating = newRating;
      const sessionMoodInput = document.getElementById('session-mood');
      const moodValueEl = document.getElementById('mood-value');
      if (sessionMoodInput) sessionMoodInput.value = newRating;
      if (moodValueEl) moodValueEl.textContent = newRating.toFixed(1);
      createStars();
    }
  }

  function handleStarHover(e) {
    const moodRating = document.getElementById('mood-rating');
    if (!moodRating) return;
    if (e.target.classList.contains('star')) {
      const hoverValue = parseFloat(e.target.dataset.value);
      const stars = moodRating.querySelectorAll('.star');
      stars.forEach(star => {
        const starValue = parseFloat(star.dataset.value);
        star.innerHTML = starValue <= hoverValue ? '\u2605' : '\u2606';
      });
    }
  }

  function resetStarDisplay() {
    const moodRating = document.getElementById('mood-rating');
    if (!moodRating) return;
    const currentRating = parseFloat(moodRating.dataset.rating) || 5;
    const stars = moodRating.querySelectorAll('.star');
    stars.forEach(star => {
      const starValue = parseFloat(star.dataset.value);
      star.innerHTML = starValue <= currentRating ? '\u2605' : '\u2606';
    });
  }

  function initializeCurrentSessionMood() {
    const container = document.getElementById('current-session-mood');
    if (!container) return;
    container.dataset.rating = '5';
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('div');
      star.className = 'star text-2xl cursor-pointer';
      star.dataset.value = i;
      star.innerHTML = '\u2605';
      star.addEventListener('click', () => {
        container.dataset.rating = i;
        const moodInput = document.getElementById('current-session-mood-input');
        const moodValue = document.getElementById('current-mood-value');
        if (moodInput) moodInput.value = i;
        if (moodValue) moodValue.textContent = i + '.0';
        createStarsForCurrentSession();
      });
      container.appendChild(star);
    }
  }

  function createStarsForCurrentSession() {
    const container = document.getElementById('current-session-mood');
    if (!container) return;
    const rating = parseFloat(container.dataset.rating) || 5;
    const stars = container.querySelectorAll('.star');
    stars.forEach((star, index) => {
      star.innerHTML = index < rating ? '\u2605' : '\u2606';
    });
  }

  function enableDarkMode() {
    document.body.classList.add('dark-mode');
    const toggle = document.getElementById('dark-mode-toggle');
    const setting = document.getElementById('dark-mode-setting');
    if (toggle) toggle.innerHTML = '<i class="fas fa-sun"></i>';
    if (setting) setting.checked = true;
  }

  function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    const toggle = document.getElementById('dark-mode-toggle');
    const setting = document.getElementById('dark-mode-setting');
    if (toggle) toggle.innerHTML = '<i class="fas fa-moon"></i>';
    if (setting) setting.checked = false;
  }

  function toggleDarkMode() {
    const s = store.getState();
    const newMode = !s.darkMode;
    store.setState({ darkMode: newMode });
    if (newMode) {
      enableDarkMode();
    } else {
      disableDarkMode();
    }
  }

  function showCrashRecoveryBanner() {
    const banner = document.getElementById('crash-recovery-banner');
    if (banner) banner.classList.remove('hidden');
  }

  function hideCrashRecoveryBanner() {
    const banner = document.getElementById('crash-recovery-banner');
    if (banner) banner.classList.add('hidden');
  }

  function applyLatestConfig() {
    const s = store.getState();
    if (s.configs.length === 0) return;
    const config = s.configs[0];
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
    if (workingHoursInput) workingHoursInput.value = config.workingHours;
    if (breakDurationSetting) breakDurationSetting.value = config.breakDuration;
    if (weekStartSelect) weekStartSelect.value = config.weekStart || 1;
    if (hourlySalaryRadio) hourlySalaryRadio.checked = config.salaryType === 'hourly';
    if (monthlySalaryRadio) monthlySalaryRadio.checked = config.salaryType !== 'hourly';
    if (netSalaryRadio) netSalaryRadio.checked = config.salaryTaxType === 'net';
    if (bruttoSalaryRadio) bruttoSalaryRadio.checked = config.salaryTaxType !== 'net';
    if (salaryValueInput) salaryValueInput.value = config.salaryValue;
    if (salaryTaxInput) salaryTaxInput.value = config.salaryTax;
    if (untaxedMinInput) untaxedMinInput.value = config.untaxedMin;
    if (inflationRateInput) inflationRateInput.value = config.inflationRate;
    if (darkModeSetting) darkModeSetting.checked = config.darkMode || false;
    if (config.darkMode) {
      enableDarkMode();
    } else {
      disableDarkMode();
    }
    const backupIntervalInput = document.getElementById('backup-interval');
    if (backupIntervalInput) {
      const backupMs = s.backupIntervalMs || 300000;
      backupIntervalInput.value = Math.floor(backupMs / 1000);
    }
  }

  function updateStatistics() {
    const s = store.getState();
    const totalTimeEl = document.getElementById('total-time');
    const sessionsCountEl = document.getElementById('sessions-count');
    const avgDurationEl = document.getElementById('avg-duration');
    if (!totalTimeEl) return;
    if (s.sessions.length === 0) {
      totalTimeEl.textContent = '00:00:00';
      if (sessionsCountEl) sessionsCountEl.textContent = '0';
      if (avgDurationEl) avgDurationEl.textContent = '00:00:00';
      if (timeChart) { timeChart.destroy(); timeChart = null; }
      if (distributionChart) { distributionChart.destroy(); distributionChart = null; }
      if (incomeChart) { incomeChart.destroy(); incomeChart = null; }
      const yearlyTable = document.getElementById('yearly-stats-table');
      const incomeContainer = document.getElementById('income-chart-container');
      if (yearlyTable) yearlyTable.classList.add('hidden');
      if (incomeContainer) incomeContainer.classList.add('hidden');
      return;
    }
    const tagFilter = document.getElementById('tag-filter');
    const moodThreshold = document.getElementById('mood-threshold');
    const selectedTags = tagFilter ? Array.from(tagFilter.selectedOptions).map(opt => opt.value) : [];
    const selectedMoods = moodThreshold ? Array.from(moodThreshold.selectedOptions).map(opt => parseInt(opt.value)) : [];
    let filteredSessions = [...s.sessions];
    if (s.currentStatsPeriod === 'yearly') {
      const yearSelector = document.getElementById('year-selector');
      if (yearSelector) {
        const selectedYear = parseInt(yearSelector.value);
        filteredSessions = filteredSessions.filter(sess => new Date(sess.startTime).getFullYear() === selectedYear);
      }
    }
    if (selectedTags.length > 0 && !selectedTags.includes('all')) {
      filteredSessions = filteredSessions.filter(sess => selectedTags.some(tag => sess.tags && sess.tags.includes(tag)));
    }
    if (selectedMoods.length > 0) {
      filteredSessions = filteredSessions.filter(sess => selectedMoods.includes(Math.floor(sess.mood || 0)));
    }
    const totalSec = filteredSessions.reduce((sum, sess) => sum + sess.durationSec, 0);
    const avgSec = Math.round(totalSec / filteredSessions.length);
    totalTimeEl.textContent = utils.formatDuration(totalSec);
    if (sessionsCountEl) sessionsCountEl.textContent = filteredSessions.length;
    if (avgDurationEl) avgDurationEl.textContent = utils.formatDuration(avgSec);
    const labels = [];
    const data = [];
    const backgroundColors = [];
    const now = new Date();
    const colors = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const currentStatsPeriod = s.currentStatsPeriod;
    if (currentStatsPeriod === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = utils.formatDate(date);
        const daySessions = filteredSessions.filter(sess => sess.date === dateStr);
        const dayTotal = daySessions.reduce((sum, sess) => sum + sess.durationSec, 0);
        labels.push(date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
        data.push(dayTotal / 3600);
        backgroundColors.push(colors[i % colors.length]);
      }
    } else if (currentStatsPeriod === 'weekly') {
      const weekStartDay = s.configs.length > 0 ? s.configs[0].weekStart : 1;
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        const dayDiff = (weekStart.getDay() - weekStartDay + 7) % 7;
        weekStart.setDate(weekStart.getDate() - dayDiff - (7 * i));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekSessions = filteredSessions.filter(sess => {
          const sessionDate = new Date(sess.startTime);
          return sessionDate >= weekStart && sessionDate <= weekEnd;
        });
        const weekTotal = weekSessions.reduce((sum, sess) => sum + sess.durationSec, 0);
        labels.push(`Week ${i === 0 ? 'This' : i === 1 ? 'Last' : i}`);
        data.push(weekTotal / 3600);
        backgroundColors.push(colors[i % colors.length]);
      }
    } else if (currentStatsPeriod === 'monthly') {
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthSessions = filteredSessions.filter(sess => {
          const sessionDate = new Date(sess.startTime);
          return sessionDate.getFullYear() === month.getFullYear() && sessionDate.getMonth() === month.getMonth();
        });
        const monthTotal = monthSessions.reduce((sum, sess) => sum + sess.durationSec, 0);
        labels.push(month.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }));
        data.push(monthTotal / 3600);
        backgroundColors.push(colors[i % colors.length]);
      }
    } else if (currentStatsPeriod === 'yearly') {
      const yearSelector = document.getElementById('year-selector');
      const selectedYear = yearSelector ? parseInt(yearSelector.value) : new Date().getFullYear();
      for (let i = 0; i < 12; i++) {
        const month = new Date(selectedYear, i, 1);
        const monthSessions = filteredSessions.filter(sess => {
          const sessionDate = new Date(sess.startTime);
          return sessionDate.getFullYear() === month.getFullYear() && sessionDate.getMonth() === month.getMonth();
        });
        const monthTotal = monthSessions.reduce((sum, sess) => sum + sess.durationSec, 0);
        labels.push(month.toLocaleDateString(undefined, { month: 'short' }));
        data.push(monthTotal / 3600);
        backgroundColors.push(colors[i % colors.length]);
      }
      updateYearlyStatsTable(selectedYear);
      if (s.configs.length > 0 && s.configs[0].salaryValue) {
        updateIncomeChart(selectedYear);
        const incomeContainer = document.getElementById('income-chart-container');
        if (incomeContainer) incomeContainer.classList.remove('hidden');
      } else {
        const incomeContainer = document.getElementById('income-chart-container');
        if (incomeContainer) incomeContainer.classList.add('hidden');
      }
    }
    const timeCtx = document.getElementById('timeChart');
    if (timeChart) { timeChart.destroy(); timeChart = null; }
    if (timeCtx) {
      timeChart = new Chart(timeCtx.getContext('2d'), {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Hours Worked',
              data,
              backgroundColor: backgroundColors,
              borderColor: backgroundColors.map(c => c.replace('0.8', '1')),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label(context) {
                    const hours = context.raw;
                    const mins = Math.round((hours % 1) * 60);
                    return `${Math.floor(hours)}h ${mins}m`;
                  }
                }
              }
            },
            scales: {
              y: { beginAtZero: true, title: { display: true, text: 'Hours' } }
            }
          }
        });
    }
    const distributionCtx = document.getElementById('distributionChart');
    if (distributionChart) { distributionChart.destroy(); distributionChart = null; }
    if (distributionCtx) {
      const dayTypes = ['Workday', 'Weekend', 'Holiday', 'Vacation'];
      const dayTypeData = dayTypes.map(type => {
        const typeSessions = filteredSessions.filter(sess => sess.dayType === type);
        return typeSessions.reduce((sum, sess) => sum + sess.durationSec, 0) / 3600;
      });
      distributionChart = new Chart(distributionCtx.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: dayTypes,
            datasets: [{
              data: dayTypeData,
              backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6'],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'right' },
              tooltip: {
                callbacks: {
                  label(context) {
                    const hours = context.raw;
                    const mins = Math.round((hours % 1) * 60);
                    return `${context.label}: ${Math.floor(hours)}h ${mins}m`;
                  }
                }
              }
            }
          }
        });
    }
  }

  function updateYearlyStatsTable(year) {
    const s = store.getState();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const body = document.getElementById('yearly-stats-body');
    const table = document.getElementById('yearly-stats-table');
    if (!body || !table) return;
    let tableHTML = '';
    const latestConfig = s.configs[0] || { workingHours: 8, breakDuration: 60 };
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(year, i, 1);
      const monthEnd = new Date(year, i + 1, 0);
      const monthSessions = s.sessions.filter(sess => {
        const sessionDate = new Date(sess.startTime);
        return sessionDate.getFullYear() === monthStart.getFullYear() && sessionDate.getMonth() === monthStart.getMonth();
      });
      const uniqueDates = [...new Set(monthSessions.map(sess => sess.date))];
      const totalHours = monthSessions.reduce((sum, sess) => sum + sess.durationSec, 0) / 3600;
      const workDays = uniqueDates.filter(date => {
        const markedDay = s.markedDays.find(d => d.date === date);
        if (markedDay) return markedDay.dayType === 'Workday';
        const dateObj = new Date(date);
        return dateObj.getDay() !== 0 && dateObj.getDay() !== 6;
      });
      const avgHoursPerDay = workDays.length > 0 ? (totalHours / workDays.length).toFixed(1) : 0;
      const expectedDailyHours = latestConfig.workingHours || 8;
      let daysOverExpected = 0;
      uniqueDates.forEach(date => {
        const dateSessions = monthSessions.filter(sess => sess.date === date);
        const dateTotal = dateSessions.reduce((sum, sess) => sum + sess.durationSec, 0) / 3600;
        if (dateTotal > expectedDailyHours) daysOverExpected++;
      });
      const percentOverExpected = uniqueDates.length > 0 ? Math.round((daysOverExpected / uniqueDates.length) * 100) : 0;
      const holidays = s.markedDays.filter(d => d.dayType === 'Holiday' && new Date(d.date).getFullYear() === year && new Date(d.date).getMonth() === i).length;
      const vacations = s.markedDays.filter(d => d.dayType === 'Vacation' && new Date(d.date).getFullYear() === year && new Date(d.date).getMonth() === i).length;
      tableHTML += `<tr>
        <td class="px-4 py-2 border-b dark:border-gray-600">${months[i]}</td>
        <td class="px-4 py-2 border-b dark:border-gray-600">${totalHours.toFixed(1)}</td>
        <td class="px-4 py-2 border-b dark:border-gray-600">${workDays.length}</td>
        <td class="px-4 py-2 border-b dark:border-gray-600">${avgHoursPerDay}</td>
        <td class="px-4 py-2 border-b dark:border-gray-600">${percentOverExpected}%</td>
        <td class="px-4 py-2 border-b dark:border-gray-600">${holidays}</td>
        <td class="px-4 py-2 border-b dark:border-gray-600">${vacations}</td>
      </tr>`;
    }
    body.innerHTML = tableHTML;
    table.classList.remove('hidden');
  }

  function updateIncomeChart(year) {
    const s = store.getState();
    if (s.configs.length === 0 || !s.configs[0].salaryValue) return;
    const incomeCtx = document.getElementById('incomeChart');
    if (!incomeCtx) return;
    const config = s.configs[0];
    const isHourly = config.salaryType === 'hourly';
    const isNet = config.salaryTaxType === 'net';
    const salaryValue = config.salaryValue;
    const taxRate = config.salaryTax / 100;
    const months = [];
    const incomeData = [];
    for (let i = 0; i < 12; i++) {
      const month = new Date(year, i, 1);
      const monthName = month.toLocaleDateString(undefined, { month: 'short' });
      months.push(monthName);
      const monthSessions = s.sessions.filter(sess => {
        const sessionDate = new Date(sess.startTime);
        return sessionDate.getFullYear() === year && sessionDate.getMonth() === i;
      });
      const totalHours = monthSessions.reduce((sum, sess) => sum + sess.durationSec, 0) / 3600;
      let income;
      if (isHourly) {
        income = totalHours * salaryValue;
        if (!isNet) income = income * (1 - taxRate);
      } else {
        const workDays = monthSessions.map(sess => sess.date).filter((date, index, self) => self.indexOf(date) === index)
          .filter(date => {
            const markedDay = s.markedDays.find(d => d.date === date);
            if (markedDay) return markedDay.dayType === 'Workday';
            const dateObj = new Date(date);
            return dateObj.getDay() !== 0 && dateObj.getDay() !== 6;
          }).length;
        const workDaysInMonth = getWorkDaysInMonth(year, i);
        income = (workDays / workDaysInMonth) * salaryValue;
        if (!isNet) income = income * (1 - taxRate);
      }
      incomeData.push(income.toFixed(2));
    }
    if (incomeChart) { incomeChart.destroy(); incomeChart = null; }
    incomeChart = new Chart(incomeCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Income (\u20AC)',
          data: incomeData,
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          borderWidth: 2,
          fill: false
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) { return `Income: \u20AC${context.raw}`; }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Income (\u20AC)' } }
        }
      }
    });
  }

  function getWorkDaysInMonth(year, month) {
    const date = new Date(year, month, 1);
    let workDays = 0;
    while (date.getMonth() === month) {
      const day = date.getDay();
      if (day !== 0 && day !== 6) workDays++;
      date.setDate(date.getDate() + 1);
    }
    return workDays;
  }

  return {
    updateCurrentTime,
    updateTimerDisplay,
    updateTimerDisplayEl,
    updateTodayTotal,
    updateTodayStatus,
    updateButtonStates,
    switchTab,
    switchSettingsTab,
    switchStatsPeriod,
    renderRecentSessions,
    toggleRecentSessionsGrid,
    renderAllSessions,
    populateYearSelector,
    showAddSessionModal,
    hideSessionModal,
    showMarkDayModal,
    hideMarkDayModal,
    showDeleteModal,
    hideDeleteModal,
    showConfigHistoryModal,
    hideConfigHistoryModal,
    viewConfigDetails,
    createStars,
    handleStarClick,
    handleStarHover,
    resetStarDisplay,
    initializeCurrentSessionTags,
    initializeSessionModalTags,
    initializeCurrentSessionMood,
    createStarsForCurrentSession,
    renderTagSettings,
    setOnTagBucketsChange,
    getTagBadgeClass,
    enableDarkMode,
    disableDarkMode,
    toggleDarkMode,
    showCrashRecoveryBanner,
    hideCrashRecoveryBanner,
    applyLatestConfig,
    updateStatistics,
    updateYearlyStatsTable,
    updateIncomeChart,
    getWorkDaysInMonth,
  };
}
