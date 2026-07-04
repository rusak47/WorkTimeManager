import { DEFAULT_TAGS } from './constants.js';

export function resolveSessionBucket(session) {
  if (session.bucket && DEFAULT_TAGS.includes(session.bucket)) {
    return session.bucket;
  }
  const found = DEFAULT_TAGS.find(t => session.tags && session.tags.includes(t));
  return found || DEFAULT_TAGS[DEFAULT_TAGS.length - 1];
}

export function getSubtagsForBucket(bucket, bucketMap) {
  return bucketMap[bucket] || [];
}

export function getAvailableBuckets(bucketMap) {
  return Object.keys(bucketMap);
}

export function getParentBuckets(tagName, bucketMap) {
  return Object.keys(bucketMap).filter(b => bucketMap[b].includes(tagName));
}

export function getUnassignedTags(tags, bucketMap) {
  const allSubtags = new Set(Object.values(bucketMap).flat());
  const defaults = new Set(DEFAULT_TAGS);
  return tags.filter(t => !allSubtags.has(t) && !defaults.has(t));
}
