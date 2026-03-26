import {describe, expect, it, vi} from 'vitest';

import {EventPhase} from '../../constants';
import {Event} from '../../classes/Event';
import {Window} from '../../classes/Window';
import {fireEvent} from '../fireEvent';

describe('fireEvent', () => {
  it('does nothing when the target has no listeners', () => {
    const window = new Window();
    const target = window.document.createElement('div');
    const event = new Event('click');
    event.target = target;

    expect(() => fireEvent(event, target, EventPhase.BUBBLING_PHASE)).not.toThrow();
  });

  it('does nothing when there are no listeners for the event type', () => {
    const window = new Window();
    const target = window.document.createElement('div');
    const handler = vi.fn();
    const event = new Event('click');
    event.target = target;
    target.addEventListener('focus', handler);

    fireEvent(event, target, EventPhase.BUBBLING_PHASE);

    expect(handler).not.toHaveBeenCalled();
  });

  it('calls function listeners with currentTarget as this', () => {
    const window = new Window();
    const target = window.document.createElement('div');
    const receivedThis: unknown[] = [];
    const event = new Event('click');
    event.target = target;

    target.addEventListener('click', function listener() {
      receivedThis.push(this);
    });

    fireEvent(event, target, EventPhase.BUBBLING_PHASE);

    expect(receivedThis).toEqual([target]);
  });

  it('calls object listeners via handleEvent method', () => {
    const window = new Window();
    const target = window.document.createElement('div');
    const handleEvent = vi.fn();
    const event = new Event('click');
    event.target = target;
    target.addEventListener('click', {handleEvent});

    fireEvent(event, target, EventPhase.BUBBLING_PHASE);

    expect(handleEvent).toHaveBeenCalledWith(event);
  });

  it('sets eventPhase to AT_TARGET when target equals currentTarget', () => {
    const window = new Window();
    const target = window.document.createElement('div');
    const phases: number[] = [];
    const event = new Event('click');
    event.target = target;
    target.addEventListener('click', () => {
      phases.push(event.eventPhase);
    });

    fireEvent(event, target, EventPhase.BUBBLING_PHASE);

    expect(phases).toEqual([EventPhase.AT_TARGET]);
  });

  it('sets eventPhase to the provided phase when target differs', () => {
    const window = new Window();
    const target = window.document.createElement('div');
    const currentTarget = window.document.createElement('section');
    const phases: number[] = [];
    const event = new Event('click');
    event.target = target;
    currentTarget.addEventListener(
      'click',
      () => {
        phases.push(event.eventPhase);
      },
      true,
    );

    fireEvent(event, currentTarget, EventPhase.CAPTURING_PHASE);

    expect(phases).toEqual([EventPhase.CAPTURING_PHASE]);
  });

  it('sets currentTarget on the event for each listener invocation', () => {
    const window = new Window();
    const target = window.document.createElement('div');
    const currentTargets: unknown[] = [];
    const event = new Event('click');
    event.target = target;
    target.addEventListener('click', () => {
      currentTargets.push(event.currentTarget);
    });
    target.addEventListener('click', () => {
      currentTargets.push(event.currentTarget);
    });

    fireEvent(event, target, EventPhase.BUBBLING_PHASE);

    expect(currentTargets).toEqual([target, target]);
  });

  it('invokes capture-phase listeners with the capture marker', () => {
    const window = new Window();
    const target = window.document.createElement('div');
    const handler = vi.fn();
    const event = new Event('click');
    event.target = target;
    target.addEventListener('click', handler, true);

    fireEvent(event, target, EventPhase.CAPTURING_PHASE);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('stops invoking further listeners when stopImmediatePropagation is called', () => {
    const window = new Window();
    const target = window.document.createElement('div');
    const first = vi.fn(() => {
      event.stopImmediatePropagation();
    });
    const second = vi.fn();
    const event = new Event('click');
    event.target = target;
    target.addEventListener('click', first);
    target.addEventListener('click', second);

    fireEvent(event, target, EventPhase.BUBBLING_PHASE);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('rethrows listener errors asynchronously without stopping other listeners', () => {
    const window = new Window();
    const target = window.document.createElement('div');
    const error = new Error('boom');
    const second = vi.fn();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(() => 0 as never);
    const event = new Event('click');
    event.target = target;
    target.addEventListener('click', () => {
      throw error;
    });
    target.addEventListener('click', second);

    fireEvent(event, target, EventPhase.BUBBLING_PHASE);

    expect(second).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0, error);

    setTimeoutSpy.mockRestore();
  });
});
