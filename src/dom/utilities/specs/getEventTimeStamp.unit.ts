import {describe, expect, it, vi} from 'vitest';

import {getEventTimeStamp} from '../getEventTimeStamp';

describe('getEventTimeStamp', () => {
  it('returns the native high-resolution timestamp when performance is available', () => {
    const now = vi.fn(() => 123.45);
    vi.stubGlobal('performance', {now});

    expect(getEventTimeStamp()).toBe(123.45);

    vi.unstubAllGlobals();
  });

  it('falls back to Date.now when performance is undefined', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(678);
    vi.stubGlobal('performance', undefined);

    expect(getEventTimeStamp()).toBe(678);

    dateNowSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
