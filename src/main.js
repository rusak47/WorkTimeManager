
        // Initialize variables
        let tags = [];
        const defaultTags = ['work', 'rest'];
        const presetTags = ['sleep', 'read', 'study', 'socialize', 'write', 'sport', 'music', 'hygiene', 'tv', 'online', 'home tasks'];

        let timerInterval;
        let sessionStartTime;
        let sessionPauseTime = 0;
        let isSessionPaused = false;
        let sessions = [];
        let breakSessions = []; // Array to store break sessions
        let configs = [];
        let markedDays = [];
        let currentTab = 'tracker';
        let currentStatsPeriod = 'daily';
        let timeChart, distributionChart, incomeChart;
        let sessionToDelete = null;
        let darkMode = localStorage.getItem('darkMode') === 'true';
        

        // DOM Elements
        const tagsSettingsTab = document.querySelector('[data-settings-tab="tags"]');
        const tagsContainer = document.getElementById('tags-container');
        const sessionTagsInput = document.getElementById('session-tags');
        const moodRatingEl = document.getElementById('mood-rating');
        const moodValueEl = document.getElementById('mood-value');
        const sessionMoodInput = document.getElementById('session-mood');
        const tagFilter = document.getElementById('tag-filter');
        const moodThreshold = document.getElementById('mood-threshold');

        const trackerTab = document.getElementById('tracker-tab');
        const sessionsTab = document.getElementById('sessions-tab');
        const statsTab = document.getElementById('stats-tab');
        const configTab = document.getElementById('config-tab');
        const trackerContent = document.getElementById('tracker-content');
        const sessionsContent = document.getElementById('sessions-content');
        const statsContent = document.getElementById('stats-content');
        const configContent = document.getElementById('config-content');
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const currentTimeEl = document.getElementById('current-time');
        const sessionDurationEl = document.getElementById('session-duration');
        const todayTotalEl = document.getElementById('today-total');
        const sessionNotes = document.getElementById('session-notes');
        const notesInput = document.getElementById('notes');
        const saveSessionBtn = document.getElementById('save-session');
        const recentSessionsEl = document.getElementById('recent-sessions');
        const allSessionsList = document.getElementById('all-sessions-list');
        const addSessionBtn = document.getElementById('add-session-btn');
        const sessionModal = document.getElementById('session-modal');
        const closeModalBtn = document.getElementById('close-modal');
        const cancelSessionBtn = document.getElementById('cancel-session');
        const sessionForm = document.getElementById('session-form');
        const startTimeInput = document.getElementById('start-time');
        const endTimeInput = document.getElementById('end-time');
        const dayTypeInput = document.getElementById('day-type');
        const modalNotes = document.getElementById('modal-notes');
        const dateFilter = document.getElementById('date-filter');
        const monthFilter = document.getElementById('month-filter');
        const yearFilter = document.getElementById('year-filter');
        const dayTypeFilter = document.getElementById('day-type-filter');
        const applyFiltersBtn = document.getElementById('apply-filters');
        const dailyStatsBtn = document.getElementById('daily-stats');
        const weeklyStatsBtn = document.getElementById('weekly-stats');
        const monthlyStatsBtn = document.getElementById('monthly-stats');
        const yearlyStatsBtn = document.getElementById('yearly-stats');
        const statsPeriodTitle = document.getElementById('stats-period-title');
        const yearSelector = document.getElementById('year-selector');
        const totalTimeEl = document.getElementById('total-time');
        const sessionsCountEl = document.getElementById('sessions-count');
        const avgDurationEl = document.getElementById('avg-duration');
        const deleteModal = document.getElementById('delete-modal');
        const closeDeleteModalBtn = document.getElementById('close-delete-modal');
        const cancelDeleteBtn = document.getElementById('cancel-delete');
        const confirmDeleteBtn = document.getElementById('confirm-delete');
        const markHolidayBtn = document.getElementById('mark-holiday');
        const markVacationBtn = document.getElementById('mark-vacation');
        const markDayModal = document.getElementById('mark-day-modal');
        const markDateInput = document.getElementById('mark-date');
        const markDayTypeInput = document.getElementById('mark-day-type');
        const dayDescriptionInput = document.getElementById('day-description');
        const saveMarkDayBtn = document.getElementById('save-mark-day');
        const cancelMarkDayBtn = document.getElementById('cancel-mark-day');
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        const darkModeSetting = document.getElementById('dark-mode-setting');
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
        const saveSettingsBtn = document.getElementById('save-settings');
        const viewConfigHistoryBtn = document.getElementById('view-config-history');
        const configHistoryModal = document.getElementById('config-history-modal');
        const configHistoryList = document.getElementById('config-history-list');
        const closeConfigHistoryBtn = document.getElementById('close-config-history');
        const exportAllDataBtn = document.getElementById('export-all-data');
        const importDataBtn = document.getElementById('import-data');
        const importFileInput = document.getElementById('import-file');
        const resetSessionsBtn = document.getElementById('reset-sessions');
        const resetConfigBtn = document.getElementById('reset-config');
        const resetMarkedDaysBtn = document.getElementById('reset-marked-days');
        const settingsTabButtons = document.querySelectorAll('[data-settings-tab]');
        const settingsTabs = {
            general: document.getElementById('general-settings'),
            salary: document.getElementById('salary-settings'),
	    tags: document.getElementById('tags-settings'), 
            backup: document.getElementById('backup-settings')
        };
        const yearlyStatsTable = document.getElementById('yearly-stats-table');
        const yearlyStatsBody = document.getElementById('yearly-stats-body');
        const incomeChartContainer = document.getElementById('income-chart-container');

        // Initialize the app
        document.addEventListener('DOMContentLoaded', () => {
            updateCurrentTime();
            setInterval(updateCurrentTime, 1000);
            loadSessions();
            loadConfigs();
            loadMarkedDays();
            loadBreakSessions();  //todo remove
            loadTags();
            createStars();
            initializeCurrentSessionTags();
            initializeCurrentSessionMood();
            setupEventListeners();
            
            if (darkMode) { enableDarkMode();   }
            
            // Set default date for mark day modal
            markDateInput.value = formatDate(new Date());
            
            // Populate year selector
            populateYearSelector();

            // Populate tag filter
            const enabledTags = tags.filter(t => t.isEnabled);
            tagFilter.innerHTML = `
                <option value="work" selected>Work</option>
                <option value="all">All Tags</option>
                ${enabledTags
                    .filter(t => t.name !== 'work')
                    .map(t => `<option value="${t.name}">${t.name}</option>`)
                    .join('')}
            `;
        });

        // Set up event listeners
        function setupEventListeners() {
            //mood tracking and session tagging
            tagsSettingsTab.addEventListener('click', () => switchSettingsTab('tags'));
            document.getElementById('add-tag-btn').addEventListener('click', addCustomTag);
            moodRatingEl.addEventListener('click', handleStarClick);
            moodRatingEl.addEventListener('mousemove', handleStarHover);
            moodRatingEl.addEventListener('mouseleave', resetStarDisplay);

            // Tab navigation
            trackerTab.addEventListener('click', () => switchTab('tracker'));
            sessionsTab.addEventListener('click', () => switchTab('sessions'));
            statsTab.addEventListener('click', () => switchTab('stats'));
            configTab.addEventListener('click', () => switchTab('config'));
            
            // Session tracking
            startBtn.addEventListener('click', startSession);
            stopBtn.addEventListener('click', stopSession);
            pauseBtn.addEventListener('click', pauseSession);
            saveSessionBtn.addEventListener('click', saveSession);
            
            // Session management
            addSessionBtn.addEventListener('click', showAddSessionModal);
            closeModalBtn.addEventListener('click', hideSessionModal);
            cancelSessionBtn.addEventListener('click', hideSessionModal);
            sessionForm.addEventListener('submit', handleSessionFormSubmit);
            applyFiltersBtn.addEventListener('click', applyFilters);
            
            // Mark day buttons
            markHolidayBtn.addEventListener('click', () => showMarkDayModal('Holiday'));
            markVacationBtn.addEventListener('click', () => showMarkDayModal('Vacation'));
            saveMarkDayBtn.addEventListener('click', saveMarkedDay);
            cancelMarkDayBtn.addEventListener('click', hideMarkDayModal);
            
            // Statistics
            dailyStatsBtn.addEventListener('click', () => switchStatsPeriod('daily'));
            weeklyStatsBtn.addEventListener('click', () => switchStatsPeriod('weekly'));
            monthlyStatsBtn.addEventListener('click', () => switchStatsPeriod('monthly'));
            yearlyStatsBtn.addEventListener('click', () => switchStatsPeriod('yearly'));
            yearSelector.addEventListener('change', updateStatistics);
            
            // Delete confirmation
            closeDeleteModalBtn.addEventListener('click', hideDeleteModal);
            cancelDeleteBtn.addEventListener('click', hideDeleteModal);
            confirmDeleteBtn.addEventListener('click', confirmDeleteSession);
            
            // Dark mode toggle
            darkModeToggle.addEventListener('click', toggleDarkMode);
            darkModeSetting.addEventListener('change', toggleDarkMode);
            
            // Configuration tab
            settingsTabButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tab = btn.getAttribute('data-settings-tab');
                    switchSettingsTab(tab);
                });
            });
            
            saveSettingsBtn.addEventListener('click', saveConfig);
            viewConfigHistoryBtn.addEventListener('click', showConfigHistoryModal);
            closeConfigHistoryBtn.addEventListener('click', hideConfigHistoryModal);
            
            // Backup/restore
            exportAllDataBtn.addEventListener('click', exportAllData);
            importDataBtn.addEventListener('click', () => importFileInput.click());
            importFileInput.addEventListener('change', importData);
            resetSessionsBtn.addEventListener('click', () => showConfirmation('Reset Sessions', 'Are you sure you want to delete all sessions?', resetSessions));
            resetConfigBtn.addEventListener('click', () => showConfirmation('Reset Config', 'Are you sure you want to reset all settings?', resetConfig));
            resetMarkedDaysBtn.addEventListener('click', () => showConfirmation('Reset Marked Days', 'Are you sure you want to reset all marked days?', resetMarkedDays));
        }

        // Update current time display
        function updateCurrentTime() {
            const now = new Date();
            currentTimeEl.textContent = formatTime(now);
        }

        // Format time as HH:MM:SS
        function formatTime(date) {
            return date.toLocaleTimeString();
        }

        // Format date as YYYY-MM-DD
        function formatDate(date) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Format duration as HH:MM:SS
        function formatDuration(seconds) {
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }

        // Parse duration string to seconds
        function parseDuration(duration) {
            const [hrs, mins, secs] = duration.split(':').map(Number);
            return hrs * 3600 + mins * 60 + secs;
        }

        // Start a new session
        function startSession() {
            sessionStartTime = new Date();
            startBtn.disabled = true;
            stopBtn.disabled = false;
            pauseBtn.disabled = false;
            startBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            startBtn.classList.add('bg-gray-300', 'cursor-not-allowed');
            stopBtn.classList.remove('bg-gray-200');
            stopBtn.classList.add('bg-red-500', 'hover:bg-red-600', 'text-white');
            pauseBtn.classList.remove('bg-gray-200');
            pauseBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600', 'text-white');
            
            // Update session duration in real-time
            timerInterval = setInterval(() => {
                const now = new Date();
                const duration = Math.floor((now - sessionStartTime) / 1000);
                sessionDurationEl.textContent = formatDuration(duration);
                sessionDurationEl.classList.add('blink');
            }, 1000);
        }

        // Pause the current session
        function pauseSession() {
            if (!sessionStartTime) return;
            
            if (isSessionPaused) {
                // Resume session
                const pauseDuration = (new Date() - sessionPauseTime) / 1000;
                sessionStartTime = new Date(sessionStartTime.getTime() + pauseDuration * 1000);

                // Save the break session
                const breakSession = {
                    id: Date.now(),
                    date: formatDate(sessionPauseTime),
                    startTime: sessionPauseTime.toISOString(),
                    endTime: new Date().toISOString(),
                    duration: formatDuration(pauseDuration),
                    durationSec: pauseDuration,
                    notes: 'Break session',
                    dayType: getDayType(formatDate(sessionPauseTime)),
                    tags: ['rest'],
                    mood: 5, // Default mood for break sessions
                    isBreak: true
                };
                
                sessions.unshift(breakSession);
                saveSessionsToStorage();
                //todo remove
                breakSessions.push(breakSession);
                saveBreakSessionsToStorage();

                isSessionPaused = false;
                pauseBtn.innerHTML = '<i class="fas fa-pause mr-2"></i> Pause';
                timerInterval = setInterval(() => {
                    const now = new Date();
                    const duration = Math.floor((now - sessionStartTime) / 1000);
                    sessionDurationEl.textContent = formatDuration(duration);
                    sessionDurationEl.classList.add('blink');
                }, 1000);

            } else {
                // Pause session
                clearInterval(timerInterval);
                sessionPauseTime = new Date();
                isSessionPaused = true;
                pauseBtn.innerHTML = '<i class="fas fa-play mr-2"></i> Resume';
                sessionDurationEl.classList.remove('blink');
            }
        }

        // Stop the current session
        function stopSession() {
            clearInterval(timerInterval);
            sessionDurationEl.classList.remove('blink');

            // Save any ongoing break session
            if (isSessionPaused) {
                const pauseDuration = (new Date() - sessionPauseTime) / 1000;
                const breakSession = {
                    id: Date.now(),
                    startTime: sessionPauseTime.toISOString(),
                    endTime: new Date().toISOString(),
                    duration: formatDuration(pauseDuration),
                    durationSec: pauseDuration,
                    type: 'break'
                };
                breakSessions.push(breakSession);
                saveBreakSessionsToStorage();
            }
            
            startBtn.disabled = false;
            stopBtn.disabled = true;
            pauseBtn.disabled = true;
            startBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            startBtn.classList.remove('bg-gray-300', 'cursor-not-allowed');
            stopBtn.classList.add('bg-gray-200');
            stopBtn.classList.remove('bg-red-500', 'hover:bg-red-600', 'text-white');
            pauseBtn.classList.add('bg-gray-200');
            pauseBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600', 'text-white');
            pauseBtn.innerHTML = '<i class="fas fa-pause mr-2"></i> Pause';
            
            // Show notes input
            sessionNotes.classList.remove('hidden');
        }

        // Save the current session
        function saveSession() {
            const endTime = new Date();
            const duration = Math.floor((endTime - sessionStartTime) / 1000);
            const notes = notesInput.value.trim();
            const date = formatDate(sessionStartTime);
            const dayType = getDayType(date);

            const selectedTags = []; 
            document.querySelectorAll('#current-session-tags .tag').forEach(tag => {
                if (tag.classList.contains('selected')) {
                    selectedTags.push(tag.dataset.tag);
                }
            });
	    
	    if (selectedTags.length === 0) {
		selectedTags.push('work'); // if nothing selected, then mark it work by default
	    }
            
            const session = {
                id: Date.now(),
                date: date,
                startTime: sessionStartTime.toISOString(),
                endTime: endTime.toISOString(),
                duration: formatDuration(duration),
                durationSec: duration,
                notes: notes,
                dayType: dayType,
                tags: selectedTags,
                mood: parseFloat(document.getElementById('current-session-mood-input').value),
            };
            
            sessions.unshift(session);
            saveSessionsToStorage();
            renderRecentSessions();
            updateTodayTotal();
            sessionNotes.classList.add('hidden');
            notesInput.value = '';
            sessionDurationEl.textContent = '00:00:00';

            // Reset mood and tags for next session
            document.getElementById('current-session-mood').dataset.rating = '5';
            document.getElementById('current-session-mood-input').value = '5';
            document.getElementById('current-mood-value').textContent = '5.0';
            createStarsForCurrentSession();
            initializeCurrentSessionTags();

            //todo remove
            breakSessions = []; // Clear break sessions
            
            // If on stats tab, update stats
            if (currentTab === 'stats') {
                updateStatistics();
            }
        }

        // Load sessions from storage
        function loadSessions() {
            const savedSessions = localStorage.getItem('workTimeSessions');
            if (savedSessions) {
                sessions = JSON.parse(savedSessions);
                renderRecentSessions();
                renderAllSessions();
                updateTodayTotal();
                updateStatistics();
            } else {
                // Sample data for demo
                const now = new Date();
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                
                sessions = [
                    {
                        id: 1,
                        date: formatDate(now),
                        startTime: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
                        endTime: new Date(now.getTime() - 3600 * 1000).toISOString(),
                        duration: '01:00:00',
                        durationSec: 3600,
                        notes: 'Morning coding session',
                        dayType: 'Workday'
                    },
                    {
                        id: 2,
                        date: formatDate(now),
                        startTime: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
                        endTime: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
                        duration: '01:00:00',
                        durationSec: 3600,
                        notes: 'Project planning',
                        dayType: 'Workday'
                    },
                    {
                        id: 3,
                        date: formatDate(yesterday),
                        startTime: new Date(yesterday.getTime() - 3 * 3600 * 1000).toISOString(),
                        endTime: new Date(yesterday.getTime() - 2 * 3600 * 1000).toISOString(),
                        duration: '01:00:00',
                        durationSec: 3600,
                        notes: 'Team meeting',
                        dayType: 'Workday'
                    }
                ];
                
                saveSessionsToStorage();
                renderRecentSessions();
                renderAllSessions();
                updateTodayTotal();
                updateStatistics();
            }
        }

        // Save sessions to storage
        function saveSessionsToStorage() {
            localStorage.setItem('workTimeSessions', JSON.stringify(sessions));
        }

        // Save break sessions to storage
        function saveBreakSessionsToStorage() {
            localStorage.setItem('workTimeBreakSessions', JSON.stringify(breakSessions));
        }

        // Load break sessions from storage
        function loadBreakSessions() {
            const savedBreakSessions = localStorage.getItem('workTimeBreakSessions');
            if (savedBreakSessions) {
                breakSessions = JSON.parse(savedBreakSessions);
            }
        }

        // Load configs from storage
        function loadConfigs() {
            const savedConfigs = localStorage.getItem('workTimeConfigs');
            if (savedConfigs) {
                configs = JSON.parse(savedConfigs);
                if (configs.length > 0) {
                    applyLatestConfig();
                }
            } else {
                // Create default config if none exists
                const defaultConfig = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    workingHours: 8,
                    breakDuration: 60,
                    weekStart: 1, // Monday
                    salaryType: 'hourly',
                    salaryTaxType: 'net',
                    salaryValue: 15.00,
                    salaryTax: 20,
                    untaxedMin: 500.00,
                    inflationRate: 2.5,
                    darkMode: false
                };
                configs = [defaultConfig];
                saveConfigsToStorage();
            }
        }

        // Save configs to storage
        function saveConfigsToStorage() {
            localStorage.setItem('workTimeConfigs', JSON.stringify(configs));
        }

        // Load marked days from storage
        function loadMarkedDays() {
            const savedMarkedDays = localStorage.getItem('workTimeMarkedDays');
            if (savedMarkedDays) {
                markedDays = JSON.parse(savedMarkedDays);
            }
        }

        // Save marked days to storage
        function saveMarkedDaysToStorage() {
            localStorage.setItem('workTimeMarkedDays', JSON.stringify(markedDays));
        }

        // Apply the latest config to the UI
        function applyLatestConfig() {
            if (configs.length === 0) return;
            
            const latestConfig = configs[0];
            
            workingHoursInput.value = latestConfig.workingHours;
            breakDurationSetting.value = latestConfig.breakDuration;
            weekStartSelect.value = latestConfig.weekStart || 1;
            
            if (latestConfig.salaryType === 'hourly') {
                hourlySalaryRadio.checked = true;
            } else {
                monthlySalaryRadio.checked = true;
            }
            
            if (latestConfig.salaryTaxType === 'net') {
                netSalaryRadio.checked = true;
            } else {
                bruttoSalaryRadio.checked = true;
            }
            
            salaryValueInput.value = latestConfig.salaryValue;
            salaryTaxInput.value = latestConfig.salaryTax;
            untaxedMinInput.value = latestConfig.untaxedMin;
            inflationRateInput.value = latestConfig.inflationRate;
            
            darkModeSetting.checked = latestConfig.darkMode || false;
            if (latestConfig.darkMode) {
                enableDarkMode();
            } else {
                disableDarkMode();
            }
        }

        // Get day type for a given date
        function getDayType(dateStr) {
            const markedDay = markedDays.find(d => d.date === dateStr);
            if (markedDay) return markedDay.dayType;
            
            const date = new Date(dateStr);
            return (date.getDay() === 0 || date.getDay() === 6) ? 'Weekend' : 'Workday';
        }

        // Populate year selector with available years
        function populateYearSelector() {
            const currentYear = new Date().getFullYear();
            yearSelector.innerHTML = '';
            
            // Add years from sessions
            const years = new Set();
            sessions.forEach(session => {
                const year = new Date(session.startTime).getFullYear();
                years.add(year);
            });
            
            // Add current year if no sessions yet
            if (years.size === 0) {
                years.add(currentYear);
            }
            
            // Add years to selector
            const sortedYears = Array.from(years).sort((a, b) => b - a);
            sortedYears.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === currentYear) option.selected = true;
                yearSelector.appendChild(option);
            });
        }

        // Render recent sessions (for tracker tab)
        function renderRecentSessions() {
            if (sessions.length === 0) {
                recentSessionsEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No recent sessions found. Start tracking to see your sessions here.</p>';
                return;
            }
            
            const recent = sessions.slice(0, 5);
           recentSessionsEl.innerHTML = recent.map(session => `
        <div class="session-card bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 dark:bg-gray-600 dark:border-gray-500">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-medium text-gray-800 dark:text-white">${session.date}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300">${formatTime(new Date(session.startTime))} - ${formatTime(new Date(session.endTime))}</p>
                    <span class="inline-block mt-1 text-xs px-2 py-1 rounded-full ${getDayTypeBadgeClass(session.dayType)}">
                        ${session.dayType}
                    </span>
                </div>
                <div class="text-right">
                    <span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300">${session.duration}</span>
                    ${session.mood ? `
                    <div class="mt-1 flex items-center justify-end">
                        <span class="text-xs mr-1">${session.mood.toFixed(1)}</span>
                        <div class="flex">
                            ${Array.from({length: 5}).map((_, i) => `
                                <span class="text-xs ${i < Math.floor(session.mood) ? 'text-yellow-500' : 'text-gray-400'}">
                                    ${i < Math.floor(session.mood) ? '★' : '☆'}
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
        </div>
    `).join('');
            
            // Add event listeners to edit/delete buttons
            document.querySelectorAll('.edit-session').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sessionId = parseInt(e.currentTarget.getAttribute('data-id'));
                    editSession(sessionId);
                });
            });
            
            document.querySelectorAll('.delete-session').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sessionId = parseInt(e.currentTarget.getAttribute('data-id'));
                    showDeleteModal(sessionId);
                });
            });
        }

        // Get badge class for day type
        function getDayTypeBadgeClass(dayType) {
            switch (dayType) {
                case 'Weekend':
                    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-300';
                case 'Holiday':
                    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-300';
                case 'Vacation':
                    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:bg-opacity-20 dark:text-purple-300';
                default:
                    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300';
            }
        }

        // Render all sessions (for sessions tab)
        function renderAllSessions(filteredSessions = null) {
            const sessionsToRender = filteredSessions || sessions;
            
            if (sessionsToRender.length === 0) {
                allSessionsList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No sessions found. Start tracking or add a session manually.</p>';
                return;
            }
            
            // Group sessions by date
            const sessionsByDate = {};
            sessionsToRender.forEach(session => {
                if (!sessionsByDate[session.date]) {
                    sessionsByDate[session.date] = [];
                }
                sessionsByDate[session.date].push(session);
            });
            
            allSessionsList.innerHTML = '';
            
            // Render each date group
            Object.entries(sessionsByDate).forEach(([date, dateSessions]) => {
                const dayType = getDayType(date);
                const dayTypeClass = dayType.toLowerCase();
                
                // Date header
                const dateHeader = document.createElement('div');
                dateHeader.className = `day-header px-4 py-2 rounded-t-lg flex justify-between items-center ${dayTypeClass}`;
                
                const dateText = document.createElement('span');
                dateText.className = 'font-medium';
                dateText.textContent = new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                
                const dayTypeBadge = document.createElement('span');
                dayTypeBadge.className = 'text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-600';
                dayTypeBadge.textContent = dayType;
                
                dateHeader.appendChild(dateText);
                dateHeader.appendChild(dayTypeBadge);
                allSessionsList.appendChild(dateHeader);
                
                // Sessions for this date
                dateSessions.forEach(session => {
                    const sessionCard = document.createElement('div');
                    sessionCard.className = 'session-card bg-white border border-gray-200 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:hover:bg-gray-500';
                    sessionCard.dataset.sessionId = session.id;
                    
                    const sessionInfo = document.createElement('div');
                    
                    const timeRange = document.createElement('div');
                    timeRange.className = 'text-sm font-medium dark:text-white';
                    timeRange.textContent = `${formatTime(new Date(session.startTime))} - ${formatTime(new Date(session.endTime))}`;
                    
                    const duration = document.createElement('div');
                    duration.className = 'text-xs text-gray-500 dark:text-gray-300';
                    duration.textContent = session.duration;
                    
                    sessionInfo.appendChild(timeRange);
                    sessionInfo.appendChild(duration);
                    
                    const sessionNotes = document.createElement('div');
                    sessionNotes.className = 'text-sm text-gray-600 truncate max-w-xs dark:text-gray-200';
                    sessionNotes.textContent = session.notes || 'No notes';
                    
                    sessionCard.appendChild(sessionInfo);
                    sessionCard.appendChild(sessionNotes);
                    
                    sessionCard.addEventListener('click', () => {
                        const sessionId = parseInt(sessionCard.getAttribute('data-session-id'));
                        editSession(sessionId);
                    });
                    
                    allSessionsList.appendChild(sessionCard);
                });
            });
        }

        // Update today's total time
        function updateTodayTotal() {
            const today = formatDate(new Date());
            const todaySessions = sessions.filter(session => session.date === today);
            const totalSec = todaySessions.reduce((sum, session) => sum + session.durationSec, 0);
            todayTotalEl.textContent = formatDuration(totalSec);
        }

        // Switch between tabs
        function switchTab(tab) {
            currentTab = tab;
            
            // Update tab styling
            trackerTab.classList.remove('tab-active');
            trackerTab.classList.add('text-gray-500', 'hover:text-gray-700', 'dark:hover:text-gray-300');
            sessionsTab.classList.remove('tab-active');
            sessionsTab.classList.add('text-gray-500', 'hover:text-gray-700', 'dark:hover:text-gray-300');
            statsTab.classList.remove('tab-active');
            statsTab.classList.add('text-gray-500', 'hover:text-gray-700', 'dark:hover:text-gray-300');
            configTab.classList.remove('tab-active');
            configTab.classList.add('text-gray-500', 'hover:text-gray-700', 'dark:hover:text-gray-300');
            
            // Hide all content
            trackerContent.classList.add('hidden');
            sessionsContent.classList.add('hidden');
            statsContent.classList.add('hidden');
            configContent.classList.add('hidden');
            
            // Show selected content and update tab styling
            if (tab === 'tracker') {
                trackerTab.classList.add('tab-active');
                trackerTab.classList.remove('text-gray-500', 'hover:text-gray-700', 'dark:hover:text-gray-300');
                trackerContent.classList.remove('hidden');
            } else if (tab === 'sessions') {
                sessionsTab.classList.add('tab-active');
                sessionsTab.classList.remove('text-gray-500', 'hover:text-gray-700', 'dark:hover:text-gray-300');
                sessionsContent.classList.remove('hidden');
            } else if (tab === 'stats') {
                statsTab.classList.add('tab-active');
                statsTab.classList.remove('text-gray-500', 'hover:text-gray-700', 'dark:hover:text-gray-300');
                statsContent.classList.remove('hidden');
                updateStatistics();
            } else if (tab === 'config') {
                configTab.classList.add('tab-active');
                configTab.classList.remove('text-gray-500', 'hover:text-gray-700', 'dark:hover:text-gray-300');
                configContent.classList.remove('hidden');
            }
        }

        // Switch between settings tabs
        function switchSettingsTab(tab) {
            // Hide all tabs
            Object.values(settingsTabs).forEach(tabEl => {
                tabEl.classList.add('hidden');
            });
            
            // Remove active class from all buttons
            settingsTabButtons.forEach(btn => {
                btn.classList.remove('settings-tab-active');
            });
            
            // Show selected tab and mark button as active
            settingsTabs[tab].classList.remove('hidden');
            document.querySelector(`[data-settings-tab="${tab}"]`).classList.add('settings-tab-active');
        }

        // Show add session modal
        function showAddSessionModal() {
            document.getElementById('modal-title').textContent = 'Add New Session';
            document.getElementById('session-id').value = '';
            
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
            
            startTimeInput.value = formatDateTimeLocal(oneHourAgo);
            endTimeInput.value = formatDateTimeLocal(now);
            dayTypeInput.value = 'Workday';
            modalNotes.value = '';
            
            // Initialize tags and mood
            initializeSessionModalTags();
            moodRatingEl.dataset.rating = '5';
            sessionMoodInput.value = '5';
            moodValueEl.textContent = '5.0';
            createStars();
            
            sessionModal.classList.remove('hidden');
        }

        // Format datetime for input[type=datetime-local]
        function formatDateTimeLocal(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        // Hide session modal
        function hideSessionModal() {
            sessionModal.classList.add('hidden');
        }

        // Show mark day modal
        function showMarkDayModal(dayType = 'Holiday') {
            markDateInput.value = formatDate(new Date());
            markDayTypeInput.value = dayType;
            dayDescriptionInput.value = '';
            markDayModal.classList.remove('hidden');
        }

        // Hide mark day modal
        function hideMarkDayModal() {
            markDayModal.classList.add('hidden');
        }

        // Save marked day
        function saveMarkedDay() {
            const date = markDateInput.value;
            const dayType = markDayTypeInput.value;
            const description = dayDescriptionInput.value.trim();
            
            // Check if this date is already marked
            const existingIndex = markedDays.findIndex(d => d.date === date);
            
            if (existingIndex >= 0) {
                // Update existing marked day
                markedDays[existingIndex] = {
                    date,
                    dayType,
                    description
                };
            } else {
                // Add new marked day
                markedDays.push({
                    date,
                    dayType,
                    description
                });
            }
            
            saveMarkedDaysToStorage();
            renderAllSessions();
            hideMarkDayModal();
            
            // Update statistics if on stats tab
            if (currentTab === 'stats') {
                updateStatistics();
            }
        }

        // Show delete confirmation modal
        function showDeleteModal(sessionId) {
            sessionToDelete = sessionId;
            deleteModal.classList.remove('hidden');
        }

        // Hide delete confirmation modal
        function hideDeleteModal() {
            sessionToDelete = null;
            deleteModal.classList.add('hidden');
        }

        // Confirm session deletion
        function confirmDeleteSession() {
            if (!sessionToDelete) return;
            
            sessions = sessions.filter(s => s.id !== sessionToDelete);
            saveSessionsToStorage();
            renderRecentSessions();
            renderAllSessions();
            updateTodayTotal();
            
            if (currentTab === 'stats') {
                updateStatistics();
            }
            
            hideDeleteModal();
        }

        // Edit session
        function editSession(sessionId) {
            const session = sessions.find(s => s.id === sessionId);
            if (!session) return;
            
            document.getElementById('modal-title').textContent = 'Edit Session';
            document.getElementById('session-id').value = session.id;
            
            startTimeInput.value = formatDateTimeLocal(new Date(session.startTime));
            endTimeInput.value = formatDateTimeLocal(new Date(session.endTime));
            dayTypeInput.value = session.dayType || 'Workday';
            modalNotes.value = session.notes || '';

            // Initialize tags
            const tagsContainer = document.getElementById('tags-container');
            tagsContainer.innerHTML = '';
            
            const enabledTags = tags.filter(t => t.isEnabled);
            
            enabledTags.forEach(tag => {
                const tagEl = document.createElement('div');
                tagEl.className = `tag px-2 py-1 rounded-full text-sm cursor-pointer ${session.tags && session.tags.includes(tag.name) ? 'selected' : ''} ${getTagBadgeClass(tag.name, session.tags.includes(tag.name))}`;
                tagEl.dataset.tag = tag.name;
                tagEl.textContent = tag.name;
                
                tagEl.addEventListener('click', () => {
		    {//dont allow to deselect the last tag
		    	const selectedTags = [];
		    	document.querySelectorAll('#tags-container .tag.selected').forEach(tag => {
				selectedTags.push(tag.dataset.tag);
		    	});

			if (selectedTags.length <= 1 && selectedTags.includes(tag.name) ) {  return;  }
		    }
                    
                    tagEl.classList.toggle('selected');
                    tagEl.classList.toggle('bg-blue-100');
                    tagEl.classList.toggle('text-blue-800');
                    tagEl.classList.toggle('dark:bg-blue-900');
                    tagEl.classList.toggle('dark:text-blue-300');
                });

                // Initialize mood
                moodRatingEl.dataset.rating = session.mood || '5';
                sessionMoodInput.value = session.mood || '5';
                moodValueEl.textContent = (session.mood || '5') + '.0';
                createStars();
                
                tagsContainer.appendChild(tagEl);
            });
            
            sessionModal.classList.remove('hidden');
        }

        // Handle session form submit (add/edit)
        function handleSessionFormSubmit(e) {
            e.preventDefault();
            
            const sessionId = document.getElementById('session-id').value;
            const startTime = new Date(startTimeInput.value);
            const endTime = new Date(endTimeInput.value);
            const dayType = dayTypeInput.value;
            const notes = modalNotes.value.trim();
            
            if (endTime <= startTime) {
                alert('End time must be after start time');
                return;
            }
            
            const duration = Math.floor((endTime - startTime) / 1000);

            // Get selected tags
            const selectedTags = [];
            document.querySelectorAll('#tags-container .tag.selected').forEach(tag => {
                selectedTags.push(tag.dataset.tag);
            });
            
            // Ensure 'work' tag is included if no tags provided
            const isBreak = selectedTags.includes('rest') && !selectedTags.includes('work');
            if (!isBreak && selectedTags.length === 0) { selectedTags.unshift('work');  }
            
            if (sessionId) {
                // Update existing session
                const index = sessions.findIndex(s => s.id === parseInt(sessionId));
                if (index !== -1) {
                    sessions[index] = {
                        ...sessions[index],
                        date: formatDate(startTime),
                        startTime: startTime.toISOString(),
                        endTime: endTime.toISOString(),
                        duration: formatDuration(duration),
                        durationSec: duration,
                        dayType: dayType,
                        notes: notes,
                        tags: selectedTags,
                        mood: parseFloat(sessionMoodInput.value),
                        isBreak: isBreak
                    };
                }
            } else {
                // Add new session
                const newSession = {
                    id: Date.now(),
                    date: formatDate(startTime),
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    duration: formatDuration(duration),
                    durationSec: duration,
                    dayType: dayType,
                    notes: notes,
                    tags: selectedTags,
                    mood: parseFloat(sessionMoodInput.value),
                    isBreak: isBreak
                };
                
                sessions.unshift(newSession);
            }
            
            saveSessionsToStorage();
            renderRecentSessions();
            renderAllSessions();
            updateTodayTotal();
            hideSessionModal();
            
            if (currentTab === 'stats') {
                updateStatistics();
            }
        }

        // Apply filters to sessions list
        function applyFilters() {
            const date = dateFilter.value;
            const month = monthFilter.value;
            const year = yearFilter.value;
            const dayType = dayTypeFilter.value;
            
            let filtered = [...sessions];
            
            if (date) {
                filtered = filtered.filter(s => s.date === date);
            }
            
            if (month) {
                filtered = filtered.filter(s => {
                    const sessionMonth = new Date(s.startTime).getMonth() + 1;
                    return sessionMonth === parseInt(month);
                });
            }
            
            if (year) {
                filtered = filtered.filter(s => {
                    const sessionYear = new Date(s.startTime).getFullYear();
                    return sessionYear === parseInt(year);
                });
            }
            
            if (dayType) {
                filtered = filtered.filter(s => s.dayType === dayType);
            }
            
            renderAllSessions(filtered);
        }

        // Switch statistics period
        function switchStatsPeriod(period) {
            currentStatsPeriod = period;
            
            // Update button styling
            dailyStatsBtn.classList.remove('bg-blue-600', 'text-white');
            dailyStatsBtn.classList.add('bg-gray-200', 'text-gray-800', 'dark:bg-gray-600', 'dark:text-white');
            weeklyStatsBtn.classList.remove('bg-blue-600', 'text-white');
            weeklyStatsBtn.classList.add('bg-gray-200', 'text-gray-800', 'dark:bg-gray-600', 'dark:text-white');
            monthlyStatsBtn.classList.remove('bg-blue-600', 'text-white');
            monthlyStatsBtn.classList.add('bg-gray-200', 'text-gray-800', 'dark:bg-gray-600', 'dark:text-white');
            yearlyStatsBtn.classList.remove('bg-blue-600', 'text-white');
            yearlyStatsBtn.classList.add('bg-gray-200', 'text-gray-800', 'dark:bg-gray-600', 'dark:text-white');
            
            if (period === 'daily') {
                statsPeriodTitle.textContent = 'Daily Statistics';
                dailyStatsBtn.classList.add('bg-blue-600', 'text-white');
                dailyStatsBtn.classList.remove('bg-gray-200', 'text-gray-800', 'dark:bg-gray-600', 'dark:text-white');
                yearlyStatsTable.classList.add('hidden');
                incomeChartContainer.classList.add('hidden');
            } else if (period === 'weekly') {
                statsPeriodTitle.textContent = 'Weekly Statistics';
                weeklyStatsBtn.classList.add('bg-blue-600', 'text-white');
                weeklyStatsBtn.classList.remove('bg-gray-200', 'text-gray-800', 'dark:bg-gray-600', 'dark:text-white');
                yearlyStatsTable.classList.add('hidden');
                incomeChartContainer.classList.add('hidden');
            } else if (period === 'monthly') {
                statsPeriodTitle.textContent = 'Monthly Statistics';
                monthlyStatsBtn.classList.add('bg-blue-600', 'text-white');
                monthlyStatsBtn.classList.remove('bg-gray-200', 'text-gray-800', 'dark:bg-gray-600', 'dark:text-white');
                yearlyStatsTable.classList.add('hidden');
                incomeChartContainer.classList.add('hidden');
            } else if (period === 'yearly') {
                statsPeriodTitle.textContent = 'Yearly Statistics';
                yearlyStatsBtn.classList.add('bg-blue-600', 'text-white');
                yearlyStatsBtn.classList.remove('bg-gray-200', 'text-gray-800', 'dark:bg-gray-600', 'dark:text-white');
                yearlyStatsTable.classList.remove('hidden');
                
                if (configs.length > 0 && configs[0].salaryValue) {
                    incomeChartContainer.classList.remove('hidden');
                }
            }
            
            updateStatistics();
        }

        // Update statistics
        function updateStatistics() {
            if (sessions.length === 0) {
                totalTimeEl.textContent = '00:00:00';
                sessionsCountEl.textContent = '0';
                avgDurationEl.textContent = '00:00:00';
                
                // Clear charts if they exist
                if (timeChart) {
                    timeChart.destroy();
                }
                if (distributionChart) {
                    distributionChart.destroy();
                }
                if (incomeChart) {
                    incomeChart.destroy();
                }
                
                yearlyStatsTable.classList.add('hidden');
                incomeChartContainer.classList.add('hidden');
                return;
            }

            const selectedTags = Array.from(tagFilter.selectedOptions).map(opt => opt.value);
            const selectedMoods = Array.from(moodThreshold.selectedOptions).map(opt => parseInt(opt.value));
            
            let filteredSessions = [...sessions];
            
            if (currentStatsPeriod === 'yearly') {
                const selectedYear = parseInt(yearSelector.value);
                filteredSessions = sessions.filter(s => {
                    const sessionYear = new Date(s.startTime).getFullYear();
                    return sessionYear === selectedYear;
                });
            }

            // Apply tag filter
            if (selectedTags.length > 0 && !selectedTags.includes('all')) {
                filteredSessions = filteredSessions.filter(s => {
                    return selectedTags.some(tag => s.tags && s.tags.includes(tag));
                });
            }
            
            // Apply mood filter
            if (selectedMoods.length > 0) {
                filteredSessions = filteredSessions.filter(s => selectedMoods.includes(Math.floor(s.mood || 0)));
            }
            
            // Calculate total stats
            const totalSec = filteredSessions.reduce((sum, session) => sum + session.durationSec, 0);
            const avgSec = Math.round(totalSec / filteredSessions.length);
            
            totalTimeEl.textContent = formatDuration(totalSec);
            sessionsCountEl.textContent = filteredSessions.length;
            avgDurationEl.textContent = formatDuration(avgSec);
            
            // Prepare data for charts based on current period
            let labels = [];
            let data = [];
            let backgroundColors = [];
            
            const now = new Date();
            const colors = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
            
            if (currentStatsPeriod === 'daily') {
                // Last 7 days
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(now);
                    date.setDate(date.getDate() - i);
                    const dateStr = formatDate(date);
                    
                    const daySessions = filteredSessions.filter(s => s.date === dateStr);
                    const dayTotal = daySessions.reduce((sum, s) => sum + s.durationSec, 0);
                    
                    labels.push(date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
                    data.push(dayTotal / 3600); // Convert to hours
                    backgroundColors.push(colors[i % colors.length]);
                }
            } else if (currentStatsPeriod === 'weekly') {
                // Last 8 weeks
                const weekStartDay = configs.length > 0 ? configs[0].weekStart : 1; // Default to Monday
                
                for (let i = 7; i >= 0; i--) {
                    const weekStart = new Date(now);
                    // Find the most recent week start day (e.g., Monday)
                    const dayDiff = (weekStart.getDay() - weekStartDay + 7) % 7;
                    weekStart.setDate(weekStart.getDate() - dayDiff - (7 * i));
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    
                    const weekSessions = filteredSessions.filter(s => {
                        const sessionDate = new Date(s.startTime);
                        return sessionDate >= weekStart && sessionDate <= weekEnd;
                    });
                    
                    const weekTotal = weekSessions.reduce((sum, s) => sum + s.durationSec, 0);
                    
                    labels.push(`Week ${i === 0 ? 'This' : i === 1 ? 'Last' : i}`);
                    data.push(weekTotal / 3600); // Convert to hours
                    backgroundColors.push(colors[i % colors.length]);
                }
            } else if (currentStatsPeriod === 'monthly') {
                // Last 6 months
                for (let i = 5; i >= 0; i--) {
                    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    
                    const monthSessions = filteredSessions.filter(s => {
                        const sessionDate = new Date(s.startTime);
                        return sessionDate.getFullYear() === month.getFullYear() && 
                               sessionDate.getMonth() === month.getMonth();
                    });
                    
                    const monthTotal = monthSessions.reduce((sum, s) => sum + s.durationSec, 0);
                    
                    labels.push(month.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }));
                    data.push(monthTotal / 3600); // Convert to hours
                    backgroundColors.push(colors[i % colors.length]);
                }
            } else if (currentStatsPeriod === 'yearly') {
                // Selected year months
                const selectedYear = parseInt(yearSelector.value);
                
                for (let i = 0; i < 12; i++) {
                    const month = new Date(selectedYear, i, 1);
                    
                    const monthSessions = filteredSessions.filter(s => {
                        const sessionDate = new Date(s.startTime);
                        return sessionDate.getFullYear() === month.getFullYear() && 
                               sessionDate.getMonth() === month.getMonth();
                    });
                    
                    const monthTotal = monthSessions.reduce((sum, s) => sum + s.durationSec, 0);
                    
                    labels.push(month.toLocaleDateString(undefined, { month: 'short' }));
                    data.push(monthTotal / 3600); // Convert to hours
                    backgroundColors.push(colors[i % colors.length]);
                }
                
                updateYearlyStatsTable(selectedYear);
                
                if (configs.length > 0 && configs[0].salaryValue) {
                    updateIncomeChart(selectedYear);
                    incomeChartContainer.classList.remove('hidden');
                } else {
                    incomeChartContainer.classList.add('hidden');
                }
            }
            
            // Update or create time chart
            const timeCtx = document.getElementById('timeChart').getContext('2d');
            
            if (timeChart) {
                timeChart.destroy();
            }
            
            timeChart = new Chart(timeCtx, {
                type: currentStatsPeriod === 'yearly' ? 'bar' : 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Hours Worked',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: backgroundColors.map(c => c.replace('0.8', '1')),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const hours = context.raw;
                                    const mins = Math.round((hours % 1) * 60);
                                    return `${Math.floor(hours)}h ${mins}m`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Hours'
                            }
                        }
                    }
                }
            });
            
            // Update or create distribution chart
            const distributionCtx = document.getElementById('distributionChart').getContext('2d');
            
            if (distributionChart) {
                distributionChart.destroy();
            }
            
            // Prepare data for distribution chart (by day type)
            const dayTypes = ['Workday', 'Weekend', 'Holiday', 'Vacation'];
            const dayTypeData = dayTypes.map(type => {
                const typeSessions = filteredSessions.filter(s => s.dayType === type);
                return typeSessions.reduce((sum, s) => sum + s.durationSec, 0) / 3600;
            });
            
            distributionChart = new Chart(distributionCtx, {
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
                        legend: {
                            position: 'right'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
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

        // Update yearly stats table
        function updateYearlyStatsTable(year) {
            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            
            let tableHTML = '';
            const latestConfig = configs[0] || {
                workingHours: 8,
                breakDuration: 60
            };
            
            for (let i = 0; i < 12; i++) {
                const monthStart = new Date(year, i, 1);
                const monthEnd = new Date(year, i + 1, 0);
                
                // Get all sessions for this month
                const monthSessions = sessions.filter(s => {
                    const sessionDate = new Date(s.startTime);
                    return sessionDate.getFullYear() === monthStart.getFullYear() && 
                           sessionDate.getMonth() === monthStart.getMonth();
                });
                
                // Get all unique dates with sessions
                const uniqueDates = [...new Set(monthSessions.map(s => s.date))];
                
                // Calculate total hours
                const totalHours = monthSessions.reduce((sum, s) => sum + s.durationSec, 0) / 3600;
                
                // Calculate average hours per work day
                const workDays = uniqueDates.filter(date => {
                    const markedDay = markedDays.find(d => d.date === date);
                    if (markedDay) {
                        return markedDay.dayType === 'Workday';
                    }
                    const dateObj = new Date(date);
                    return dateObj.getDay() !== 0 && dateObj.getDay() !== 6;
                });
                
                const avgHoursPerDay = workDays.length > 0 ? 
                    (totalHours / workDays.length).toFixed(1) : 0;
                
                // Calculate % of days over expected hours
                const expectedDailyHours = latestConfig.workingHours || 8;
                let daysOverExpected = 0;
                
                uniqueDates.forEach(date => {
                    const dateSessions = monthSessions.filter(s => s.date === date);
                    const dateTotal = dateSessions.reduce((sum, s) => sum + s.durationSec, 0) / 3600;
                    
                    if (dateTotal > expectedDailyHours) {
                        daysOverExpected++;
                    }
                });
                
                const percentOverExpected = uniqueDates.length > 0 ? 
                    Math.round((daysOverExpected / uniqueDates.length) * 100) : 0;
                
                // Count holidays and vacations
                const holidays = markedDays.filter(d => 
                    d.dayType === 'Holiday' && 
                    new Date(d.date).getFullYear() === year && 
                    new Date(d.date).getMonth() === i
                ).length;
                
                const vacations = markedDays.filter(d => 
                    d.dayType === 'Vacation' && 
                    new Date(d.date).getFullYear() === year && 
                    new Date(d.date).getMonth() === i
                ).length;
                
                tableHTML += `
                    <tr>
                        <td class="px-4 py-2 border-b dark:border-gray-600">${months[i]}</td>
                        <td class="px-4 py-2 border-b dark:border-gray-600">${totalHours.toFixed(1)}</td>
                        <td class="px-4 py-2 border-b dark:border-gray-600">${workDays.length}</td>
                        <td class="px-4 py-2 border-b dark:border-gray-600">${avgHoursPerDay}</td>
                        <td class="px-4 py-2 border-b dark:border-gray-600">${percentOverExpected}%</td>
                        <td class="px-4 py-2 border-b dark:border-gray-600">${holidays}</td>
                        <td class="px-4 py-2 border-b dark:border-gray-600">${vacations}</td>
                    </tr>
                `;
            }
            
            yearlyStatsBody.innerHTML = tableHTML;
            yearlyStatsTable.classList.remove('hidden');
        }

        // Update income chart
        function updateIncomeChart(year) {
            if (configs.length === 0 || !configs[0].salaryValue) return;
            
            const incomeCtx = document.getElementById('incomeChart').getContext('2d');
            const config = configs[0];
            const isHourly = config.salaryType === 'hourly';
            const isNet = config.salaryTaxType === 'net';
            const salaryValue = config.salaryValue;
            const taxRate = config.salaryTax / 100;
            
            // Calculate monthly income
            const months = [];
            const incomeData = [];
            
            for (let i = 0; i < 12; i++) {
                const month = new Date(year, i, 1);
                const monthName = month.toLocaleDateString(undefined, { month: 'short' });
                months.push(monthName);
                
                // Get all sessions for this month
                const monthSessions = sessions.filter(s => {
                    const sessionDate = new Date(s.startTime);
                    return sessionDate.getFullYear() === year && 
                           sessionDate.getMonth() === i;
                });
                
                // Calculate total hours
                const totalHours = monthSessions.reduce((sum, s) => sum + s.durationSec, 0) / 3600;
                
                // Calculate income
                let income;
                if (isHourly) {
                    income = totalHours * salaryValue;
                    if (!isNet) {
                        income = income * (1 - taxRate);
                    }
                } else {
                    // Monthly salary - need to calculate work days
                    const workDays = monthSessions
                        .map(s => s.date)
                        .filter((date, index, self) => self.indexOf(date) === index) // Unique dates
                        .filter(date => {
                            const markedDay = markedDays.find(d => d.date === date);
                            if (markedDay) {
                                return markedDay.dayType === 'Workday';
                            }
                            const dateObj = new Date(date);
                            return dateObj.getDay() !== 0 && dateObj.getDay() !== 6;
                        }).length;
                    
                    const workDaysInMonth = getWorkDaysInMonth(year, i);
                    income = (workDays / workDaysInMonth) * salaryValue;
                    if (!isNet) {
                        income = income * (1 - taxRate);
                    }
                }
                
                incomeData.push(income.toFixed(2));
            }
            
            if (incomeChart) {
                incomeChart.destroy();
            }
            
            incomeChart = new Chart(incomeCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Income (€)',
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
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Income: €${context.raw}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Income (€)'
                            }
                        }
                    }
                }
            });
        }

        // Get work days in a month
        function getWorkDaysInMonth(year, month) {
            const date = new Date(year, month, 1);
            let workDays = 0;
            
            while (date.getMonth() === month) {
                const day = date.getDay();
                if (day !== 0 && day !== 6) { // Not Sunday or Saturday
                    workDays++;
                }
                date.setDate(date.getDate() + 1);
            }
            
            return workDays;
        }

        // Toggle dark mode
        function toggleDarkMode() {
            darkMode = !darkMode;
            localStorage.setItem('darkMode', darkMode);
            
            if (darkMode) {
                enableDarkMode();
            } else {
                disableDarkMode();
            }
            
            // Update config if it exists
            if (configs.length > 0) {
                configs[0].darkMode = darkMode;
                saveConfigsToStorage();
            }
        }

        // Enable dark mode
        function enableDarkMode() {
            document.body.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            darkModeSetting.checked = true;
        }

        // Disable dark mode
        function disableDarkMode() {
            document.body.classList.remove('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            darkModeSetting.checked = false;
        }

        // tag management
        function loadTags() {
            const savedTags = localStorage.getItem('workTimeTags');
            if (savedTags) {
                tags = JSON.parse(savedTags);
            } else {
                // Initialize with default tags
                tags = [
                    ...defaultTags.map(tag => ({ name: tag, isDefault: true, isEnabled: true, isCustom: false })),
                    ...presetTags.map(tag => ({ name: tag, isDefault: false, isEnabled: true, isCustom: false }))
                ];
                saveTagsToStorage();
            }
            renderTagSettings();
        }

        function saveTagsToStorage() {
            localStorage.setItem('workTimeTags', JSON.stringify(tags));
        }

        function renderTagSettings() {
            const defaultTagsContainer = document.getElementById('default-tags');
            const presetTagsContainer = document.getElementById('preset-tags');
            const customTagsContainer = document.getElementById('custom-tags');
            
            defaultTagsContainer.innerHTML = '';
            presetTagsContainer.innerHTML = '';
            customTagsContainer.innerHTML = '';
            
            tags.forEach(tag => {
                const tagEl = document.createElement('div');
                tagEl.className = `tag-item flex items-center px-3 py-1 rounded-full text-sm ${getTagBadgeClass(tag.name, tag.isEnabled)}`;
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = tag.isEnabled;
                checkbox.className = 'mr-2';
                checkbox.disabled = tag.isDefault;
                checkbox.addEventListener('change', () => {
                    tag.isEnabled = checkbox.checked;
                    saveTagsToStorage();
                });
                
                tagEl.appendChild(checkbox);
                tagEl.appendChild(document.createTextNode(tag.name));
                
                if (tag.isCustom) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'ml-2 text-gray-500 hover:text-red-500';
                    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        deleteCustomTag(tag.name);
                    });
                    tagEl.appendChild(deleteBtn);
                    customTagsContainer.appendChild(tagEl);
                } else if (tag.isDefault) {
                    defaultTagsContainer.appendChild(tagEl);
                } else {
                    presetTagsContainer.appendChild(tagEl);
                }
            });
        }

        function addCustomTag() {
            const newTagInput = document.getElementById('new-tag-input');
            const tagName = newTagInput.value.trim();
            
            if (tagName && !tags.some(t => t.name === tagName)) {
                tags.push({
                    name: tagName,
                    isDefault: false,
                    isEnabled: true,
                    isCustom: true
                });
                saveTagsToStorage();
                renderTagSettings();
                newTagInput.value = '';
            }
        }

        function deleteCustomTag(tagName) {
            if (confirm(`Are you sure you want to delete the "${tagName}" tag?`)) {
                tags = tags.filter(t => t.name !== tagName);
                saveTagsToStorage();
                renderTagSettings();
            }
        }

        function getTagBadgeClass(tag, selected=false) {
	    if (!selected) { return 'text-gray-800 dark:bg-gray-700 dark:text-gray-300'; }

            switch (tag) {
                case 'work':
                    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
                case 'rest':
                    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
                default:
                    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            }
        }

        function initializeSessionModalTags() {
	    console.debug('initializeSessionModalTags');

            tagsContainer.innerHTML = '';
            const enabledTags = tags.filter(t => t.isEnabled);
            
            enabledTags.forEach(tag => {
                const tagEl = document.createElement('div');
                tagEl.className = `tag px-2 py-1 rounded-full text-sm cursor-pointer ${tag.name === 'work' ? 'selected' : ''} ${getTagBadgeClass(tag.name)}`; //select work tag by default
                tagEl.dataset.tag = tag.name;
                tagEl.textContent = tag.name;
                
                tagEl.addEventListener('click', () => {
		    console.debug("debug: ", tag.name);
		    //TODO do we need this check here - when its triggered? maybe its settings?
		    {//dont allow to deselect the last tag
		    	const selectedTags = [];
		    	document.querySelectorAll('#tags-container .tag.selected').forEach(tag => {
				selectedTags.push(tag.dataset.tag);
		    	});

			if (selectedTags.length <= 1 && selectedTags.includes(tag.name) ) {  return;  }
		    }
                    
                    tagEl.classList.toggle('selected');
                    tagEl.classList.toggle('bg-blue-100', tagEl.classList.contains('selected'));
                    tagEl.classList.toggle('text-blue-800', tagEl.classList.contains('selected'));
                    tagEl.classList.toggle('dark:bg-blue-900', tagEl.classList.contains('selected'));
                    tagEl.classList.toggle('dark:text-blue-300', tagEl.classList.contains('selected'));
                });
                
                tagsContainer.appendChild(tagEl);
            });
        }

        function initializeCurrentSessionTags() {
	    const tagsContainer = document.getElementById('current-session-tags');
	    tagsContainer.innerHTML = '';
	    
	    const enabledTags = tags.filter(t => t.isEnabled);
    
	    // Add enabled tags
	    enabledTags
		.forEach(tag => {
		    const tagEl = document.createElement('div');
		    tagEl.className = `tag px-2 py-1 rounded-full text-sm cursor-pointer ${tag.name === 'work' ? 'selected' : ''} ${getTagBadgeClass(tag.name)}`;
		    tagEl.dataset.tag = tag.name;
		    tagEl.textContent = tag.name;
		    
		    tagEl.addEventListener('click', () => {
			{//dont allow to deselect the last tag
			    	const selectedTags = [];
			    	document.querySelectorAll('#current-session-tags .tag.selected').forEach(tag => {
					selectedTags.push(tag.dataset.tag);
			    	});

				if (selectedTags.length <= 1 && selectedTags.includes(tag.name) ) {  return;  }
			}

		        tagEl.classList.toggle('selected');
		        tagEl.classList.toggle('bg-blue-100');
		        tagEl.classList.toggle('text-blue-800');
		        tagEl.classList.toggle('dark:bg-blue-900');
		        tagEl.classList.toggle('dark:text-blue-300');
	    	    });
	    
	    	    tagsContainer.appendChild(tagEl);
	    });
    }

    // Initialize mood rating for current session
    function initializeCurrentSessionMood() {
        const moodContainer = document.getElementById('current-session-mood');
        moodContainer.innerHTML = '';
        
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('div');
            star.className = 'star text-2xl cursor-pointer';
            star.dataset.value = i;
            star.innerHTML = '★';
            star.addEventListener('click', () => {
                moodContainer.dataset.rating = i;
                document.getElementById('current-session-mood-input').value = i;
                document.getElementById('current-mood-value').textContent = i + '.0';
                createStarsForCurrentSession();
            });
            moodContainer.appendChild(star);
        }
    }

    function createStarsForCurrentSession() {
        const rating = parseFloat(document.getElementById('current-session-mood').dataset.rating);
        const stars = document.querySelectorAll('#current-session-mood .star');
        
        stars.forEach((star, index) => {
            star.innerHTML = index < rating ? '★' : '☆';
        });
    }

        // Mood rating functions
        function createStars() {
            moodRatingEl.innerHTML = '';
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('div');
                star.className = 'star text-2xl cursor-pointer';
                star.dataset.value = i;
                star.innerHTML = i <= moodRatingEl.dataset.rating ? '★' : '☆';
                moodRatingEl.appendChild(star);
            }
        }

        function handleStarClick(e) {
            if (e.target.classList.contains('star')) {
                const value = parseFloat(e.target.dataset.value);
                const currentRating = parseFloat(moodRatingEl.dataset.rating);
                const newRating = value === 0.5 + currentRating ? value - 0.5 : value;
                
                moodRatingEl.dataset.rating = newRating;
                sessionMoodInput.value = newRating;
                moodValueEl.textContent = newRating.toFixed(1);
                createStars();
            }
        }

        function handleStarHover(e) {
            if (e.target.classList.contains('star')) {
                const hoverValue = parseFloat(e.target.dataset.value);
                const stars = moodRatingEl.querySelectorAll('.star');
                
                stars.forEach(star => {
                    const starValue = parseFloat(star.dataset.value);
                    star.innerHTML = starValue <= hoverValue ? '★' : '☆';
                });
            }
        }

        function resetStarDisplay() {
            const currentRating = parseFloat(moodRatingEl.dataset.rating);
            const stars = moodRatingEl.querySelectorAll('.star');
            
            stars.forEach(star => {
                const starValue = parseFloat(star.dataset.value);
                star.innerHTML = starValue <= currentRating ? '★' : '☆';
            });
        }


        // Save configuration
        function saveConfig() {
            const newConfig = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                workingHours: parseInt(workingHoursInput.value) || 8,
                breakDuration: parseInt(breakDurationSetting.value) || 60,
                weekStart: parseInt(weekStartSelect.value) || 1,
                salaryType: hourlySalaryRadio.checked ? 'hourly' : 'monthly',
                salaryTaxType: netSalaryRadio.checked ? 'net' : 'brutto',
                salaryValue: parseFloat(salaryValueInput.value) || 0,
                salaryTax: parseFloat(salaryTaxInput.value) || 0,
                untaxedMin: parseFloat(untaxedMinInput.value) || 0,
                inflationRate: parseFloat(inflationRateInput.value) || 0,
                darkMode: darkModeSetting.checked
            };
            
            // Add to beginning of array (most recent first)
            configs.unshift(newConfig);
            saveConfigsToStorage();
            
            // Apply new config
            applyLatestConfig();
            
            // Update statistics if on stats tab
            if (currentTab === 'stats') {
                updateStatistics();
            }
            
            alert('Configuration saved successfully!');
        }

        // Show config history modal
        function showConfigHistoryModal() {
            configHistoryList.innerHTML = '';
            
            if (configs.length === 0) {
                configHistoryList.innerHTML = '<div class="text-center py-4 text-gray-500 dark:text-gray-400">No configuration history available</div>';
            } else {
                configs.forEach((config, index) => {
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
                        summaryText += `, ${config.salaryType} ${config.salaryTaxType} €${config.salaryValue.toFixed(2)}`;
                    }
                    
                    configSummary.textContent = summaryText;
                    
                    configItem.appendChild(configDate);
                    configItem.appendChild(configSummary);
                    
                    if (index > 0) {
                        const restoreBtn = document.createElement('button');
                        restoreBtn.className = 'text-xs text-blue-600 hover:text-blue-800 mt-2 dark:text-blue-400 dark:hover:text-blue-300';
                        restoreBtn.textContent = 'Restore this version';
                        restoreBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            restoreConfig(config.id);
                        });
                        configItem.appendChild(restoreBtn);
                    }
                    
                    configItem.addEventListener('click', () => {
                        viewConfigDetails(config.id);
                    });
                    
                    configHistoryList.appendChild(configItem);
                });
            }
            
            configHistoryModal.classList.remove('hidden');
        }

        // Hide config history modal
        function hideConfigHistoryModal() {
            configHistoryModal.classList.add('hidden');
        }

        // View config details
        function viewConfigDetails(configId) {
            const config = configs.find(c => c.id === configId);
            if (!config) return;
            
            alert(`Configuration Details:\n\n` +
                  `Date: ${new Date(config.timestamp).toLocaleString()}\n` +
                  `Working Hours: ${config.workingHours}h/day\n` +
                  `Break Duration: ${config.breakDuration}m\n` +
                  `Week Starts On: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][config.weekStart]}\n` +
                  `Salary Type: ${config.salaryType} ${config.salaryTaxType}\n` +
                  `Salary Value: €${config.salaryValue.toFixed(2)}\n` +
                  `Tax Rate: ${config.salaryTax}%\n` +
                  `Untaxed Minimum: €${config.untaxedMin.toFixed(2)}\n` +
                  `Inflation Rate: ${config.inflationRate}%`);
        }

        // Restore config version
        function restoreConfig(configId) {
            const config = configs.find(c => c.id === configId);
            if (!config) return;
            
            if (confirm('Are you sure you want to restore this configuration version?')) {
                // Create a new config with current timestamp
                const restoredConfig = {
                    ...config,
                    id: Date.now(),
                    timestamp: new Date().toISOString()
                };
                
                configs.unshift(restoredConfig);
                saveConfigsToStorage();
                applyLatestConfig();
                hideConfigHistoryModal();
                
                // Update statistics if on stats tab
                if (currentTab === 'stats') {
                    updateStatistics();
                }
                
                alert('Configuration restored successfully!');
            }
        }

        // Export all data
        function exportAllData() {
            const data = {
                sessions: sessions,
                configs: configs,
                markedDays: markedDays,
                exportedAt: new Date().toISOString()
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const dataUrl = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `work-time-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // Import data
        function importData() {
            const file = importFileInput.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (confirm('Are you sure you want to import this data? This will overwrite your current sessions, configs, and marked days.')) {
                        if (data.sessions) sessions = data.sessions;
                        if (data.configs) configs = data.configs;
                        if (data.markedDays) markedDays = data.markedDays;
                        
                        saveSessionsToStorage();
                        saveConfigsToStorage();
                        saveMarkedDaysToStorage();
                        
                        // Reload the app
                        loadSessions();
                        loadConfigs();
                        loadMarkedDays();
                        
                        if (currentTab === 'stats') {
                            updateStatistics();
                        }
                        
                        alert('Data imported successfully!');
                    }
                } catch (error) {
                    alert('Error importing data: ' + error.message);
                }
            };
            reader.readAsText(file);
            importFileInput.value = ''; // Reset file input
        }

        // Reset sessions
        function resetSessions() {
            sessions = [];
            saveSessionsToStorage();
            renderRecentSessions();
            renderAllSessions();
            updateTodayTotal();
            
            if (currentTab === 'stats') {
                updateStatistics();
            }
            
            alert('All sessions have been reset.');
        }

        // Reset config
        function resetConfig() {
            configs = [];
            saveConfigsToStorage();
            loadConfigs(); // This will create a default config
            
            alert('All settings have been reset to defaults.');
        }

        // Reset marked days
        function resetMarkedDays() {
            markedDays = [];
            saveMarkedDaysToStorage();
            renderAllSessions();
            
            if (currentTab === 'stats') {
                updateStatistics();
            }
            
            alert('All marked days have been reset.');
        }

        // Show confirmation dialog
        function showConfirmation(title, message, action) {
            if (confirm(`${title}\n\n${message}`)) {
                action();
            }
        }