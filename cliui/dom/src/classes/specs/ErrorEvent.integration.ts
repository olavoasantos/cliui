import {describe, expect, it, vi} from 'vitest';

import {ErrorEvent} from '../ErrorEvent';
import {Window} from '../Window';

describe('ErrorEvent integration', () => {
  it('flows through window.onerror with structured event fields', () => {
    const window = new Window();
    const handler = vi.fn();
    window.onerror = handler;

    window.dispatchEvent(
      new ErrorEvent('error', {message: 'boom', filename: 'app.ts', lineno: 4, colno: 2}),
    );

    expect(handler).toHaveBeenCalledWith('boom', 'app.ts', 4, 2, undefined);
  });
});
