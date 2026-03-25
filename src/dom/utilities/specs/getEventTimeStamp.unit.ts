import {describe, expect, it} from 'vitest';

import {getEventTimeStamp} from '../getEventTimeStamp';

describe('getEventTimeStamp', () => {
  it('returns a finite timestamp', () => {
    expect(Number.isFinite(getEventTimeStamp())).toBe(true);
  });
});
