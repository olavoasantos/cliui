import {describe, expect, it, vi} from 'vitest';

import {PromiseRejectionEvent} from '../PromiseRejectionEvent';
import {Window} from '../Window';

describe('PromiseRejectionEvent integration', () => {
  it('dispatches through window.onunhandledrejection with promise metadata intact', () => {
    const window = new Window();
    const handler = vi.fn();
    const promise = Promise.resolve('ok');
    window.onunhandledrejection = handler;

    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {promise, reason: 'boom'}),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]![0] as PromiseRejectionEvent;
    expect(event.promise).toBe(promise);
  });
});
