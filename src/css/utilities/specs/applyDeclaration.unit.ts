import {describe, expect, it} from 'vitest';

import {applyDeclaration} from '../applyDeclaration';

describe('applyDeclaration', () => {
  it('sets simple declarations directly', () => {
    const style = new Map<string, string>();

    applyDeclaration(style, 'color', 'red');

    expect(style.get('color')).toBe('red');
  });

  it('expands shorthand declarations', () => {
    const style = new Map<string, string>();

    applyDeclaration(style, 'padding', '1 2');

    expect(style.get('padding-top')).toBe('1');
    expect(style.get('padding-right')).toBe('2');
  });
});
