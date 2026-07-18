import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTime, formatDuration, formatDate, parseDuration, formatDateTimeLocal, getDayTypeBadgeClass } from './utils.js';

describe('formatTime', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns locale time string for a date', () => {
        vi.setSystemTime(new Date(2026, 0, 15, 14, 30, 45));
        const result = formatTime(new Date());
        expect(result).toMatch(/\d{1,2}:\d{2}(:\d{2})?/);
    });
});

describe('formatDuration', () => {
    it('formats zero seconds as 00:00:00', () => {
        expect(formatDuration(0)).toBe('00:00:00');
    });

    it('formats seconds only', () => {
        expect(formatDuration(45)).toBe('00:00:45');
    });

    it('formats minutes and seconds', () => {
        expect(formatDuration(125)).toBe('00:02:05');
    });

    it('formats hours, minutes, and seconds', () => {
        expect(formatDuration(3661)).toBe('01:01:01');
    });

    it('formats large durations', () => {
        expect(formatDuration(36000)).toBe('10:00:00');
    });

    it('pads single digits with zeros', () => {
        expect(formatDuration(3661)).toBe('01:01:01');
    });
});

describe('formatDate', () => {
    it('formats date as YYYY-MM-DD', () => {
        const date = new Date(2026, 0, 15);
        expect(formatDate(date)).toBe('2026-01-15');
    });

    it('pads month and day with zeros', () => {
        const date = new Date(2026, 2, 5);
        expect(formatDate(date)).toBe('2026-03-05');
    });

    it('handles year boundaries', () => {
        const date = new Date(2025, 11, 31);
        expect(formatDate(date)).toBe('2025-12-31');
    });
});

describe('parseDuration', () => {
    it('parses 00:00:00 to 0', () => {
        expect(parseDuration('00:00:00')).toBe(0);
    });

    it('parses hours only', () => {
        expect(parseDuration('01:00:00')).toBe(3600);
    });

    it('parses minutes only', () => {
        expect(parseDuration('00:05:00')).toBe(300);
    });

    it('parses seconds only', () => {
        expect(parseDuration('00:00:30')).toBe(30);
    });

    it('parses full duration', () => {
        expect(parseDuration('02:30:15')).toBe(9015);
    });

    it('is inverse of formatDuration', () => {
        const seconds = 7384;
        expect(parseDuration(formatDuration(seconds))).toBe(seconds);
    });
});

describe('formatDateTimeLocal', () => {
    it('formats date for datetime-local input', () => {
        const date = new Date(2026, 0, 15, 14, 30);
        expect(formatDateTimeLocal(date)).toBe('2026-01-15T14:30');
    });

    it('pads single digits', () => {
        const date = new Date(2026, 2, 5, 9, 5);
        expect(formatDateTimeLocal(date)).toBe('2026-03-05T09:05');
    });

    it('ignores seconds', () => {
        const date = new Date(2026, 0, 15, 14, 30, 45);
        expect(formatDateTimeLocal(date)).toBe('2026-01-15T14:30');
    });
});

describe('getDayTypeBadgeClass', () => {
    it('returns red classes for Weekend', () => {
        const result = getDayTypeBadgeClass('Weekend');
        expect(result).toContain('red');
    });

    it('returns green classes for Holiday', () => {
        const result = getDayTypeBadgeClass('Holiday');
        expect(result).toContain('green');
    });

    it('returns purple classes for Vacation', () => {
        const result = getDayTypeBadgeClass('Vacation');
        expect(result).toContain('purple');
    });

    it('returns blue classes for default/unknown', () => {
        const result = getDayTypeBadgeClass('Workday');
        expect(result).toContain('blue');
    });

    it('returns blue classes for empty string', () => {
        const result = getDayTypeBadgeClass('');
        expect(result).toContain('blue');
    });
});
