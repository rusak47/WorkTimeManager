const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthStartDay(year, month) {
  const d = new Date(year, month, 1);
  return (d.getDay() + 6) % 7;
}

function buildTooltip(dayInfo, dateStr, markedDays) {
  const parts = [];
  if (dayInfo?.name) parts.push(dayInfo.name);
  if (dayInfo?.note) parts.push(dayInfo.note);
  if (dayInfo?.swapSource) parts.push(`(moved from ${dayInfo.swapSource})`);
  const marked = markedDays.find(d => d.date === dateStr);
  if (marked && marked.description) parts.push(marked.description);
  return parts.join(' — ');
}

function buildCellClass(dayInfo, dateStr, todayStr, hasSessions, markedDays) {
  const parts = ['cal-day'];
  if (dateStr === todayStr) parts.push('cal-today');
  if (hasSessions) parts.push('cal-has-sessions');
  if (!dayInfo) return parts;

  const isHoliday = dayInfo.isHoliday || markedDays.some(d => d.date === dateStr && d.dayType === 'Holiday');
  const isVacation = dayInfo.isVacation || markedDays.some(d => d.date === dateStr && d.dayType === 'Vacation');

  if (isHoliday) parts.push('cal-holiday');
  else if (isVacation) parts.push('cal-vacation');
  else if (dayInfo.isWeekend) parts.push('cal-weekend');

  if (dayInfo.isMemoriam) parts.push('cal-memoriam');
  if (dayInfo.isShortDay) parts.push('cal-short');

  if (dayInfo.note && !dayInfo.isHoliday && !dayInfo.isMemoriam && !dayInfo.isShortDay && !isVacation) {
    parts.push('cal-information');
  }

  return parts;
}

function countWorkDays(year, month, calendarService) {
  const daysInMonth = getDaysInMonth(year, month);
  let workDays = 0;
  let shortDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day);
    const info = calendarService ? calendarService.getDayInfo(dateStr) : null;
    if (!info) {
      const d = new Date(year, month, day);
      if (d.getDay() !== 0 && d.getDay() !== 6) workDays++;
      continue;
    }
    if (info.dayType === 'workday') {
      workDays++;
      if (info.isShortDay) shortDays++;
    }
  }
  return { workDays, shortDays };
}

function collectMonthEvents(year, month, calendarService) {
  const events = [];
  const daysInMonth = getDaysInMonth(year, month);
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day);
    const info = calendarService ? calendarService.getDayInfo(dateStr) : null;
    if (!info) continue;
    const label = info.name || info.note;
    if (!label) continue;
    events.push({ date: dateStr, label, info });
  }
  return events;
}

export function createCalendarView(store) {
  const now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth();

  function renderCalendar(calendarService) {
    const grid = document.getElementById('cal-grid');
    const header = document.getElementById('cal-month-year');
    if (!grid) return;

    header.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

    const todayStr = formatDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const startOffset = getMonthStartDay(currentYear, currentMonth);
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const state = store.getState();
    const sessionDates = new Set(state.sessions.map(s => s.date));
    const markedDays = state.markedDays || [];

    let html = '';
    for (const dh of DAY_HEADERS) {
      html += `<div class="cal-day-header">${dh}</div>`;
    }

    for (let i = 0; i < totalCells; i++) {
      let isOther = false;
      let day, month, year;

      if (i < startOffset) {
        day = daysInPrevMonth - startOffset + i + 1;
        month = prevMonth;
        year = prevYear;
        isOther = true;
      } else if (i >= startOffset + daysInMonth) {
        day = i - startOffset - daysInMonth + 1;
        month = currentMonth === 11 ? 0 : currentMonth + 1;
        year = currentMonth === 11 ? currentYear + 1 : currentYear;
        isOther = true;
      } else {
        day = i - startOffset + 1;
        month = currentMonth;
        year = currentYear;
      }

      const dateStr = formatDate(year, month, day);
      const hasSessions = sessionDates.has(dateStr);
      const dayInfo = calendarService ? calendarService.getDayInfo(dateStr) : null;
      const classes = buildCellClass(dayInfo, dateStr, todayStr, hasSessions, markedDays);
      if (isOther) classes.push('cal-day-other');

      const titleText = buildTooltip(dayInfo, dateStr, markedDays);

      html += `<div class="${classes.join(' ')}" data-date="${dateStr}"${titleText ? ` title="${titleText}"` : ''}>`;
      html += `<span class="cal-day-num">${day}</span>`;
      html += '</div>';
    }

    grid.innerHTML = html;

    const legendEl = document.getElementById('cal-legend');
    if (legendEl) {
      const hasDot = Array.from(grid.children).some(c => c.classList.contains('cal-has-sessions'));
      const hasHoliday = Array.from(grid.children).some(c => c.classList.contains('cal-holiday'));
      const hasMemoriam = Array.from(grid.children).some(c => c.classList.contains('cal-memoriam'));
      const hasSwapped = Array.from(grid.children).some(c => c.classList.contains('cal-swapped'));
      const hasShort = Array.from(grid.children).some(c => c.classList.contains('cal-short'));
      const hasVacation = Array.from(grid.children).some(c => c.classList.contains('cal-vacation'));
      const items = [];
      if (hasDot) items.push('<span class="cal-legend-dot">●</span> Tracked sessions');
      if (hasHoliday) items.push('<span class="cal-legend-swatch cal-legend-holiday"></span> Holiday');
      if (hasMemoriam) items.push('<span class="cal-legend-swatch cal-legend-memoriam"></span> Memorial');
      if (hasSwapped) items.push('<span class="cal-legend-swatch cal-legend-swapped"></span> Swapped');
      if (hasShort) items.push('<span class="cal-legend-swatch cal-legend-short"></span> Short day');
      if (hasVacation) items.push('<span class="cal-legend-swatch cal-legend-vacation"></span> Vacation');
      legendEl.innerHTML = items.join('');
    }

    const footer = document.getElementById('cal-footer');
    if (!footer) return;

    const config = state.configs?.[0];
    const workHoursPerDay = config?.workingHours || 8;
    const { workDays, shortDays } = countWorkDays(currentYear, currentMonth, calendarService);
    const totalHours = ((workDays - shortDays) * workHoursPerDay + shortDays * (workHoursPerDay - 1)).toFixed(1);

    const totalEl = document.getElementById('cal-total-hours');
    if (totalEl) {
      const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const monthSessions = state.sessions.filter(s => s.date && s.date.startsWith(monthPrefix) && !s.isBreak);
      const trackedDays = new Set(monthSessions.map(s => s.date)).size;
      const trackedHours = monthSessions.reduce((sum, s) => sum + (s.durationSec || 0), 0) / 3600;
      let text = `Work days: ${workDays} × ${workHoursPerDay}h = ${totalHours}h`;
      if (trackedDays > 0) {
        text += ` | Tracked: ${trackedDays}d ${trackedHours.toFixed(1)}h`;
      }
      totalEl.textContent = text;
    }

    const detailsEl = document.getElementById('cal-details');
    if (detailsEl) {
      const events = collectMonthEvents(currentYear, currentMonth, calendarService);
      if (events.length === 0) {
        detailsEl.innerHTML = '<p class="text-xs text-gray-400 dark:text-gray-500">No marked events this month</p>';
      } else {
        let dh = '<ul class="space-y-1">';
        for (const ev of events) {
          const d = ev.date.split('-');
          dh += `<li class="text-xs text-gray-600 dark:text-gray-400"><b>${d[2]}.${d[1]}.${d[0]}:</b> ${ev.label}${ev.info.note && ev.info.note !== ev.label ? ` — ${ev.info.note}` : ''}</li>`;
        }
        dh += '</ul>';
        detailsEl.innerHTML = dh;
      }
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
  }

  function prevMonth() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
  }

  function getCurrentMonth() {
    return { year: currentYear, month: currentMonth };
  }

  return { renderCalendar, nextMonth, prevMonth, getCurrentMonth };
}
