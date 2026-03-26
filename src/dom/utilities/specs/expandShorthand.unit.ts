import {describe, it} from 'vitest';

import {expandShorthand} from '../expandShorthand';

describe('expandShorthand', () => {
  describe('padding', () => {
    it.todo('expands 1 value to all four sides');
    it.todo('expands 2 values to vertical and horizontal');
    it.todo('expands 3 values to top, horizontal, and bottom');
    it.todo('expands 4 values to top, right, bottom, left');
  });

  describe('margin', () => {
    it.todo('expands 1 value to all four sides');
    it.todo('expands 2 values to vertical and horizontal');
    it.todo('expands 3 values to top, horizontal, and bottom');
    it.todo('expands 4 values to top, right, bottom, left');
  });

  describe('gap', () => {
    it.todo('expands 1 value to row-gap and column-gap');
    it.todo('expands 2 values to row-gap and column-gap');
  });

  describe('flex', () => {
    it.todo('expands none to grow 0, shrink 0, basis auto');
    it.todo('expands auto to grow 1, shrink 1, basis auto');
    it.todo('expands a single numeric value to grow, shrink 1, basis 0');
    it.todo('expands 2 values to grow and shrink with basis 0');
    it.todo('expands 3 values to grow, shrink, and basis');
    it.todo('returns null for 4 or more values');
  });

  describe('edge cases', () => {
    it.todo('returns null for unrecognized properties');
    it.todo('handles values with extra whitespace');
  });
});
