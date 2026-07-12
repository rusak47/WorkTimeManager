import * as utils from '../js/utils.js';
import { SECONDS_PER_HOUR, DEFAULT_TAGS } from './constants.js';

function resolveSessionBucket(session) {
  if (session.bucket && DEFAULT_TAGS.includes(session.bucket)) {
    return session.bucket;
  }
  const found = DEFAULT_TAGS.find(t => session.tags && session.tags.includes(t));
  return found || DEFAULT_TAGS[DEFAULT_TAGS.length - 1];
}

function getSessionDateObj(s) {
  if (s.date) return new Date(s.date + 'T12:00:00');
  if (s.startTime) return new Date(s.startTime);
  return new Date(NaN);
}

function sessionInMonth(s, year, month) {
  const d = getSessionDateObj(s);
  return d.getFullYear() === year && d.getMonth() === month;
}

export function createStatsManager(store) {
  function getSessions() {
    return store.getState().sessions || [];
  }

  function getMarkedDays() {
    return store.getState().markedDays || [];
  }

  function getConfig() {
    const configs = store.getState().configs || [];
    return configs.length > 0 ? configs[0] : null;
  }

  function filterByTag(sessions, tags) {
    if (!tags || tags.length === 0) return sessions;
    return sessions.filter((s) => tags.some((t) => (s.tags || []).includes(t)));
  }

  return {
    computeTodayTotal(dateStr) {
      const sessions = getSessions().filter((s) => s.date === dateStr);
      const totalSec = sessions.reduce((sum, s) => sum + (s.durationSec || 0), 0);
      return { totalSec, formatted: utils.formatDuration(totalSec) };
    },

    computePeriodStats(period, referenceDate = new Date(), opts = {}) {
      const allSessions = opts.tags
        ? filterByTag(getSessions(), opts.tags)
        : getSessions();
      const dayOffset = opts.weekStartDay !== undefined ? opts.weekStartDay : 1;
      const now = referenceDate;
      const labels = [];
      const data = [];
      let totalSec = 0;

      if (period === 'daily') {
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = utils.formatDate(date);
          const daySessions = allSessions.filter((s) => s.date === dateStr);
          const dayTotal = daySessions.reduce((sum, s) => sum + (s.durationSec || 0), 0);
          labels.push(
            date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
          );
          data.push(+(dayTotal / SECONDS_PER_HOUR).toFixed(2));
          totalSec += dayTotal;
        }
      } else if (period === 'weekly') {
        for (let i = 7; i >= 0; i--) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - (7 * i));
          weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() - dayOffset + 7) % 7));
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const weekSessions = allSessions.filter((s) => {
            const sd = getSessionDateObj(s);
            return sd >= weekStart && sd <= weekEnd;
          });
          const weekTotal = weekSessions.reduce((sum, s) => sum + (s.durationSec || 0), 0);
          labels.push(i === 0 ? 'This' : i === 1 ? 'Last' : `Week ${i}`);
          data.push(+(weekTotal / SECONDS_PER_HOUR).toFixed(2));
          totalSec += weekTotal;
        }
      } else if (period === 'monthly') {
        for (let i = 5; i >= 0; i--) {
          const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthSessions = allSessions.filter((s) =>
            sessionInMonth(s, month.getFullYear(), month.getMonth())
          );
          const monthTotal = monthSessions.reduce((sum, s) => sum + (s.durationSec || 0), 0);
          labels.push(month.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }));
          data.push(+(monthTotal / SECONDS_PER_HOUR).toFixed(2));
          totalSec += monthTotal;
        }
      } else if (period === 'yearly') {
        const year = now.getFullYear();
        for (let i = 0; i < 12; i++) {
          const monthSessions = allSessions.filter((s) => sessionInMonth(s, year, i));
          const monthTotal = monthSessions.reduce((sum, s) => sum + (s.durationSec || 0), 0);
          labels.push(new Date(year, i, 1).toLocaleDateString(undefined, { month: 'short' }));
          data.push(+(monthTotal / SECONDS_PER_HOUR).toFixed(2));
          totalSec += monthTotal;
        }
      }

      return { labels, data, totalSec };
    },

    computeYearlyTable(year) {
      const sessions = getSessions();
      const markedDays = getMarkedDays();
      const config = getConfig();
      const expectedDailyHours = config ? config.workingHours : 8;
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];

      return months.map((name, i) => {
        const monthSessions = sessions.filter((s) => sessionInMonth(s, year, i));

        const uniqueDates = [...new Set(monthSessions.map((s) => s.date))];
        const totalHours = monthSessions.reduce((sum, s) => sum + (s.durationSec || 0), 0) / SECONDS_PER_HOUR;

        const workDays = uniqueDates.filter((date) => {
          const marked = markedDays.find((d) => d.date === date);
          if (marked) return marked.dayType === 'Workday';
          const dateObj = new Date(date + 'T12:00:00');
          return dateObj.getDay() !== 0 && dateObj.getDay() !== 6;
        });

        const avgHoursPerDay = workDays.length > 0 ? +(totalHours / workDays.length).toFixed(1) : 0;

        let daysOverExpected = 0;
        uniqueDates.forEach((date) => {
          const dateTotal = monthSessions
            .filter((s) => s.date === date)
            .reduce((sum, s) => sum + (s.durationSec || 0), 0) / SECONDS_PER_HOUR;
          if (dateTotal > expectedDailyHours) daysOverExpected++;
        });

        const percentOverExpected = uniqueDates.length > 0
          ? Math.round((daysOverExpected / uniqueDates.length) * 100)
          : 0;

        const holidays = markedDays.filter(
          (d) => d.dayType === 'Holiday' && new Date(d.date).getFullYear() === year && new Date(d.date).getMonth() === i
        ).length;

        const vacations = markedDays.filter(
          (d) => d.dayType === 'Vacation' && new Date(d.date).getFullYear() === year && new Date(d.date).getMonth() === i
        ).length;

        return {
          month: name,
          totalHours: +totalHours.toFixed(1),
          workDays: workDays.length,
          avgHoursPerDay,
          percentOverExpected,
          holidays,
          vacations,
        };
      });
    },

    _applyIncomeMultiplier(totalHours, isHourly, salaryValue, taxRate, isNet, workDaysInMonth) {
      let income = 0;
      if (isHourly) {
        income = totalHours * salaryValue;
      } else {
        income = workDaysInMonth > 0 ? (1 / workDaysInMonth) * salaryValue : 0;
      }

      if (!isNet) {
        income = income / (1 - taxRate);
      }

      return income;
    },

    computeIncome(year) {
      const config = getConfig();
      if (!config || !config.salaryValue) return Array(12).fill(0);

      const sessions = getSessions();
      const isHourly = config.salaryType === 'hourly';
      const isNet = config.salaryTaxType === 'net';
      const salaryValue = config.salaryValue;
      const taxRate = (config.salaryTax || 0) / 100;

      return Array.from({ length: 12 }, (_, i) => {
        const monthSessions = sessions.filter((s) => sessionInMonth(s, year, i));

        const totalHours = monthSessions.reduce((sum, s) => sum + (s.durationSec || 0), 0) / SECONDS_PER_HOUR;

        const workDaysInMonth = isHourly ? 0 : this.getWorkDaysInMonth(year, i);
        const income = this._applyIncomeMultiplier(totalHours, isHourly, salaryValue, taxRate, isNet, workDaysInMonth);

        return +income.toFixed(2);
      });
    },

    getWorkDaysInMonth(year, month) {
      let count = 0;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        if (date.getDay() !== 0 && date.getDay() !== 6) count++;
      }
      return count;
    },

    computeBucketStats(sessions) {
      const buckets = {};
      for (const key of DEFAULT_TAGS) {
        buckets[key] = { totalSec: 0, subtags: {} };
      }

      for (const session of sessions) {
        const bucketName = resolveSessionBucket(session);
        const dur = session.durationSec || 0;
        buckets[bucketName].totalSec += dur;

        if (session.tags) {
          for (const tag of session.tags) {
            if (!DEFAULT_TAGS.includes(tag)) {
              buckets[bucketName].subtags[tag] = (buckets[bucketName].subtags[tag] || 0) + dur;
            }
          }
        }
      }

      return buckets;
    },
  };
}
