export function createAccessibility() {
  function announce(message) {
    const el = document.getElementById('a11y-announcer');
    if (!el) return;
    el.textContent = '';
    setTimeout(() => { el.textContent = message; }, 50);
  }

  function setupAnnouncer() {
    if (document.getElementById('a11y-announcer')) return;
    const el = document.createElement('div');
    el.id = 'a11y-announcer';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    document.body.appendChild(el);
  }

  function trapFocus(containerEl) {
    const focusable = containerEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    containerEl.addEventListener('keydown', handleKeyDown);
    return () => containerEl.removeEventListener('keydown', handleKeyDown);
  }

  return { announce, setupAnnouncer, trapFocus };
}
