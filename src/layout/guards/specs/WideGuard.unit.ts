import {describe, it} from 'vitest';

import {WideGuard} from '../WideGuard';

describe('WideGuard', () => {
  it.todo('returns true for CJK ideograph code points');
  it.todo('returns true for CJK compatibility ideograph code points');
  it.todo('returns false for ASCII code points');
  it.todo('returns false for fullwidth code points');
  it.todo('uses the fast path range for common CJK characters');
});
