import { describe, it, expect } from 'vitest';
import { DEFAULT_BUCKET_MAP } from './constants.js';

describe('tagManager', () => {
  let tagManager;

  beforeAll(async () => {
    tagManager = await import('./tagManager.js');
  });

  describe('resolveSessionBucket', () => {
    it('returns stored bucket if present', () => {
      expect(tagManager.resolveSessionBucket({ bucket: 'rest', tags: ['sleep'] })).toBe('rest');
    });

    it('infers bucket from tags when no bucket stored', () => {
      expect(tagManager.resolveSessionBucket({ tags: ['work', 'read'] })).toBe('work');
    });

    it('falls back to other when no default tag in session', () => {
      expect(tagManager.resolveSessionBucket({ tags: ['read', 'music'] })).toBe('other');
    });

    it('picks first default tag when multiple found (order: DEFAULT_TAGS)', () => {
      expect(tagManager.resolveSessionBucket({ tags: ['rest', 'study'] })).toBe('rest');
    });

    it('returns other for empty tags', () => {
      expect(tagManager.resolveSessionBucket({ tags: [] })).toBe('other');
    });

    it('returns other when bucket is nullish', () => {
      expect(tagManager.resolveSessionBucket({ bucket: null, tags: ['read'] })).toBe('other');
    });
  });

  describe('getSubtagsForBucket', () => {
    it('returns subtag names for a given bucket', () => {
      const subtags = tagManager.getSubtagsForBucket('rest', DEFAULT_BUCKET_MAP);
      expect(subtags).toEqual(['sleep', 'hygiene', 'tv', 'read', 'write', 'music']);
    });

    it('returns empty array for bucket with no subtags', () => {
      expect(tagManager.getSubtagsForBucket('work', DEFAULT_BUCKET_MAP)).toEqual([]);
    });

    it('returns empty array for unknown bucket', () => {
      expect(tagManager.getSubtagsForBucket('unknown', DEFAULT_BUCKET_MAP)).toEqual([]);
    });
  });

  describe('getAvailableBuckets', () => {
    it('returns bucket names from the map', () => {
      const buckets = tagManager.getAvailableBuckets(DEFAULT_BUCKET_MAP);
      expect(buckets.sort()).toEqual(['work', 'rest', 'study', 'sport', 'other'].sort());
    });
  });

  describe('getParentBuckets', () => {
    it('returns all buckets a subtag belongs to', () => {
      const parents = tagManager.getParentBuckets('read', DEFAULT_BUCKET_MAP);
      expect(parents.sort()).toEqual(['rest', 'study'].sort());
    });

    it('returns empty array for unknown tag', () => {
      expect(tagManager.getParentBuckets('unknown', DEFAULT_BUCKET_MAP)).toEqual([]);
    });
  });

  describe('getUnassignedTags', () => {
    it('returns tags not present in any bucket', () => {
      const tags = ['work', 'read', 'unknown1', 'unknown2'];
      const unassigned = tagManager.getUnassignedTags(tags, DEFAULT_BUCKET_MAP);
      expect(unassigned.sort()).toEqual(['unknown1', 'unknown2'].sort());
    });

    it('returns empty array when all tags in a bucket', () => {
      expect(tagManager.getUnassignedTags(['work', 'rest'], DEFAULT_BUCKET_MAP)).toEqual([]);
    });
  });

  describe('moveSubtagBetweenBuckets', () => {
    it('moves subtag from source to target bucket', () => {
      const map = { work: ['focus'], rest: ['read'], study: ['read'] };
      const result = tagManager.moveSubtagBetweenBuckets('focus', 'work', 'study', map);
      expect(result.work).toEqual([]);
      expect(result.study).toEqual(['read', 'focus']);
    });

    it('is a no-op when tag not in source bucket', () => {
      const map = { work: [], rest: ['read'] };
      const result = tagManager.moveSubtagBetweenBuckets('read', 'work', 'rest', map);
      expect(result).toEqual(map);
    });

    it('is a no-op when source and target are the same', () => {
      const map = { work: ['focus'] };
      const result = tagManager.moveSubtagBetweenBuckets('focus', 'work', 'work', map);
      expect(result).toEqual(map);
    });

    it('returns a new object, does not mutate input', () => {
      const map = { work: ['focus'], rest: [] };
      const result = tagManager.moveSubtagBetweenBuckets('focus', 'work', 'rest', map);
      expect(result).not.toBe(map);
      expect(result.work).not.toBe(map.work);
      expect(result.rest).not.toBe(map.rest);
      expect(map.work).toEqual(['focus']);
    });

    it('handles target bucket that does not exist', () => {
      const map = { work: ['focus'] };
      const result = tagManager.moveSubtagBetweenBuckets('focus', 'work', 'unknown', map);
      expect(result.work).toEqual([]);
      expect(result.unknown).toEqual(['focus']);
    });

    it('handles source bucket that does not exist', () => {
      const map = { work: ['focus'] };
      const result = tagManager.moveSubtagBetweenBuckets('focus', 'unknown', 'work', map);
      expect(result).toEqual(map);
    });
  });

  describe('removeTagFromBucket', () => {
    it('removes subtag from a bucket', () => {
      const map = { work: ['focus', 'deep'], rest: ['read'] };
      const result = tagManager.removeTagFromBucket('focus', 'work', map);
      expect(result.work).toEqual(['deep']);
      expect(result.rest).toEqual(['read']);
    });

    it('is a no-op when tag not in bucket', () => {
      const map = { work: ['focus'] };
      const result = tagManager.removeTagFromBucket('read', 'work', map);
      expect(result).toEqual(map);
    });

    it('is a no-op when bucket does not exist', () => {
      const map = { work: ['focus'] };
      const result = tagManager.removeTagFromBucket('focus', 'unknown', map);
      expect(result).toEqual(map);
    });

    it('returns a new object, does not mutate input', () => {
      const map = { work: ['focus', 'deep'] };
      const result = tagManager.removeTagFromBucket('focus', 'work', map);
      expect(result).not.toBe(map);
      expect(result.work).not.toBe(map.work);
      expect(map.work).toEqual(['focus', 'deep']);
    });
  });
});
