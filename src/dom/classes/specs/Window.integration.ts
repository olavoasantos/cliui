import {describe, expect, it, vi} from 'vitest';

import {ErrorEvent} from '../ErrorEvent';
import {PromiseRejectionEvent} from '../PromiseRejectionEvent';
import {Window} from '../Window';

describe('Window integration', () => {
  it('coordinates document ownership with onerror and onunhandledrejection handlers', () => {
    const window = new Window();
    const onerror = vi.fn();
    const onunhandledrejection = vi.fn();
    const promise = Promise.resolve('ok');
    window.onerror = onerror;
    window.onunhandledrejection = onunhandledrejection;

    window.dispatchEvent(new ErrorEvent('error', {message: 'boom'}));
    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {promise, reason: 'bad'}));

    expect(window.document.defaultView).toBe(window);
    expect(onerror).toHaveBeenCalledTimes(1);
    expect(onunhandledrejection).toHaveBeenCalledTimes(1);
  });
});
