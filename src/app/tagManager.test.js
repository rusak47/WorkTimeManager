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
});
