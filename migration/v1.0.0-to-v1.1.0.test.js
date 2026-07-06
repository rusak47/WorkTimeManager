import { describe, it, expect } from 'vitest';
import { migrateSessionTags } from './v1.0.0-to-v1.1.0.js';

describe('migrateSessionTags', () => {
  it('extracts #hashtags from notes into tags as child tags', () => {
    const sessions = [
      { notes: 'Worked on #design and #review', tags: ['work'], durationSec: 3600 },
    ];
    const result = migrateSessionTags(sessions);
    expect(result[0].tags).toEqual(['work', 'design', 'review']);
    expect(result[0].notes).toBe('Worked on and');
  });

  it('leaves sessions without # in notes unchanged', () => {
    const sessions = [
      { notes: 'Morning standup', tags: ['work'], durationSec: 1800 },
    ];
    const result = migrateSessionTags(sessions);
    expect(result[0]).toBe(sessions[0]);
  });

  it('deduplicates tags already in both notes and tags array', () => {
    const sessions = [
      { notes: '#work coding', tags: ['work', 'coding'], durationSec: 600 },
    ];
    const result = migrateSessionTags(sessions);
    expect(result[0].tags).toEqual(['work', 'coding']);
    expect(result[0].notes).toBe('coding');
  });

  it('defaults missing tags array to [work] and extracts children', () => {
    const sessions = [
      { notes: '#design', durationSec: 3600 },
    ];
    const result = migrateSessionTags(sessions);
    expect(result[0].tags).toEqual(['work', 'design']);
    expect(result[0].notes).toBe('');
  });

  it('handles session with no notes field', () => {
    const sessions = [
      { tags: ['work'], durationSec: 3600 },
    ];
    const result = migrateSessionTags(sessions);
    expect(result[0]).toBe(sessions[0]);
  });

  it('handles session with notes that only has # without word chars', () => {
    const sessions = [
      { notes: 'Just a # symbol', tags: ['work'], durationSec: 3600 },
    ];
    const result = migrateSessionTags(sessions);
    expect(result[0].tags).toEqual(['work']);
  });
});
