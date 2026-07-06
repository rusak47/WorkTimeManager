export function migrateSessionTags(sessions) {
  return sessions.map(s => {
    if (!s.notes || !s.notes.includes('#')) return s;
    const tags = [...(s.tags || ['work'])];
    const found = [];
    let match;
    const re = /#(\w+)/g;
    while ((match = re.exec(s.notes)) !== null) {
      if (!tags.includes(match[1])) tags.push(match[1]);
      if (!found.includes(match[1])) found.push(match[1]);
    }
    if (found.length === 0) return s;
    const cleanRe = new RegExp(`#(${found.join('|')})\\b`, 'g');
    const notes = s.notes.replace(cleanRe, '').replace(/\s{2,}/g, ' ').trim();
    return { ...s, tags, notes };
  });
}
