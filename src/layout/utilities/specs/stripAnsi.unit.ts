import {describe, expect, it} from 'vitest';

import {stripAnsi} from '../stripAnsi';

describe('stripAnsi', () => {
  it('removes ANSI control sequences', () => {
    expect(stripAnsi('\u001B[31mred\u001B[0m')).toBe('red');
  });
});
