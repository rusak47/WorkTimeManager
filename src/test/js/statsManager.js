import { appState } from './state.js';
import { dayTypes, chartColors } from './constants.js';
import { formatDuration, getWorkDaysInMonth } from './utils.js';

export const statsManager = {
  timeChart: null,
  distributionChart: null,
  incomeChart: null,

  updateStatistics() {
    const { currentStatsPeriod, sessions } = appState.getState();
    
    if (sessions.length === 0) {
      this.clearCharts();
      return;
    }

    this.updateSummaryStats();
    
    switch (currentStatsPeriod) {
      case 'daily':
        this.updateDailyStats();
        break;
      case 'weekly':
        this.updateWeeklyStats();
        break;
      case 'monthly':
        this.updateMonthlyStats();
        break;
      case 'yearly':
        this.updateYearlyStats();
        break;
    }

    this.updateDistributionChart();
  },

  updateSummaryStats() {
    const { sessions } = appState.getState();
    const totalSec = sessions.reduce((sum, session) => sum + session.durationSec, 0);
    const avgSec = Math.round(totalSec / sessions.length);
    
    appState.updateState({
      summaryStats: {
        totalTime: formatDuration(totalSec),
        sessionsCount: sessions.length,
        avgDuration: formatDuration(avgSec)
      }
    });
  },

  updateDailyStats() {
    const { sessions } = appState.getState();
    const now = new Date();
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date);
      
      const daySessions = sessions.filter(s => s.date === dateStr);
      const dayTotal = daySessions.reduce((sum, s) => sum + s.durationSec, 0);
      
      labels.push(date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
      data.push(dayTotal / 3600);
    }
    
    this.renderTimeChart(labels, data, 'bar');
  },

  // Implement other stat methods (weekly, monthly, yearly)...

  clearCharts() {
    if (this.timeChart) this.timeChart.destroy();
    if (this.distributionChart) this.distributionChart.destroy();
    if (this.incomeChart) this.incomeChart.destroy();
    
    appState.updateState({
      summaryStats: {
        totalTime: '00:00:00',
        sessionsCount: 0,
        avgDuration: '00:00:00'
      }
    });
  }
};