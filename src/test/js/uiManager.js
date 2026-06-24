import { appState } from './state.js';
import { sessionManager } from './sessionManager.js';
import { statsManager } from './statsManager.js';
import { configManager } from './configManager.js';
import { formatDate, formatTime, formatDuration } from './utils.js';

export const uiManager = {
  init() {
    this.cacheDOMElements();
    this.renderInitialUI();
    this.setupStateListeners();
  },

  cacheDOMElements() {
    this.elements = {
      // Current elements
      currentTimeEl: document.getElementById('current-time'),
      sessionDurationEl: document.getElementById('session-duration'),
      
      // Buttons
      startBtn: document.getElementById('start-btn'),
      stopBtn: document.getElementById('stop-btn'),
      pauseBtn: document.getElementById('pause-btn'),
      addSessionBtn: document.getElementById('add-session-btn'),
      applyFiltersBtn: document.getElementById('apply-filters-btn'),
      
      // Tabs
      trackerTab: document.getElementById('tracker-tab'),
      sessionsTab: document.getElementById('sessions-tab'),
      statsTab: document.getElementById('stats-tab'),
      configTab: document.getElementById('config-tab'),
      
      // Content areas
      trackerContent: document.getElementById('tracker-content'),
      sessionsContent: document.getElementById('sessions-content'),
      statsContent: document.getElementById('stats-content'),
      configContent: document.getElementById('config-content'),
      
      // Session lists
      recentSessionsList: document.getElementById('recent-sessions-list'),
      allSessionsList: document.getElementById('all-sessions-list'),
      
      // Forms and modals
      sessionForm: document.getElementById('session-form'),
      
      // Settings tabs
      settingsTabButtons: document.querySelectorAll('[data-settings-tab]'),
      
      // Configuration elements
      darkModeToggle: document.getElementById('dark-mode-toggle'),
      darkModeSetting: document.getElementById('dark-mode-setting')
    };
  },

  renderInitialUI() {
    this.updateCurrentTime();
    setInterval(() => this.updateCurrentTime(), 1000);
    
    // Load initial data
    //sessionManager.loadSessions();
    //configManager.loadConfigs();
    
    // Render initial views
    this.renderRecentSessions();
    this.updateTodayTotal();
  },

  setupStateListeners() {
    appState.addListener((updates) => {
      if ('sessions' in updates) {
        this.renderRecentSessions();
        this.updateTodayTotal();
      }
      
      if ('currentDuration' in updates) {
        this.elements.sessionDurationEl.textContent = 
          formatDuration(updates.currentDuration);
      }
      
      if ('darkMode' in updates) {
        document.body.classList.toggle('dark-mode', updates.darkMode);
      }
      
      // Add other state change listeners...
    });
  },

  updateCurrentTime() {
    this.elements.currentTimeEl.textContent = formatTime(new Date());
  },

  renderRecentSessions() {
    const { sessions } = appState.getState();
    const recentSessionsList = this.elements.recentSessionsList;
    
    if (!recentSessionsList) {
      console.error('Recent sessions list element not found');
      return;
    }
    
    recentSessionsList.innerHTML = '';
    
    // Get today's sessions
    const today = new Date().toLocaleDateString();
    const todaySessions = sessions.filter(s => 
      new Date(s.startTime).toLocaleDateString() === today
    );
    
    if (todaySessions.length === 0) {
      recentSessionsList.innerHTML = `
        <p class="text-gray-500 dark:text-gray-400 text-center py-4">
          No sessions recorded today.
        </p>
      `;
      return;
    }
    
    // Display recent sessions (limit to 5)
    todaySessions.slice(0, 5).forEach(session => {
      const sessionEl = document.createElement('div');
      sessionEl.className = 'bg-gray-50 dark:bg-gray-800 p-4 rounded-lg';
      
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      const duration = Math.floor((endTime - startTime) / 1000);
      
      sessionEl.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <span class="font-medium">${formatTime(startTime)} - ${formatTime(endTime)}</span>
            <span class="ml-2 text-gray-600 dark:text-gray-400">${formatDuration(duration)}</span>
          </div>
          <div class="flex space-x-2">
            ${session.tags ? session.tags.map(tag => 
              `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded dark:bg-blue-900 dark:text-blue-300">${tag}</span>`
            ).join('') : ''}
          </div>
        </div>
        ${session.notes ? `<p class="text-gray-600 dark:text-gray-400 mt-2 text-sm">${session.notes}</p>` : ''}
      `;
      
      recentSessionsList.appendChild(sessionEl);
    });
  },

  updateTodayTotal() {
    const { sessions } = appState.getState();
    const todayTotalEl = document.getElementById('today-total');
    
    if (!todayTotalEl) return;
    
    // Calculate today's total
    const today = new Date().toLocaleDateString();
    const todaySessions = sessions.filter(s => 
      new Date(s.startTime).toLocaleDateString() === today
    );
    
    let totalSeconds = 0;
    todaySessions.forEach(session => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      totalSeconds += Math.floor((endTime - startTime) / 1000);
    });
    
    todayTotalEl.textContent = formatDuration(totalSeconds);
  },

  setupEventListeners() {
    console.log('Setting up event listeners');

    // Session controls
    if (this.elements.startBtn) {
      this.elements.startBtn.addEventListener('click', () => {
        console.log('Start button clicked');
        sessionManager.startSession();
      });
    }

    if (this.elements.stopBtn) {
      this.elements.stopBtn.addEventListener('click', () => {
        console.log('Stop button clicked');
        sessionManager.stopSession();
      });
    }

    if (this.elements.pauseBtn) {
      this.elements.pauseBtn.addEventListener('click', () => {
        console.log('Pause button clicked');
        sessionManager.pauseSession();
      });
    }

    // Add session button
    if (this.elements.addSessionBtn) {
      this.elements.addSessionBtn.addEventListener('click', () => {
        console.log('Add session button clicked');
        this.showAddSessionModal();
      });
    }

    // Apply filters button
    if (this.elements.applyFiltersBtn) {
      this.elements.applyFiltersBtn.addEventListener('click', () => {
        console.log('Apply filters button clicked');
        this.applyFilters();
      });
    }

    // Dark mode toggle
    if (this.elements.darkModeToggle) {
      this.elements.darkModeToggle.addEventListener('click', () => {
        const { darkMode } = appState.getState();
        appState.updateState({ darkMode: !darkMode });
      });
    }
  },

  switchTab(tabName) {
    const { trackerContent, sessionsContent, statsContent, configContent,
            trackerTab, sessionsTab, statsTab, configTab } = this.elements;
  
    // Hide all content
    [trackerContent, sessionsContent, statsContent, configContent].forEach(content => {
      if (content) content.classList.add('hidden');
    });
  
    // Remove active class from all tabs
    [trackerTab, sessionsTab, statsTab, configTab].forEach(tab => {
      if (tab) tab.classList.remove('tab-active');
    });
  
    // Show selected content and activate tab
    const contentMap = {
      tracker: trackerContent,
      sessions: sessionsContent,
      stats: statsContent,
      config: configContent
    };
  
    const tabMap = {
      tracker: trackerTab,
      sessions: sessionsTab,
      stats: statsTab,
      config: configTab
    };
  
    if (contentMap[tabName]) contentMap[tabName].classList.remove('hidden');
    if (tabMap[tabName]) tabMap[tabName].classList.add('tab-active');
  
    // Update stats if stats tab is selected
    if (tabName === 'stats') {
      const { statsManager } = window;
      if (statsManager) statsManager.updateStatistics();
    }
  },

  getDayTypeBadgeClass(dayType) {
    switch(dayType) {
      case 'Weekend': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'Holiday': return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100';
      case 'Vacation': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'Sick': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  },

  applyFilters() {
    const dateFilter = document.getElementById('date-filter');
    const monthFilter = document.getElementById('month-filter');
    const yearFilter = document.getElementById('year-filter');
    const dayTypeFilter = document.getElementById('day-type-filter');
    
    if (!dateFilter || !monthFilter || !yearFilter || !dayTypeFilter) {
      console.error('Filter elements not found');
      return;
    }
    
    const { sessions } = appState.getState();
    let filtered = [...sessions];
    
    if (dateFilter.value) {
      filtered = filtered.filter(s => {
        const sessionDate = new Date(s.startTime).toISOString().split('T')[0];
        return sessionDate === dateFilter.value;
      });
    }
    
    if (monthFilter.value) {
      filtered = filtered.filter(s => {
        const sessionMonth = new Date(s.startTime).getMonth() + 1;
        return sessionMonth === parseInt(monthFilter.value);
      });
    }
    
    if (yearFilter.value) {
      filtered = filtered.filter(s => {
        const sessionYear = new Date(s.startTime).getFullYear();
        return sessionYear === parseInt(yearFilter.value);
      });
    }
    
    if (dayTypeFilter.value && dayTypeFilter.value !== 'all') {
      filtered = filtered.filter(s => s.dayType === dayTypeFilter.value);
    }
    
    this.renderAllSessions(filtered);
  },

  renderAllSessions(filteredSessions) {
    const { sessions } = appState.getState();
    const allSessionsList = this.elements.allSessionsList;
    
    if (!allSessionsList) {
      console.error('All sessions list element not found');
      return;
    }
    
    const sessionsToRender = filteredSessions || sessions;
    
    allSessionsList.innerHTML = '';
    
    if (sessionsToRender.length === 0) {
      allSessionsList.innerHTML = `
        <p class="text-gray-500 dark:text-gray-400 text-center py-8">
          No sessions found. Start tracking or add a session manually.
        </p>
      `;
      return;
    }
    
    // Group sessions by date
    const sessionsByDate = {};
    sessionsToRender.forEach(session => {
      const date = new Date(session.startTime).toLocaleDateString();
      if (!sessionsByDate[date]) {
        sessionsByDate[date] = [];
      }
      sessionsByDate[date].push(session);
    });
    
    // Render sessions grouped by date
    Object.keys(sessionsByDate).sort((a, b) => 
      new Date(b) - new Date(a)
    ).forEach(date => {
      const dateHeader = document.createElement('div');
      dateHeader.className = 'flex justify-between items-center mb-2 mt-4';
      dateHeader.innerHTML = `
        <h3 class="font-medium text-lg">${date}</h3>
        <span class="text-sm text-gray-600 dark:text-gray-400">
          ${formatDuration(this.calculateTotalDuration(sessionsByDate[date]))}
        </span>
      `;
      
      allSessionsList.appendChild(dateHeader);
      
      sessionsByDate[date].forEach(session => {
        this.renderSessionItem(session, allSessionsList);
      });
    });
  },

  calculateTotalDuration(sessions) {
    let total = 0;
    sessions.forEach(session => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      total += Math.floor((endTime - startTime) / 1000);
    });
    return total;
  },

  renderSessionItem(session, container) {
    const sessionEl = document.createElement('div');
    sessionEl.className = 'bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600';
    
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);
    const duration = Math.floor((endTime - startTime) / 1000);
    
    sessionEl.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <span class="font-medium">${formatTime(startTime)} - ${formatTime(endTime)}</span>
          <span class="ml-2 text-gray-600 dark:text-gray-400">${formatDuration(duration)}</span>
        </div>
        <div class="flex space-x-2">
          <button class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" data-edit="${session.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" data-delete="${session.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="flex mt-2 space-x-2">
        ${session.tags ? session.tags.map(tag => 
          `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded dark:bg-blue-900 dark:text-blue-300">${tag}</span>`
        ).join('') : ''}
      </div>
      ${session.notes ? `<p class="text-gray-600 dark:text-gray-400 mt-2 text-sm">${session.notes}</p>` : ''}
    `;
    
    // Add event listeners for edit and delete buttons
    const editBtn = sessionEl.querySelector(`[data-edit="${session.id}"]`);
    const deleteBtn = sessionEl.querySelector(`[data-delete="${session.id}"]`);
    
    if (editBtn) {
      editBtn.addEventListener('click', () => this.editSession(session.id));
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.showDeleteModal(session.id));
    }
    
    container.appendChild(sessionEl);
  },

  showAddSessionModal() {
    const { sessionModal } = this.elements;
    if (!sessionModal) return;
    
    // Get form elements
    const startTimeInput = sessionModal.querySelector('#start-time');
    const endTimeInput = sessionModal.querySelector('#end-time');
    const dayTypeInput = sessionModal.querySelector('#day-type');
    const modalNotes = sessionModal.querySelector('#session-notes');
    const sessionMoodInput = sessionModal.querySelector('#session-mood');
    const moodRatingEl = sessionModal.querySelector('#mood-rating');
    const moodValueEl = sessionModal.querySelector('#mood-value');
    
    // Set modal title
    const modalTitle = sessionModal.querySelector('#modal-title');
    if (modalTitle) modalTitle.textContent = 'Add New Session';
    
    // Clear session ID
    const sessionIdInput = sessionModal.querySelector('#session-id');
    if (sessionIdInput) sessionIdInput.value = '';
    
    // Set default times
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
    
    if (startTimeInput) startTimeInput.value = this.formatDateTimeLocal(oneHourAgo);
    if (endTimeInput) endTimeInput.value = this.formatDateTimeLocal(now);
    if (dayTypeInput) dayTypeInput.value = 'Workday';
    if (modalNotes) modalNotes.value = '';
    
    // Initialize tags and mood
    this.initializeSessionModalTags();
    
    if (moodRatingEl) moodRatingEl.dataset.rating = '5';
    if (sessionMoodInput) sessionMoodInput.value = '5';
    if (moodValueEl) moodValueEl.textContent = '5.0';
    
    // Show modal
    sessionModal.classList.remove('hidden');
  },

  handleSessionFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const sessionId = form.querySelector('#session-id')?.value;
    const startTimeStr = form.querySelector('#start-time')?.value;
    const endTimeStr = form.querySelector('#end-time')?.value;
    const dayType = form.querySelector('#day-type')?.value;
    const notes = form.querySelector('#session-notes')?.value;
    const moodRating = form.querySelector('#session-mood')?.value;
    
    // Get selected tags
    const selectedTags = Array.from(form.querySelectorAll('.tag-checkbox:checked'))
      .map(checkbox => checkbox.value);
    
    if (!startTimeStr || !endTimeStr) {
      alert('Please fill in all required fields');
      return;
    }
    
    const startTime = new Date(startTimeStr.replace('T', ' '));
    const endTime = new Date(endTimeStr.replace('T', ' '));
    
    if (startTime >= endTime) {
      alert('End time must be after start time');
      return;
    }
    
    if (sessionId) {
      // Edit existing session
      sessionManager.editSession(parseInt(sessionId), {
        startTime,
        endTime,
        dayType,
        notes,
        tags: selectedTags,
        mood: parseFloat(moodRating)
      });
    } else {
      // Add new session
      sessionManager.saveSession({
        startTime,
        endTime,
        dayType,
        notes,
        tags: selectedTags,
        mood: parseFloat(moodRating)
      });
    }
    
    this.hideSessionModal();
  },

  hideSessionModal() {
    const { sessionModal } = this.elements;
    if (sessionModal) sessionModal.classList.add('hidden');
  },

  formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  },

  initializeSessionModalTags() {
    const { sessionModal } = this.elements;
    if (!sessionModal) return;
    
    const tagsContainer = sessionModal.querySelector('#tags-container');
    if (!tagsContainer) return;
    
    const { tags } = appState.getState();
    
    tagsContainer.innerHTML = tags
      .filter(tag => tag.isEnabled)
      .map(tag => `
        <label class="inline-flex items-center mr-3 mb-2">
          <input type="checkbox" class="tag-checkbox form-checkbox h-4 w-4 text-blue-600" value="${tag.name}">
          <span class="ml-2 text-sm">${tag.name}</span>
        </label>
      `).join('');
  },

  showEditSessionModal(sessionId) {
    const { sessionModal } = this.elements;
    if (!sessionModal) return;
    
    const { sessions } = appState.getState();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) return;
    
    // Get form elements
    const modalTitle = sessionModal.querySelector('#modal-title');
    const sessionIdInput = sessionModal.querySelector('#session-id');
    const startTimeInput = sessionModal.querySelector('#start-time');
    const endTimeInput = sessionModal.querySelector('#end-time');
    const dayTypeInput = sessionModal.querySelector('#day-type');
    const modalNotes = sessionModal.querySelector('#session-notes');
    const sessionMoodInput = sessionModal.querySelector('#session-mood');
    const moodRatingEl = sessionModal.querySelector('#mood-rating');
    const moodValueEl = sessionModal.querySelector('#mood-value');
    
    // Set modal title and session ID
    if (modalTitle) modalTitle.textContent = 'Edit Session';
    if (sessionIdInput) sessionIdInput.value = session.id;
    
    // Set form values
    if (startTimeInput) startTimeInput.value = this.formatDateTimeLocal(new Date(session.startTime));
    if (endTimeInput) endTimeInput.value = this.formatDateTimeLocal(new Date(session.endTime));
    if (dayTypeInput) dayTypeInput.value = session.dayType;
    if (modalNotes) modalNotes.value = session.notes || '';
    
    // Initialize tags
    this.initializeSessionModalTags();
    
    // Set selected tags
    setTimeout(() => {
      const tagCheckboxes = sessionModal.querySelectorAll('.tag-checkbox');
      tagCheckboxes.forEach(checkbox => {
        checkbox.checked = session.tags.includes(checkbox.value);
      });
    }, 0);
    
    // Set mood rating
    if (moodRatingEl) moodRatingEl.dataset.rating = session.mood.toString();
    if (sessionMoodInput) sessionMoodInput.value = session.mood.toString();
    if (moodValueEl) moodValueEl.textContent = session.mood.toFixed(1);
    
    // Show modal
    sessionModal.classList.remove('hidden');
  },

  showDeleteConfirmation(sessionId) {
    const { sessions } = appState.getState();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) return;
    
    // Create confirmation modal if it doesn't exist
    let confirmationModal = document.getElementById('confirmation-modal');
    
    if (!confirmationModal) {
      confirmationModal = document.createElement('div');
      confirmationModal.id = 'confirmation-modal';
      confirmationModal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50';
      confirmationModal.innerHTML = `
        <div class="confirmation-modal bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto dark:bg-gray-700 dark:text-white">
          <h3 class="text-lg font-semibold mb-4">Confirm Deletion</h3>
          <p class="mb-6">Are you sure you want to delete this session? This action cannot be undone.</p>
          <div class="flex justify-end space-x-3">
            <button id="cancel-delete" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg dark:bg-gray-600 dark:hover:bg-gray-500">
              Cancel
            </button>
            <button id="confirm-delete" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg">
              Delete
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmationModal);
      
      // Add event listeners
      document.getElementById('cancel-delete').addEventListener('click', () => {
        confirmationModal.classList.add('hidden');
      });
      
      document.getElementById('confirm-delete').addEventListener('click', () => {
        const sessionToDeleteId = parseInt(confirmationModal.dataset.sessionId);
        sessionManager.deleteSession(sessionToDeleteId);
        confirmationModal.classList.add('hidden');
      });
    }
    
    // Set session ID and show modal
    confirmationModal.dataset.sessionId = sessionId.toString();
    confirmationModal.classList.remove('hidden');
  },

  // Utility functions
  formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },
  
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  },
  
  formatDate(date) {
    return date.toISOString().split('T')[0];
  },
  
  formatDateTimeLocal(date) {
    return date.toISOString().slice(0, 16);
  }
};
