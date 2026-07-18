function getISOWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function getISOWeekYear(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  return d.getFullYear();
}

function formatWeek(year, week) {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function parseWeek(weekStr) {
  const [year, w] = weekStr.split('-W');
  return { year: parseInt(year), week: parseInt(w) };
}

function formatMonth(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseMonth(monthStr) {
  const [year, m] = monthStr.split('-');
  return { year: parseInt(year), month: parseInt(m) };
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function sessionsInWeek(session, weekStr) {
  const { year, week } = parseWeek(weekStr);
  const d = new Date(session.startTime);
  return getISOWeekYear(d) === year && getISOWeekNumber(d) === week;
}

function sessionsInMonth(session, monthStr) {
  const { year, month } = parseMonth(monthStr);
  const d = new Date(session.startTime);
  return d.getFullYear() === year && (d.getMonth() + 1) === month;
}

function sessionsInYear(session, yearStr) {
  return new Date(session.startTime).getFullYear() === parseInt(yearStr);
}

function groupByYear(sessions) {
  const result = {};
  for (const session of sessions) {
    const d = new Date(session.startTime);
    const year = String(d.getFullYear());
    const month = MONTH_NAMES[d.getMonth()];
    const date = session.date;
    if (!result[year]) result[year] = {};
    if (!result[year][month]) result[year][month] = {};
    if (!result[year][month][date]) result[year][month][date] = [];
    result[year][month][date].push(session);
  }
  return result;
}

function groupByMonth(sessions) {
  const result = {};
  for (const session of sessions) {
    const d = new Date(session.startTime);
    const weekNum = getISOWeekNumber(d);
    const weekStr = formatWeek(d.getFullYear(), weekNum);
    const date = session.date;
    if (!result[weekStr]) result[weekStr] = {};
    if (!result[weekStr][date]) result[weekStr][date] = [];
    result[weekStr][date].push(session);
  }
  return result;
}

function groupByWeek(sessions) {
  const result = {};
  for (const session of sessions) {
    const date = session.date;
    if (!result[date]) result[date] = [];
    result[date].push(session);
  }
  return result;
}

function getDefaultPeriod(view) {
  const now = new Date();
  if (view === 'year') return String(now.getFullYear());
  if (view === 'month') return formatMonth(now.getFullYear(), now.getMonth() + 1);
  return formatWeek(getISOWeekYear(now), getISOWeekNumber(now));
}

function getPrevPeriod(view, period) {
  if (view === 'year') return String(parseInt(period) - 1);
  if (view === 'month') {
    const { year, month } = parseMonth(period);
    if (month === 1) return formatMonth(year - 1, 12);
    return formatMonth(year, month - 1);
  }
  const { year, week } = parseWeek(period);
  if (week === 1) return formatWeek(year - 1, 52);
  return formatWeek(year, week - 1);
}

function filterByPeriod(sessions, view, period) {
  if (view === 'year') return sessions.filter(s => sessionsInYear(s, period));
  if (view === 'month') return sessions.filter(s => sessionsInMonth(s, period));
  return sessions.filter(s => sessionsInWeek(s, period));
}

function toggleGroup(expanded, id) {
  const next = new Set(expanded);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function isGroupExpanded(expanded, id) {
  return expanded.has(id);
}

function getTotalDuration(sessions) {
  return sessions.reduce((sum, s) => sum + (s.durationSec || 0), 0);
}

export {
  groupByYear,
  groupByMonth,
  groupByWeek,
  getDefaultPeriod,
  getPrevPeriod,
  filterByPeriod,
  toggleGroup,
  isGroupExpanded,
  getTotalDuration,
};
