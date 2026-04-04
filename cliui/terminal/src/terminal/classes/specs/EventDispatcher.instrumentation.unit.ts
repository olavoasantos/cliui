import {describe, it, expect, vi, beforeEach} from 'vitest';
import {Performance, Window} from '@cliui/dom';
import {EventDispatcher} from '../EventDispatcher';

import type {TerminalInputEvent} from '../../types';

describe('EventDispatcher input instrumentation', () => {
  let win: Window;
  let perf: Performance;
  let dispatcher: EventDispatcher;

  beforeEach(() => {
    win = new Window();
    perf = win.performance;
    dispatcher = new EventDispatcher(win.document);
    dispatcher.setPerformance(perf);
  });

  function keyEvent(key = 'a'): TerminalInputEvent {
    return {
      type: 'key',
      key,
      code: `Key${key.toUpperCase()}`,
      ctrl: false,
      alt: false,
      shift: false,
    };
  }

  function mouseEvent(): TerminalInputEvent {
    return {
      type: 'mouse',
      eventType: 'press',
      button: 'left',
      column: 0,
      row: 0,
      ctrl: false,
      alt: false,
      shift: false,
    };
  }

  it('creates pending event timings for key events', () => {
    const inputTimestamp = perf.now();
    dispatcher.dispatchTimed(keyEvent(), inputTimestamp);

    const pending = dispatcher.takePendingTimings();
    expect(pending).toHaveLength(2); // event + first-input
    expect(pending[0]!.options.name).toBe('keydown');
    expect(pending[0]!.options.entryType).toBe('event');
    expect(pending[0]!.options.startTime).toBe(inputTimestamp);
    expect(pending[0]!.options.processingStart).toBeGreaterThanOrEqual(inputTimestamp);
    expect(pending[0]!.options.processingEnd).toBeGreaterThanOrEqual(
      pending[0]!.options.processingStart,
    );
  });

  it('records first-input on the first dispatched interaction', () => {
    dispatcher.dispatchTimed(keyEvent(), perf.now());
    const pending = dispatcher.takePendingTimings();

    const firstInput = pending.find((p) => p.options.entryType === 'first-input');
    expect(firstInput).toBeDefined();
    expect(firstInput!.isFirstInput).toBe(true);
  });

  it('does not record first-input on subsequent interactions', () => {
    dispatcher.dispatchTimed(keyEvent(), perf.now());
    dispatcher.takePendingTimings();

    dispatcher.dispatchTimed(keyEvent('b'), perf.now());
    const pending = dispatcher.takePendingTimings();

    expect(pending).toHaveLength(1); // only 'event', no 'first-input'
    expect(pending[0]!.options.entryType).toBe('event');
  });

  it('assigns unique interactionId per dispatch', () => {
    dispatcher.dispatchTimed(keyEvent(), perf.now());
    dispatcher.dispatchTimed(keyEvent('b'), perf.now());

    const pending = dispatcher.takePendingTimings();
    const eventEntries = pending.filter((p) => p.options.entryType === 'event');
    expect(eventEntries[0]!.options.interactionId).not.toBe(eventEntries[1]!.options.interactionId);
  });

  it('records mouse event names correctly', () => {
    dispatcher.dispatchTimed(mouseEvent(), perf.now());
    const pending = dispatcher.takePendingTimings();
    const event = pending.find((p) => p.options.entryType === 'event');
    expect(event!.options.name).toBe('mousedown');
  });

  it('does not produce timing entries for focus events', () => {
    const focusEvent: TerminalInputEvent = {type: 'focus', focus: 'in'};
    dispatcher.dispatchTimed(focusEvent, perf.now());
    const pending = dispatcher.takePendingTimings();
    expect(pending).toHaveLength(0);
  });

  it('clears pending timings after takePendingTimings()', () => {
    dispatcher.dispatchTimed(keyEvent(), perf.now());
    dispatcher.takePendingTimings();

    const second = dispatcher.takePendingTimings();
    expect(second).toHaveLength(0);
  });

  it('sets duration to 0 (pending frame finalization)', () => {
    dispatcher.dispatchTimed(keyEvent(), perf.now());
    const pending = dispatcher.takePendingTimings();
    expect(pending[0]!.options.duration).toBe(0);
  });

  it('dispatches normally when performance is not set', () => {
    const plainDispatcher = new EventDispatcher(win.document);
    const handler = vi.fn();
    win.document.body.addEventListener('keydown', handler);

    plainDispatcher.dispatchTimed(keyEvent(), 0);
    expect(handler).toHaveBeenCalledTimes(1);

    const pending = plainDispatcher.takePendingTimings();
    expect(pending).toHaveLength(0);
  });

  it('shares interactionId between event and first-input entries', () => {
    dispatcher.dispatchTimed(keyEvent(), perf.now());
    const pending = dispatcher.takePendingTimings();

    const eventEntry = pending.find((p) => p.options.entryType === 'event')!;
    const firstInput = pending.find((p) => p.options.entryType === 'first-input')!;
    expect(eventEntry.options.interactionId).toBe(firstInput.options.interactionId);
  });
});
