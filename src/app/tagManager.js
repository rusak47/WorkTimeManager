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

export function moveSubtagBetweenBuckets(tagName, sourceBucket, targetBucket, bucketMap) {
  if (sourceBucket === targetBucket) return bucketMap;
  if (!bucketMap[sourceBucket] || !bucketMap[sourceBucket].includes(tagName)) return bucketMap;

  const newMap = {};
  for (const [bucket, subtags] of Object.entries(bucketMap)) {
    newMap[bucket] = [...subtags];
  }

  newMap[sourceBucket] = newMap[sourceBucket].filter(t => t !== tagName);

  if (newMap[targetBucket]) {
    newMap[targetBucket] = [...newMap[targetBucket], tagName];
  } else {
    newMap[targetBucket] = [tagName];
  }

  return newMap;
}

export function removeTagFromBucket(tagName, bucketName, bucketMap) {
  if (!bucketMap[bucketName] || !bucketMap[bucketName].includes(tagName)) return bucketMap;

  const newMap = {};
  for (const [bucket, subtags] of Object.entries(bucketMap)) {
    newMap[bucket] = bucket === bucketName
      ? subtags.filter(t => t !== tagName)
      : [...subtags];
  }

  return newMap;
}
