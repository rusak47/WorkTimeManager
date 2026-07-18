import { Chart } from 'chart.js/auto';
import * as utils from '../js/utils.js';
import { DEFAULT_TAGS, SECONDS_PER_HOUR } from './constants.js';
import { moveSubtagBetweenBuckets, removeTagFromBucket } from './tagManager.js';
import {
  groupByYear, groupByMonth, groupByWeek,
  toggleGroup, isGroupExpanded, getTotalDuration,
} from './allSessionsView.js';

function formatGridDate(dateStr) {
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getStripeColor(tags) {
  if (!tags || tags.length === 0) return 'bg-gray-400';
  const tag = tags[0];
  switch (tag) {
    case 'work': return 'bg-blue-400';
    case 'rest': return 'bg-purple-400';
    case 'study': return 'bg-orange-400';
    case 'sport': return 'bg-green-400';
    default: return 'bg-gray-400';
  }
}

function getDayTypePillClasses(dayType) {
  switch (dayType) {
    case 'Workday':
      return 'bg-[#dbeafe] text-[#1e40af] dark:bg-[#1e3a5f] dark:text-[#93c5fd]';
    case 'Weekend':
      return 'bg-[#fff3ef] text-[#9a3412] dark:bg-[#1d2438] dark:text-[#8090b0]';
    case 'Holiday':
      return 'bg-[#fce5dc] text-[#166534] dark:bg-[#680a0a] dark:text-[#fca5a5]';
    case 'Memorial':
    case 'Memorial day':
      return 'bg-transparent text-[#9d174d] border border-[#f9a8d4] dark:bg-transparent dark:text-[#a899f5] dark:border-[#5046a0]';
    case 'Vacation':
      return 'bg-[#ede9fe] text-[#5b21b6] dark:bg-[#2e1065] dark:text-[#c4b5fd]';
    case 'Short day':
      return 'bg-[#fef3c7] text-[#92400e] dark:bg-[#3a2d10] dark:text-[#f0b840]';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

function getDayTypeDotColor(dayType) {
  switch (dayType) {
    case 'Workday': return 'bg-[#3b82f6]';
    case 'Weekend': return 'bg-[#f97316]';
    case 'Holiday': return 'bg-[#22c55e]';
    case 'Memorial':
    case 'Memorial day': return 'bg-[#ec4899]';
    case 'Vacation': return 'bg-[#8b5cf6]';
    case 'Short day': return 'bg-[#eab308]';
    default: return 'bg-gray-400';
  }
}

export function createUIManager(store) {
  let _showCurrentRest = true;
  let _showSegmentOnly = true;
  let _onTagBucketsChange = null;
  let _onDeleteCustomTag = null;
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
      if (!s.tracker || !s.tracker.startTime) return;
      if (s.tracker.isPaused) {
        _showCurrentRest = !_showCurrentRest;
      } else {
        _showSegmentOnly = !_showSegmentOnly;
      }
      updateTimerDisplay();
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
      case 'study':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'sport':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  function createPickerTagChip(tagName, selected = false) {
    const chip = document.createElement('div');
    chip.className = `tag-chip inline-block px-2 py-1 rounded-full text-sm cursor-pointer select-none ${selected ? 'selected' : ''} ${getTagBadgeClass(tagName, selected)}`;
    chip.dataset.tag = tagName;
    chip.textContent = tagName;
    return chip;
  }

  function showStartPicker(onSelect, x, y) {
    hideStartPicker();
    const picker = document.createElement('div');
    picker.id = 'start-picker';
    picker.className = 'start-picker fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex flex-col gap-1';
    const title = document.createElement('div');
    title.className = 'text-xs text-gray-500 dark:text-gray-400 px-2 pb-1 border-b border-gray-100 dark:border-gray-700 mb-1';
    title.textContent = 'Start with:';
    picker.appendChild(title);

    const buckets = ['rest', 'study', 'sport', 'other', 'work'];
    for (const bucket of buckets) {
      const chip = createPickerTagChip(bucket, false);
      chip.classList.add('start-picker-chip');
      chip.addEventListener('click', () => {
        onSelect(bucket);
        hideStartPicker();
      });
      picker.appendChild(chip);
    }

    document.body.appendChild(picker);

    if (x != null && y != null) {
      picker.style.left = Math.max(4, x) + 'px';
      picker.style.top = Math.max(4, y) + 'px';
      const rect = picker.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) {
        picker.style.top = Math.max(4, y - rect.height - 4) + 'px';
      }
      if (rect.right > window.innerWidth) {
        picker.style.left = Math.max(4, window.innerWidth - rect.width - 8) + 'px';
      }
    } else {
      const btn = document.getElementById('start-btn');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        picker.style.left = Math.max(4, rect.left) + 'px';
        picker.style.top = (rect.bottom + 4) + 'px';
      } else {
        picker.style.left = '50%';
        picker.style.top = '50%';
        picker.style.transform = 'translate(-50%, -50%)';
      }
    }
  }

  function hideStartPicker() {
    const existing = document.getElementById('start-picker');
    if (existing) existing.remove();
  }

  function getAllTagNames() {
    const s = store.getState();
    const tagBuckets = s.tagBuckets || {};
    const names = new Set();
    for (const bucket of Object.keys(tagBuckets)) {
      names.add(bucket);
      for (const subtag of (tagBuckets[bucket] || [])) {
        names.add(subtag);
      }
    }
    return Array.from(names);
  }

  function getBucketColorClass(tagName) {
    const s = store.getState();
    const tagBuckets = s.tagBuckets || {};
    const parents = [];
    for (const [bucket, subtags] of Object.entries(tagBuckets)) {
      if (subtags.includes(tagName)) parents.push(bucket);
    }
    if (parents.length === 0 && tagBuckets[tagName] !== undefined) parents.push(tagName);
    return parents.map(b => {
      const cls = getTagBadgeClass(b, true);
      const match = cls.match(/bg-\w+-\d+/);
      return match ? match[0] : 'bg-gray-500';
    });
  }

  let activeDropdown = null;
  let dismissedHash = null;
  let hashtagSelectedIndex = -1;

  function getCursorCoords(textarea, charIndex) {
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    const tr = textarea.getBoundingClientRect();
    const props = [
      ['position', 'fixed'],
      ['top', tr.top + 'px'],
      ['left', tr.left + 'px'],
      ['opacity', '0'],
      ['pointerEvents', 'none'],
      ['zIndex', '-1'],
      ['white-space', 'pre-wrap'],
      ['word-wrap', 'break-word'],
      ['overflow-wrap', 'break-word'],
      ['font-family', style.fontFamily],
      ['font-size', style.fontSize],
      ['font-weight', style.fontWeight],
      ['font-style', style.fontStyle],
      ['line-height', style.lineHeight],
      ['letter-spacing', style.letterSpacing],
      ['padding-top', style.paddingTop],
      ['padding-right', style.paddingRight],
      ['padding-bottom', style.paddingBottom],
      ['padding-left', style.paddingLeft],
      ['border-top-width', style.borderTopWidth],
      ['border-right-width', style.borderRightWidth],
      ['border-bottom-width', style.borderBottomWidth],
      ['border-left-width', style.borderLeftWidth],
      ['box-sizing', style.boxSizing],
      ['width', textarea.offsetWidth + 'px'],
    ];
    props.forEach(([k, v]) => { mirror.style[k] = v; });

    const textBefore = textarea.value.substring(0, charIndex);
    const textAfter = textarea.value.substring(charIndex);
    mirror.textContent = textBefore;
    const marker = document.createElement('span');
    marker.textContent = '\u200B';
    mirror.appendChild(marker);
    mirror.appendChild(document.createTextNode(textAfter));
    document.body.appendChild(mirror);

    const markerRect = marker.getBoundingClientRect();
    document.body.removeChild(mirror);

    return {
      left: markerRect.left,
      top: markerRect.top - textarea.scrollTop,
      bottom: markerRect.top - textarea.scrollTop + markerRect.height,
      height: markerRect.height,
    };
  }

  function showHashtagDropdown(textarea, tags, startPos) {
    hideHashtagDropdown();
    const dd = document.createElement('div');
    dd.id = 'hashtag-dropdown';
    dd.className = 'fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-1 min-w-[100px] max-h-[200px] overflow-y-auto';

    const handleItemClick = (tag) => {
      const before = textarea.value.substring(0, startPos);
      const afterHash = textarea.value.substring(startPos + 1);
      const endOfWord = afterHash.search(/[\s\W]|$/);
      const endPos = endOfWord >= 0 ? startPos + 1 + endOfWord : textarea.value.length;
      const newVal = textarea.value.substring(0, startPos) + '#' + tag + ' ' + textarea.value.substring(endPos);
      textarea.value = newVal;
      const newCursor = startPos + 1 + tag.length + 1;
      textarea.selectionStart = textarea.selectionEnd = newCursor;
      dismissedHash = null;
      hideHashtagDropdown();
      textarea.focus();
    };

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const item = document.createElement('div');
      item.className = 'hashtag-item px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-1.5';
      item.dataset.index = i;
      const colors = getBucketColorClass(tag);
      const dot = document.createElement('span');
      dot.className = `inline-block w-2 h-2 rounded-full ${colors[0] || 'bg-gray-500'}`;
      item.appendChild(dot);
      const label = document.createElement('span');
      label.textContent = tag;
      item.appendChild(label);

      item.addEventListener('click', (e) => {
        e.preventDefault();
        handleItemClick(tag);
      });

      dd.appendChild(item);
    }

    document.body.appendChild(dd);

    const cursorPos = textarea.selectionStart;
    const coords = getCursorCoords(textarea, cursorPos);
    dd.style.left = Math.max(4, coords.left) + 'px';
    dd.style.top = (coords.bottom + 4) + 'px';

    const ddRect = dd.getBoundingClientRect();
    if (ddRect.bottom > window.innerHeight) {
      dd.style.top = Math.max(4, coords.top - ddRect.height - 4) + 'px';
    }
    if (ddRect.right > window.innerWidth) {
      dd.style.left = Math.max(4, window.innerWidth - ddRect.width - 8) + 'px';
    }

    activeDropdown = dd;
  }

  function hideHashtagDropdown() {
    const existing = document.getElementById('hashtag-dropdown');
    if (existing) existing.remove();
    activeDropdown = null;
    hashtagSelectedIndex = -1;
  }

  function initHashtagAutocomplete(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;

    const onInput = () => {
      const hashIdx = textarea.value.lastIndexOf('#');
      if (hashIdx === -1) {
        hideHashtagDropdown();
        dismissedHash = null;
        return;
      }
      const rest = textarea.value.substring(hashIdx + 1);
      const endOfWord = rest.search(/[\s\W]|$/);
      const query = endOfWord >= 0 ? rest.substring(0, endOfWord) : rest;
      if (!query) {
        hideHashtagDropdown();
        dismissedHash = null;
        return;
      }

      if (dismissedHash && dismissedHash.hashIdx === hashIdx && dismissedHash.query === query) {
        hideHashtagDropdown();
        return;
      }

      const allTags = getAllTagNames();
      const exact = allTags.includes(query);
      const matches = allTags.filter(t => t.startsWith(query));
      const hasContinuations = matches.some(t => t.length > query.length);
      if (matches.length === 0 || (exact && !hasContinuations)) {
        hideHashtagDropdown();
        dismissedHash = null;
        return;
      }

      dismissedHash = null;
      showHashtagDropdown(textarea, matches, hashIdx);
    };

    textarea.addEventListener('input', onInput);

    textarea.addEventListener('keydown', (e) => {
      if (!activeDropdown) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = activeDropdown.querySelectorAll('.hashtag-item');
        if (!items.length) return;

        if (items.length === 1 && e.key === 'ArrowDown') {
          items[0].click();
          return;
        }

        items.forEach(el => el.classList.remove('hashtag-highlighted'));

        if (e.key === 'ArrowDown') {
          hashtagSelectedIndex = Math.min(hashtagSelectedIndex + 1, items.length - 1);
        } else {
          hashtagSelectedIndex = Math.max(hashtagSelectedIndex - 1, -1);
        }

        if (hashtagSelectedIndex >= 0) {
          items[hashtagSelectedIndex].classList.add('hashtag-highlighted');
          items[hashtagSelectedIndex].scrollIntoView({ block: 'nearest' });
        }
        return;
      }

      if (e.key === 'Enter') {
        if (hashtagSelectedIndex >= 0) {
          e.preventDefault();
          const items = activeDropdown.querySelectorAll('.hashtag-item');
          items[hashtagSelectedIndex].click();
          return;
        }
      }

      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        const hashIdx = textarea.value.lastIndexOf('#');
        if (hashIdx >= 0) {
          const rest = textarea.value.substring(hashIdx + 1);
          const endOfWord = rest.search(/[\s\W]|$/);
          dismissedHash = { hashIdx, query: endOfWord >= 0 ? rest.substring(0, endOfWord) : rest };
        }
        hideHashtagDropdown();
      }
    });

    textarea.addEventListener('blur', () => {
      setTimeout(hideHashtagDropdown, 150);
    });
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
      const accPause = tracker.accumulatedPauseTime || 0;
      const totalRestSec = currentRestSec + Math.floor(accPause / 1000);
      elapsedSeconds = _showCurrentRest ? currentRestSec : totalRestSec;
      updateTimerDisplayEl(elapsedSeconds, tracker.isBreak, _showCurrentRest);
    } else {
      const rawMs = now - (tracker.segmentStartTime || tracker.startTime);
      const segSec = Math.floor(rawMs / 1000);
      const savedMs = tracker.totalSavedDurationMs || 0;
      elapsedSeconds = _showSegmentOnly ? segSec : segSec + Math.floor(savedMs / 1000);
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
      label.textContent = _showSegmentOnly ? 'Current Duration' : 'Segment Duration';
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
    if (tab === 'tags') renderTagSettings();
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
      ? 'grid gap-3'
      : 'space-y-3';
    if (_isGridMode) {
      container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))';
    } else {
      container.style.gridTemplateColumns = '';
    }
    container.innerHTML = recent.map(session => _isGridMode
      ? `
      <div class="session-card-grid group relative bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 hover:border-gray-400 dark:bg-gray-600 dark:border-gray-500 dark:hover:border-gray-400"${session.notes ? ` title="${session.notes}"` : ''}>
        <div class="flex">
          <div class="w-1 self-stretch rounded-l-lg ${getStripeColor(session.tags)}"></div>
          <div class="flex-1 p-3">
            <div class="day-type-pill relative group/pill inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${getDayTypePillClasses(session.dayType)}">
              <span class="w-1.5 h-1.5 rounded-full ${getDayTypeDotColor(session.dayType)}"></span>
              <span>${formatGridDate(session.date)}</span>
              <div class="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 text-xs text-gray-800 bg-white border border-gray-200 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/pill:opacity-100 transition-opacity duration-150 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 z-10">
                ${session.dayType}
              </div>
            </div>
            <div class="grid-time text-xs text-gray-500 dark:text-gray-400 mb-2">${utils.formatTime(new Date(session.startTime))} \u2013 ${utils.formatTime(new Date(session.endTime))}</div>
            <div class="flex items-center justify-end mb-2">
              <span class="grid-dur text-xs text-gray-600 dark:text-gray-300"><i class="far fa-clock mr-1"></i>${session.duration}</span>
            </div>
            <div class="grid-tags relative flex flex-wrap gap-1 pt-2 border-t border-gray-100 dark:border-gray-500">
              ${session.tags ? session.tags.map(tag => `<span class="text-xs px-1.5 py-0.5 rounded ${getTagBadgeClass(tag, true)}">${tag}</span>`).join('') : ''}
              <div class="grid-actions absolute inset-0 flex items-center justify-center gap-2 bg-white/90 dark:bg-gray-600/90 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded">
                <button class="edit-session px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-gray-500" data-id="${session.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-session px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-gray-500" data-id="${session.id}"><i class="fas fa-trash-alt"></i></button>
              </div>
            </div>
          </div>
        </div>
        ${session.mood ? `
        <div class="grid-stars absolute top-3 right-3 flex items-center">
          ${Array.from({length: 5}).map((_, i) => `<span class="text-xs ${i < Math.floor(session.mood) ? 'text-yellow-500' : 'text-gray-300'}">${i < Math.floor(session.mood) ? '\u2605' : '\u2606'}</span>`).join('')}
        </div>
        ` : ''}
      </div>`
      : `
      <div class="session-card group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 hover:border-gray-400 dark:bg-gray-600 dark:border-gray-500 dark:hover:border-gray-400"${session.notes ? ` title="${session.notes}"` : ''}>
        <div class="flex">
          <div class="w-1 self-stretch rounded-l-lg ${getStripeColor(session.tags)}"></div>
          <div class="flex-1 p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="day-type-pill relative group/pill inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getDayTypePillClasses(session.dayType)}">
                <span class="w-1.5 h-1.5 rounded-full ${getDayTypeDotColor(session.dayType)}"></span>
                <span>${formatGridDate(session.date)}</span>
                <div class="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 text-xs text-gray-800 bg-white border border-gray-200 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/pill:opacity-100 transition-opacity duration-150 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 z-10">
                  ${session.dayType}
                </div>
              </div>
              ${session.mood ? `
              <div class="list-stars flex items-center">
                ${Array.from({length: 5}).map((_, i) => `<span class="text-xs ${i < Math.floor(session.mood) ? 'text-yellow-500' : 'text-gray-300'}">${i < Math.floor(session.mood) ? '\u2605' : '\u2606'}</span>`).join('')}
              </div>
              ` : ''}
            </div>
            <div class="list-time text-xs text-gray-500 dark:text-gray-400 mb-2">${utils.formatTime(new Date(session.startTime))} \u2013 ${utils.formatTime(new Date(session.endTime))}</div>
            <div class="flex items-center justify-end mb-2">
              <span class="list-dur text-xs text-gray-600 dark:text-gray-300"><i class="far fa-clock mr-1"></i>${session.duration}</span>
            </div>
            ${session.notes ? `
            <div class="list-note flex items-start gap-1 mb-2 text-xs text-gray-600 dark:text-gray-400">
              <i class="fas fa-quote-left mt-0.5 opacity-50"></i>
              <span class="line-clamp-2">${session.notes}</span>
            </div>
            ` : ''}
            <div class="list-tags relative flex flex-wrap gap-1 pt-2 border-t border-gray-100 dark:border-gray-500">
              ${session.tags ? session.tags.map(tag => `<span class="text-xs px-1.5 py-0.5 rounded ${getTagBadgeClass(tag, true)}">${tag}</span>`).join('') : ''}
              <div class="grid-actions absolute inset-0 flex items-center justify-center gap-2 bg-white/90 dark:bg-gray-600/90 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded">
                <button class="edit-session px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-gray-500" data-id="${session.id}"><i class="fas fa-edit"></i> Edit</button>
                <button class="delete-session px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-gray-500" data-id="${session.id}"><i class="fas fa-trash-alt"></i> Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>`
    ).join('');
  }

  let expandedGroups = new Set();

  function renderSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'session-card bg-white border border-gray-200 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:hover:bg-gray-500';
    card.dataset.sessionId = session.id;
    const info = document.createElement('div');
    const timeRange = document.createElement('div');
    timeRange.className = 'text-sm font-medium dark:text-white';
    timeRange.textContent = `${utils.formatTime(new Date(session.startTime))} - ${utils.formatTime(new Date(session.endTime))}`;
    const duration = document.createElement('div');
    duration.className = 'text-xs text-gray-500 dark:text-gray-300';
    duration.textContent = session.duration;
    info.appendChild(timeRange);
    info.appendChild(duration);
    if (session.accumulatedPauseTimeSec) {
      const restEl = document.createElement('div');
      restEl.className = 'text-xs text-gray-400 dark:text-gray-400';
      restEl.textContent = `Rest ${utils.formatDuration(session.accumulatedPauseTimeSec)}`;
      info.appendChild(restEl);
    }
    const notes = document.createElement('div');
    notes.className = 'text-sm text-gray-600 truncate max-w-xs dark:text-gray-200';
    notes.textContent = session.notes || 'No notes';
    card.appendChild(info);
    card.appendChild(notes);
    return card;
  }

  function renderDaySessions(date, sessions, container) {
    const s = store.getState();
    const md = s.markedDays.find(d => d.date === date);
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
    for (const session of sessions) {
      container.appendChild(renderSessionCard(session));
    }
  }

  function renderGroupHeader(groupId, label, sessionCount, totalSec) {
    const expanded = isGroupExpanded(expandedGroups, groupId);
    const header = document.createElement('div');
    header.className = 'group-header px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg select-none';
    header.dataset.groupId = groupId;
    const chevron = document.createElement('i');
    chevron.className = `fas fa-chevron-${expanded ? 'down' : 'right'} text-xs text-gray-400 transition-transform`;
    const name = document.createElement('span');
    name.className = 'font-medium text-sm dark:text-white';
    name.textContent = label;
    const countBadge = document.createElement('span');
    countBadge.className = 'group-session-count text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300';
    countBadge.textContent = sessionCount;
    const durationBadge = document.createElement('span');
    durationBadge.className = 'text-xs text-gray-500 dark:text-gray-400';
    durationBadge.textContent = utils.formatDuration(totalSec);
    header.appendChild(chevron);
    header.appendChild(name);
    header.appendChild(countBadge);
    header.appendChild(durationBadge);
    return { header, expanded };
  }

  function renderAllSessions() {
    const container = document.getElementById('all-sessions-list');
    const s = store.getState();
    if (!container) return;
    const view = s.allSessionsView || 'month';
    let sessionsToRender = [...s.sessions];
    const dateFilter = document.getElementById('date-filter');
    const monthFilter = document.getElementById('month-filter');
    const yearFilter = document.getElementById('year-filter');
    const dayTypeFilter = document.getElementById('day-type-filter');
    if (dateFilter && dateFilter.value) {
      sessionsToRender = sessionsToRender.filter(sess => sess.date === dateFilter.value);
    }
    if (monthFilter && monthFilter.value) {
      const m = parseInt(monthFilter.value, 10);
      sessionsToRender = sessionsToRender.filter(sess => new Date(sess.startTime).getMonth() + 1 === m);
    }
    if (yearFilter && yearFilter.value) {
      const y = parseInt(yearFilter.value, 10);
      sessionsToRender = sessionsToRender.filter(sess => new Date(sess.startTime).getFullYear() === y);
    }
    if (dayTypeFilter && dayTypeFilter.value) {
      sessionsToRender = sessionsToRender.filter(sess => sess.dayType === dayTypeFilter.value);
    }
    const sessionTagFilter = document.getElementById('session-tag-filter');
    if (sessionTagFilter) {
      const selectedBuckets = Array.from(sessionTagFilter.selectedOptions).map(o => o.value);
      const allBuckets = Object.keys(s.tagBuckets || {});
      if (selectedBuckets.length > 0 && selectedBuckets.length < allBuckets.length) {
        const validTags = new Set(selectedBuckets);
        for (const bucket of selectedBuckets) {
          for (const sub of (s.tagBuckets[bucket] || [])) validTags.add(sub);
        }
        sessionsToRender = sessionsToRender.filter(sess => (sess.tags || []).some(t => validTags.has(t)));
      }
    }
    if (sessionsToRender.length === 0) {
      container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No sessions found. Start tracking or add a session manually.</p>';
      return;
    }
    container.innerHTML = '';
    const renderGroup = (groupId, label, sessions, childRenderer) => {
      const group = document.createElement('div');
      group.className = 'collapsible-group';
      const expanded = isGroupExpanded(expandedGroups, groupId);
      const { header } = renderGroupHeader(groupId, label, sessions.length, getTotalDuration(sessions));
      group.appendChild(header);
      if (expanded) childRenderer(group);
      container.appendChild(group);
    };
    if (view === 'year') {
      const grouped = groupByYear(sessionsToRender);
      for (const [year, months] of Object.entries(grouped)) {
        for (const [month, days] of Object.entries(months)) {
          const groupSessions = Object.values(days).flat();
          renderGroup(`year-${year}-${month}`, `${month} ${year}`, groupSessions, (group) => {
            for (const [date, daySessions] of Object.entries(days)) {
              renderDaySessions(date, daySessions, group);
            }
          });
        }
      }
    } else if (view === 'month') {
      const grouped = groupByMonth(sessionsToRender);
      for (const [week, days] of Object.entries(grouped)) {
        const groupSessions = Object.values(days).flat();
        renderGroup(`month-${week}`, `Week ${week.split('-W')[1]}`, groupSessions, (group) => {
          for (const [date, daySessions] of Object.entries(days)) {
            renderDaySessions(date, daySessions, group);
          }
        });
      }
    } else {
      const grouped = groupByWeek(sessionsToRender);
      for (const [date, daySessions] of Object.entries(grouped)) {
        renderGroup(`week-${date}`, new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }), daySessions, (group) => {
          for (const session of daySessions) {
            group.appendChild(renderSessionCard(session));
          }
        });
      }
    }
  }

  function toggleAllSessionGroup(groupId) {
    expandedGroups = toggleGroup(expandedGroups, groupId);
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

  function populateYearFilter() {
    const filter = document.getElementById('year-filter');
    const s = store.getState();
    if (!filter) return;
    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;
    filter.innerHTML = '<option value="">All Years</option>';
    const years = new Set();
    for (const session of s.sessions) {
      years.add(new Date(session.startTime).getFullYear());
    }
    years.add(currentYear);
    years.add(prevYear);
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    for (const year of sortedYears) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      filter.appendChild(option);
    }
  }

  function populateSessionTagFilter() {
    const filter = document.getElementById('session-tag-filter');
    if (!filter) return;
    const s = store.getState();
    const tagBuckets = s.tagBuckets || {};
    const prevSelected = new Set(Array.from(filter.selectedOptions).map(o => o.value));
    filter.innerHTML = '';
    const buckets = Object.keys(tagBuckets);
    for (const bucket of buckets) {
      const option = document.createElement('option');
      option.value = bucket;
      option.textContent = bucket;
      if (prevSelected.size === 0 || prevSelected.has(bucket)) option.selected = true;
      filter.appendChild(option);
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
    const existingWarning = document.getElementById('multiple-defaults-warning');
    if (existingWarning) existingWarning.remove();
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
    const existingWarning = document.getElementById('multiple-defaults-warning');
    if (existingWarning) existingWarning.remove();
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

  const DEFAULT_BUCKET_KEYS = ['work', 'rest', 'study', 'sport', 'other'];

  function initializeCurrentSessionTags(bucket = 'work') {
    const container = document.getElementById('current-session-tags');
    const s = store.getState();
    if (!container) return;
    container.innerHTML = '';

    const tagBuckets = s.tagBuckets || {};
    const hasBuckets = DEFAULT_BUCKET_KEYS.every(k => Array.isArray(tagBuckets[k]));

    if (!hasBuckets) {
      renderLegacyTagPicker(container, s);
      return;
    }

    let selectedDefault = bucket;

    const row1 = document.createElement('div');
    row1.className = 'picker-row-1 flex flex-wrap gap-1.5 mb-2';

    for (const tagName of DEFAULT_BUCKET_KEYS) {
      const isSelected = tagName === selectedDefault;
      const chip = createPickerTagChip(tagName, isSelected);
      chip.addEventListener('click', () => {
        if (chip.classList.contains('selected')) return;
        row1.querySelectorAll('.tag-chip.selected').forEach(el => {
          el.classList.remove('selected');
          el.className = el.className.replace(/selected\s*/, '');
          const tn = el.dataset.tag;
          el.className = `tag-chip inline-block px-2 py-1 rounded-full text-sm cursor-pointer select-none ${getTagBadgeClass(tn, false)}`;
        });
        chip.classList.add('selected');
        chip.className = `tag-chip inline-block px-2 py-1 rounded-full text-sm cursor-pointer select-none selected ${getTagBadgeClass(tagName, true)}`;
        selectedDefault = tagName;
        renderRow2(container, row2, tagBuckets, selectedDefault);
      });
      row1.appendChild(chip);
    }

    const row2 = document.createElement('div');
    row2.className = 'picker-row-2 flex flex-wrap gap-1.5';

    container.appendChild(row1);
    container.appendChild(row2);

    renderRow2(container, row2, tagBuckets, selectedDefault);
  }

  function renderRow2(container, row2, tagBuckets, defaultName, selectedSubtags = []) {
    row2.innerHTML = '';
    const selectedSet = new Set(selectedSubtags);
    const subtags = tagBuckets[defaultName] || [];

    if (subtags.length > 0) {
      const maxVisible = 6;
      const hasMore = subtags.length > maxVisible;
      const visible = hasMore ? subtags.slice(0, maxVisible) : subtags;
      const hidden = hasMore ? subtags.slice(maxVisible) : [];

      for (const subtag of visible) {
        const isSelected = selectedSet.has(subtag);
        const chip = createPickerTagChip(subtag, isSelected);
        chip.addEventListener('click', () => {
          const nowSelected = chip.classList.toggle('selected');
          chip.className = `tag-chip inline-block px-2 py-1 rounded-full text-sm cursor-pointer select-none ${nowSelected ? 'selected' : ''} ${getTagBadgeClass(chip.dataset.tag, nowSelected)}`;
        });
        row2.appendChild(chip);
      }

      if (hasMore) {
        const moreBtn = document.createElement('button');
        moreBtn.className = 'tag-more-btn inline-block px-2 py-1 rounded-full text-sm cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 bg-transparent border border-dashed border-gray-300 dark:border-gray-600';
        moreBtn.textContent = `+${hidden.length} more`;
        moreBtn.addEventListener('click', () => {
          moreBtn.remove();
          for (const subtag of hidden) {
            const isSelected = selectedSet.has(subtag);
            const chip = createPickerTagChip(subtag, isSelected);
            chip.addEventListener('click', () => {
              const nowSelected = chip.classList.toggle('selected');
              chip.className = `tag-chip inline-block px-2 py-1 rounded-full text-sm cursor-pointer select-none ${nowSelected ? 'selected' : ''} ${getTagBadgeClass(chip.dataset.tag, nowSelected)}`;
            });
            row2.appendChild(chip);
          }
        });
        row2.appendChild(moreBtn);
      }
    }

    const subtagSet = new Set(subtags);
    for (const legacySubtag of selectedSubtags) {
      if (subtagSet.has(legacySubtag)) continue;
      const chip = createPickerTagChip(legacySubtag, true);
      chip.classList.add('readonly');
      chip.classList.remove('cursor-pointer');
      chip.classList.add('cursor-default');
      chip.title = `${legacySubtag} (legacy tag, read-only)`;
      row2.appendChild(chip);
    }
  }

  function renderLegacyTagPicker(container, s) {
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

  function initializeSessionModalTags(bucket = 'work', subtags = []) {
    const container = document.getElementById('tags-container');
    const s = store.getState();
    if (!container) return;
    container.innerHTML = '';

    const tagBuckets = s.tagBuckets || {};
    const hasBuckets = DEFAULT_BUCKET_KEYS.every(k => Array.isArray(tagBuckets[k]));

    if (!hasBuckets) {
      renderLegacyModalTagPicker(container, s);
      return;
    }

    let selectedDefault = bucket;

    const row1 = document.createElement('div');
    row1.className = 'picker-row-1 flex flex-wrap gap-1.5 mb-2';

    for (const tagName of DEFAULT_BUCKET_KEYS) {
      const isSelected = tagName === selectedDefault;
      const chip = createPickerTagChip(tagName, isSelected);
      chip.addEventListener('click', () => {
        if (chip.classList.contains('selected')) return;
        row1.querySelectorAll('.tag-chip.selected').forEach(el => {
          el.classList.remove('selected');
          el.className = el.className.replace(/selected\s*/, '');
          const tn = el.dataset.tag;
          el.className = `tag-chip inline-block px-2 py-1 rounded-full text-sm cursor-pointer select-none ${getTagBadgeClass(tn, false)}`;
        });
        chip.classList.add('selected');
        chip.className = `tag-chip inline-block px-2 py-1 rounded-full text-sm cursor-pointer select-none selected ${getTagBadgeClass(tagName, true)}`;
        selectedDefault = tagName;
        renderRow2(container, row2, tagBuckets, selectedDefault, subtagNames);
      });
      row1.appendChild(chip);
    }

    const row2 = document.createElement('div');
    row2.className = 'picker-row-2 flex flex-wrap gap-1.5';

    container.appendChild(row1);
    container.appendChild(row2);

    const subtagNames = subtags.filter(t => !DEFAULT_BUCKET_KEYS.includes(t));
    renderRow2(container, row2, tagBuckets, selectedDefault, subtagNames);
  }

  function renderLegacyModalTagPicker(container, s) {
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

  function setOnDeleteCustomTag(cb) {
    _onDeleteCustomTag = cb;
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
        .map(name => s.tags.find(t => t.name === name) || { name, isEnabled: true, isDefault: false })
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
        deleteBtn.addEventListener('click', () => {
          if (_onDeleteCustomTag) _onDeleteCustomTag(tag.name);
        });
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

  function initializeBreakSessionTags(bucket = 'work') {
    const container = document.getElementById('break-session-tags');
    const s = store.getState();
    if (!container) return;
    container.innerHTML = '';

    const tagBuckets = s.tagBuckets || {};
    const hasBuckets = DEFAULT_BUCKET_KEYS.every(k => Array.isArray(tagBuckets[k]));

    if (!hasBuckets) {
      renderLegacyTagPicker(container, s);
      return;
    }

    let selectedDefault = bucket;

    const row1 = document.createElement('div');
    row1.className = 'picker-row-1 flex flex-wrap gap-1.5 mb-2';

    for (const tagName of DEFAULT_BUCKET_KEYS) {
      const isSelected = tagName === selectedDefault;
      const chip = createPickerTagChip(tagName, isSelected);
      chip.addEventListener('click', () => {
        if (chip.classList.contains('selected')) return;
        row1.querySelectorAll('.tag-chip.selected').forEach(el => {
          el.classList.remove('selected');
          el.className = el.className.replace(/selected\s*/, '');
          const tn = el.dataset.tag;
          el.className = `tag-chip inline-block px-2 py-1 rounded-full text-sm cursor-pointer select-none ${getTagBadgeClass(tn, false)}`;
        });
        chip.classList.add('selected');
        chip.className = `tag-chip inline-block px-2 py-1 rounded-full text-sm cursor-pointer select-none selected ${getTagBadgeClass(tagName, true)}`;
        selectedDefault = tagName;
        renderRow2(container, row2, tagBuckets, selectedDefault);
      });
      row1.appendChild(chip);
    }

    const row2 = document.createElement('div');
    row2.className = 'picker-row-2 flex flex-wrap gap-1.5';

    container.appendChild(row1);
    container.appendChild(row2);

    renderRow2(container, row2, tagBuckets, selectedDefault);
  }

  function initializeBreakSessionMood() {
    const container = document.getElementById('break-session-mood');
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
        const moodInput = document.getElementById('break-session-mood-input');
        const moodValue = document.getElementById('break-mood-value');
        if (moodInput) moodInput.value = i;
        if (moodValue) moodValue.textContent = i + '.0';
        createStarsForBreakSession();
      });
      container.appendChild(star);
    }
  }

  function createStarsForBreakSession() {
    const container = document.getElementById('break-session-mood');
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
    const subtagFilter = document.getElementById('subtag-filter');
    const moodThreshold = document.getElementById('mood-threshold');
    const selectedTags = tagFilter ? Array.from(tagFilter.selectedOptions).map(opt => opt.value) : [];
    const selectedSubtags = subtagFilter ? Array.from(subtagFilter.selectedOptions).map(opt => opt.value) : [];
    const selectedMoods = moodThreshold ? Array.from(moodThreshold.selectedOptions).map(opt => parseInt(opt.value)) : [];
    let filteredSessions = [...s.sessions];
    if (s.currentStatsPeriod === 'yearly') {
      const yearSelector = document.getElementById('year-selector');
      if (yearSelector) {
        const selectedYear = parseInt(yearSelector.value);
        filteredSessions = filteredSessions.filter(sess => new Date(sess.startTime).getFullYear() === selectedYear);
      }
    }
    const activeTags = selectedTags.filter(t => t !== 'all');
    const activeSubtags = selectedSubtags.filter(t => t !== 'all');
    const allSelectedTags = [...activeTags, ...activeSubtags];
    if (allSelectedTags.length > 0) {
      filteredSessions = filteredSessions.filter(sess => allSelectedTags.some(tag => sess.tags && sess.tags.includes(tag)));
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
    const subtagColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48', '#a855f7', '#22c55e', '#eab308'];
    const currentStatsPeriod = s.currentStatsPeriod;
    let stackedDatasets = null;
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
      const topSelected = selectedTags.filter(t => t !== 'all');
      const childSelected = selectedSubtags.filter(t => t !== 'all');
      if (topSelected.length === 1 && childSelected.length === 0) {
        const bucketName = topSelected[0];
        const subtagsInBucket = new Set();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = utils.formatDate(date);
          const daySessions = filteredSessions.filter(sess => sess.date === dateStr);
          for (const sess of daySessions) {
            if (sess.tags) {
              for (const tag of sess.tags) {
                if (tag !== bucketName && !tag.startsWith('#')) {
                  subtagsInBucket.add(tag);
                }
              }
            }
          }
        }
        if (subtagsInBucket.size > 0) {
          const comboHours = {};
          for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = utils.formatDate(date);
            const daySessions = filteredSessions.filter(sess => sess.date === dateStr);
            for (const sess of daySessions) {
              if (sess.tags) {
                const matchTags = sess.tags.filter(t => subtagsInBucket.has(t));
                if (matchTags.length > 0) {
                  const key = [...matchTags].sort().join('+');
                  if (!comboHours[key]) {
                    comboHours[key] = { label: key, hours: new Array(7).fill(0) };
                  }
                  comboHours[key].hours[6 - i] += (sess.durationSec || 0) / 3600;
                }
              }
            }
          }
          stackedDatasets = Object.values(comboHours).map((entry, idx) => ({
            label: entry.label,
            data: entry.hours,
            backgroundColor: subtagColors[idx % subtagColors.length],
            borderWidth: 1,
          }));
        }
      } else if (topSelected.length === 0 && childSelected.length >= 2) {
        const comboHours = {};
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = utils.formatDate(date);
          const daySessions = filteredSessions.filter(sess => sess.date === dateStr);
          for (const sess of daySessions) {
            if (sess.tags) {
              const matchTags = sess.tags.filter(t => childSelected.includes(t));
              if (matchTags.length > 0) {
                const key = [...matchTags].sort().join('+');
                if (!comboHours[key]) {
                  comboHours[key] = { label: key, hours: new Array(7).fill(0) };
                }
                comboHours[key].hours[6 - i] += (sess.durationSec || 0) / 3600;
              }
            }
          }
        }
        stackedDatasets = Object.values(comboHours).map((entry, idx) => ({
          label: entry.label,
          data: entry.hours,
          backgroundColor: subtagColors[idx % subtagColors.length],
          borderWidth: 1,
        }));
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
      updateYearlyStatsTable(selectedYear, filteredSessions);
      if (s.configs.length > 0 && s.configs[0].salaryValue) {
        const incomeSessions = filteredSessions.filter(sess => sess.tags && sess.tags.includes('work'));
        updateIncomeChart(selectedYear, incomeSessions);
        const incomeContainer = document.getElementById('income-chart-container');
        if (incomeContainer) incomeContainer.classList.remove('hidden');
      } else {
        const incomeContainer = document.getElementById('income-chart-container');
        if (incomeContainer) incomeContainer.classList.add('hidden');
      }
    }
    let periodSessions = filteredSessions;
    if (currentStatsPeriod === 'daily') {
      const periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - 6);
      periodStart.setHours(0, 0, 0, 0);
      periodSessions = filteredSessions.filter(s => new Date(s.startTime) >= periodStart);
    } else if (currentStatsPeriod === 'weekly') {
      const weekStartDay = s.configs.length > 0 ? s.configs[0].weekStart : 1;
      const periodStart = new Date(now);
      const dayDiff = (periodStart.getDay() - weekStartDay + 7) % 7;
      periodStart.setDate(periodStart.getDate() - dayDiff - (7 * 7));
      periodStart.setHours(0, 0, 0, 0);
      periodSessions = filteredSessions.filter(s => new Date(s.startTime) >= periodStart);
    } else if (currentStatsPeriod === 'monthly') {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      periodSessions = filteredSessions.filter(s => new Date(s.startTime) >= periodStart);
    }
    renderBucketStats(periodSessions);
    const timeCtx = document.getElementById('timeChart');
    if (timeChart) { timeChart.destroy(); timeChart = null; }
    if (timeCtx) {
      if (stackedDatasets) {
        timeChart = new Chart(timeCtx.getContext('2d'), {
          type: 'bar',
          data: { labels, datasets: stackedDatasets },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true, position: 'bottom' },
              tooltip: {
                callbacks: {
                  label(context) {
                    const hours = context.raw;
                    const mins = Math.round((hours % 1) * 60);
                    return `${context.dataset.label}: ${Math.floor(hours)}h ${mins}m`;
                  }
                }
              }
            },
            scales: {
              x: { stacked: true },
              y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Hours' } }
            }
          }
        });
      } else {
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

  function renderBucketStats(sessions) {
    const container = document.getElementById('bucket-stats');
    if (!container) return;

    if (!sessions) {
      sessions = store.getState().sessions || [];
    }

    if (sessions.length === 0) {
      container.innerHTML = '';
      return;
    }

    const bucketsData = {};
    for (const key of DEFAULT_TAGS) {
      bucketsData[key] = { totalSec: 0, subtags: {} };
    }

    for (const session of sessions) {
      const bucketName = resolveBucket(session);
      const dur = session.durationSec || 0;
      if (!bucketsData[bucketName]) continue;
      bucketsData[bucketName].totalSec += dur;
      if (session.tags) {
        for (const tag of session.tags) {
          if (!DEFAULT_TAGS.includes(tag)) {
            bucketsData[bucketName].subtags[tag] = (bucketsData[bucketName].subtags[tag] || 0) + dur;
          }
        }
      }
    }

    container.innerHTML = '<h3 class="text-lg font-medium mb-4">Time by Bucket</h3>';

    for (const bucketName of DEFAULT_TAGS) {
      const data = bucketsData[bucketName];
      if (data.totalSec === 0) continue;

      const row = document.createElement('div');
      const borderColor = getBucketBorderColor(bucketName);
      row.className = `bucket-stat-row mb-2 pl-3 border-l-4 ${borderColor}`;

      const headerRow = document.createElement('div');
      headerRow.className = 'flex items-center justify-between';

      const nameSpan = document.createElement('span');
      nameSpan.className = `inline-block px-2 py-0.5 rounded-full text-sm font-medium ${getTagBadgeClass(bucketName, true)}`;
      nameSpan.textContent = bucketName;
      headerRow.appendChild(nameSpan);

      const durationSpan = document.createElement('span');
      durationSpan.className = 'text-sm font-medium text-gray-700 dark:text-gray-300';
      durationSpan.textContent = utils.formatDuration(data.totalSec);
      headerRow.appendChild(durationSpan);

      row.appendChild(headerRow);

      const subtagNames = Object.keys(data.subtags);
      if (subtagNames.length > 0) {
        const expandBtn = document.createElement('button');
        expandBtn.className = 'bucket-expand-btn text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 mt-1';
        expandBtn.textContent = `▼ ${subtagNames.length} subtags`;
        expandBtn.addEventListener('click', () => {
          const isExpanded = subtagsContainer.classList.toggle('hidden');
          expandBtn.textContent = isExpanded
            ? `▶ ${subtagNames.length} subtags`
            : `▼ ${subtagNames.length} subtags`;
        });
        row.appendChild(expandBtn);

        const subtagsContainer = document.createElement('div');
        subtagsContainer.className = 'ml-3 mt-1 space-y-0.5 hidden';
        for (const subtag of subtagNames.sort()) {
          const stRow = document.createElement('div');
          stRow.className = 'bucket-subtag-row flex items-center justify-between text-xs text-gray-600 dark:text-gray-400';
          const stName = document.createElement('span');
          stName.textContent = subtag;
          const stDur = document.createElement('span');
          stDur.textContent = utils.formatDuration(data.subtags[subtag]);
          stRow.appendChild(stName);
          stRow.appendChild(stDur);
          subtagsContainer.appendChild(stRow);
        }
        row.appendChild(subtagsContainer);
      }

      container.appendChild(row);
    }
  }

  function resolveBucket(session) {
    if (session.bucket && DEFAULT_TAGS.includes(session.bucket)) {
      return session.bucket;
    }
    const found = DEFAULT_TAGS.find(t => session.tags && session.tags.includes(t));
    return found || DEFAULT_TAGS[DEFAULT_TAGS.length - 1];
  }

  function getBucketBorderColor(bucketName) {
    switch (bucketName) {
      case 'work': return 'border-l-blue-500';
      case 'rest': return 'border-l-purple-500';
      case 'study': return 'border-l-orange-500';
      case 'sport': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  }

  function updateYearlyStatsTable(year, filteredSessions) {
    const s = store.getState();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const body = document.getElementById('yearly-stats-body');
    const table = document.getElementById('yearly-stats-table');
    if (!body || !table) return;
    let tableHTML = '';
    const latestConfig = s.configs[0] || { workingHours: 8, breakDuration: 60 };
    const sessionsToUse = filteredSessions || s.sessions;
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(year, i, 1);
      const monthEnd = new Date(year, i + 1, 0);
      const monthSessions = sessionsToUse.filter(sess => {
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

  function updateIncomeChart(year, filteredSessions) {
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
      const monthSessions = (filteredSessions || s.sessions).filter(sess => {
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
    toggleAllSessionGroup,
    populateYearSelector,
    populateYearFilter,
    populateSessionTagFilter,
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
    initializeBreakSessionTags,
    initializeBreakSessionMood,
    createStarsForBreakSession,
    renderTagSettings,
    setOnTagBucketsChange,
    setOnDeleteCustomTag,
    getTagBadgeClass,
    createPickerTagChip,
    showStartPicker,
    hideStartPicker,
    initHashtagAutocomplete,
    enableDarkMode,
    disableDarkMode,
    toggleDarkMode,
    showCrashRecoveryBanner,
    hideCrashRecoveryBanner,
    applyLatestConfig,
    updateStatistics,
    renderBucketStats,
    updateYearlyStatsTable,
    updateIncomeChart,
    getWorkDaysInMonth,
  };
}
