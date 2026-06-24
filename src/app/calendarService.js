const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function parseDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return d;
}

function getDayOfWeek(dateStr) {
  const d = parseDate(dateStr);
  return d ? d.getDay() : null;
}

function isWeekend(dayOfWeek) {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normaliseEntry(entry) {
  const type = entry.type;
  const isMemoriam = entry.is_memoriam === true;

  let dayType;
  let isShortDay = false;

  switch (type) {
    case 'holiday':
      dayType = 'holiday';
      break;
    case 'swapped_day_off':
      dayType = 'holiday';
      break;
    case 'swapped_workday':
      dayType = 'workday';
      break;
    case 'pre_holiday_short':
      dayType = null;
      isShortDay = true;
      break;
    case 'workday':
      dayType = 'workday';
      break;
    case 'weekend':
      dayType = 'weekend';
      break;
    default:
      dayType = null;
  }

  return {
    dayType,
    isMemoriam,
    isShortDay,
    name: entry.name || null,
    localName: entry.local_name || null,
    note: entry.note || null,
    swapSource: entry.swap_source || null,
    observedDate: entry.observed_date || null,
  };
}

function createBaseDayInfo(dateStr, dayOfWeek) {
  const isWknd = isWeekend(dayOfWeek);
  return {
    date: dateStr,
    dayType: isWknd ? 'weekend' : 'workday',
    isHoliday: false,
    isWeekend: isWknd,
    isMemoriam: false,
    isVacation: false,
    isShortDay: false,
    name: null,
    localName: null,
    note: null,
    swapSource: null,
    observedDate: null,
  };
}

export function createCalendarService(rawCalendarData = {}) {
  const overrides = {};

  function buildDayInfo(dateStr) {
    const dow = getDayOfWeek(dateStr);
    if (dow === null) return null;

    const base = createBaseDayInfo(dateStr, dow);
    const entry = rawCalendarData[dateStr];

    if (entry) {
      const norm = normaliseEntry(entry);

      if (norm.dayType) {
        base.dayType = norm.dayType;
      }

      base.isMemoriam = norm.isMemoriam;

      if (norm.isShortDay) {
        base.isShortDay = true;
      }

      if (norm.name) base.name = norm.name;
      if (norm.localName) base.localName = norm.localName;
      if (norm.note) base.note = norm.note;
      if (norm.swapSource) base.swapSource = norm.swapSource;
      if (norm.observedDate) base.observedDate = norm.observedDate;
    }

    base.isHoliday = base.dayType === 'holiday';
    base.isWeekend = base.dayType === 'weekend';

    return base;
  }

  function applyOverrides(info, dateStr) {
    const ov = overrides[dateStr];
    if (!ov) return info;

    const result = { ...info };

    if (ov.dayType !== undefined) {
      result.dayType = ov.dayType;
      result.isHoliday = ov.dayType === 'holiday';
      result.isWeekend = ov.dayType === 'weekend';
    }
    if (ov.isVacation !== undefined) result.isVacation = ov.isVacation;
    if (ov.isMemoriam !== undefined) result.isMemoriam = ov.isMemoriam;
    if (ov.note !== undefined) result.note = ov.note;

    return result;
  }

  function classifyDate(dateStr) {
    return buildDayInfo(dateStr);
  }

  function getDayInfo(dateStr) {
    const info = buildDayInfo(dateStr);
    if (!info) return null;
    return applyOverrides(info, dateStr);
  }

  function classifyWithOverride(dateStr) {
    return getDayInfo(dateStr);
  }

  function getYearCalendar(year) {
    const start = new Date(`${year}-01-01T00:00:00`);
    const end = new Date(`${year}-12-31T00:00:00`);
    const calendar = {};

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
      calendar[dateStr] = getDayInfo(dateStr);
    }

    return calendar;
  }

  function setOverride(dateStr, field, value) {
    if (!overrides[dateStr]) {
      overrides[dateStr] = {};
    }
    overrides[dateStr][field] = value;
  }

  function clearOverride(dateStr) {
    delete overrides[dateStr];
  }

  function getRawCalendar() {
    const result = {};
    for (const [dateStr] of Object.entries(rawCalendarData)) {
      result[dateStr] = buildDayInfo(dateStr);
    }
    return result;
  }

  return {
    classifyDate,
    getDayInfo,
    getYearCalendar,
    setOverride,
    clearOverride,
    getRawCalendar,
    classifyWithOverride,
  };
}
