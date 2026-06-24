// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './state.js';

describe('createStore', () => {
  const initialState = { count: 0, user: null, sessions: [] };

  it('returns getState with initial state', () => {
    const store = createStore(initialState);
    expect(store.getState()).toEqual(initialState);
  });

  it('getState returns a copy, not a reference', () => {
    const store = createStore(initialState);
    const state = store.getState();
    state.count = 99;
    expect(store.getState().count).toBe(0);
  });

  it('setState merges partial state', () => {
    const store = createStore(initialState);
    store.setState({ count: 5 });
    expect(store.getState().count).toBe(5);
    expect(store.getState().user).toBeNull();
  });

  it('setState notifies subscribers', () => {
    const store = createStore(initialState);
    let notified = 0;
    store.subscribe(() => notified++);
    store.setState({ count: 1 });
    expect(notified).toBe(1);
  });

  it('setState passes full new state to subscribers', () => {
    const store = createStore(initialState);
    let received;
    store.subscribe((state) => { received = state; });
    store.setState({ count: 42 });
    expect(received.count).toBe(42);
  });

  it('subscribe returns an unsubscribe function', () => {
    const store = createStore(initialState);
    let notified = 0;
    const unsub = store.subscribe(() => notified++);
    unsub();
    store.setState({ count: 1 });
    expect(notified).toBe(0);
  });

  it('supports multiple subscribers', () => {
    const store = createStore(initialState);
    let a = 0, b = 0;
    store.subscribe(() => a++);
    store.subscribe(() => b++);
    store.setState({ count: 1 });
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it('reset restores initial state and notifies', () => {
    const store = createStore(initialState);
    let notified = 0;
    store.subscribe(() => notified++);
    store.setState({ count: 99, user: { name: 'test' } });
    store.reset();
    expect(store.getState()).toEqual(initialState);
    expect(notified).toBe(2);
  });

  it('does not notify if state is unchanged (same reference check)', () => {
    const store = createStore(initialState);
    let notified = 0;
    store.subscribe(() => notified++);
    store.setState({});
    expect(notified).toBe(0);
  });
});
