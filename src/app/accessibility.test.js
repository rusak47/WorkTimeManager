// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAccessibility } from './accessibility.js';

describe('createAccessibility', () => {
  let a11y;

  beforeEach(() => {
    document.body.innerHTML = '';
    a11y = createAccessibility();
  });

  it('announce is a no-op when announcer element is missing', () => {
    expect(() => a11y.announce('test')).not.toThrow();
  });

  it('setupAnnouncer creates the announcer element', () => {
    a11y.setupAnnouncer();
    const el = document.getElementById('a11y-announcer');
    expect(el).toBeTruthy();
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.getAttribute('aria-atomic')).toBe('true');
    expect(el.className).toBe('sr-only');
  });

  it('setupAnnouncer does not create duplicate elements', () => {
    a11y.setupAnnouncer();
    a11y.setupAnnouncer();
    const elements = document.querySelectorAll('#a11y-announcer');
    expect(elements.length).toBe(1);
  });

  it('announce sets text content after timeout', () => {
    vi.useFakeTimers();
    a11y.setupAnnouncer();
    a11y.announce('Hello world');
    const el = document.getElementById('a11y-announcer');
    expect(el.textContent).toBe('');
    vi.advanceTimersByTime(50);
    expect(el.textContent).toBe('Hello world');
    vi.useRealTimers();
  });

  it('trapFocus returns a cleanup function', () => {
    const container = document.createElement('div');
    const cleanup = a11y.trapFocus(container);
    expect(cleanup).toBeTypeOf('function');
  });

  function createTrapContainer() {
    const container = document.createElement('div');
    container.innerHTML = '<button id="b1">First</button><button id="b2">Last</button>';
    document.body.appendChild(container);
    return container;
  }

  it('trapFocus wraps focus from last to first on Tab', () => {
    const container = createTrapContainer();
    const btn1 = container.querySelector('#b1');
    const btn2 = container.querySelector('#b2');
    btn2.focus();
    a11y.trapFocus(container);
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    container.dispatchEvent(event);
    expect(document.activeElement).toBe(btn1);
  });

  it('trapFocus wraps focus from first to last on Shift+Tab', () => {
    const container = createTrapContainer();
    const btn1 = container.querySelector('#b1');
    const btn2 = container.querySelector('#b2');
    btn1.focus();
    a11y.trapFocus(container);
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    container.dispatchEvent(event);
    expect(document.activeElement).toBe(btn2);
  });

  it('trapFocus cleanup removes event listener', () => {
    const container = createTrapContainer();
    const btn1 = container.querySelector('#b1');
    const cleanup = a11y.trapFocus(container);
    cleanup();
    document.body.appendChild(container);
    btn1.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    container.dispatchEvent(event);
    expect(document.activeElement).toBe(btn1);
  });

  it('returns all expected methods', () => {
    expect(a11y.announce).toBeTypeOf('function');
    expect(a11y.setupAnnouncer).toBeTypeOf('function');
    expect(a11y.trapFocus).toBeTypeOf('function');
  });
});
