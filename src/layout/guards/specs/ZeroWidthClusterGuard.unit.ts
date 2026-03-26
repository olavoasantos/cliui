import {describe, it} from 'vitest';

import {ZeroWidthClusterGuard} from '../ZeroWidthClusterGuard';

describe('ZeroWidthClusterGuard', () => {
  it.todo('returns true for zero-width joiner');
  it.todo('returns true for variation selectors');
  it.todo('returns true for combining marks');
  it.todo('returns false for printable ASCII');
  it.todo('returns false for CJK ideographs');
  it.todo('returns false for emoji with presentation');
});
