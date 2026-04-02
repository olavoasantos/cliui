import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('HTMLHeadElement integration', () => {
  it('hosts metadata and style elements in document order', () => {
    const document = new Window().document;
    const meta = document.createElement('meta');
    const style = document.createElement('style');

    document.head.append(meta, style);

    expect(document.head.firstChild).toBe(meta);
    expect(document.head.lastChild).toBe(style);
  });
});
