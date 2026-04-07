import {describe, expect, it} from 'vitest';

import {fallbackGraphicsProtocol} from '../writeImageFallback';

import type {ImageRenderRequest} from '../../types';

const ESC = '\u001B';

function createRequest(overrides: Partial<ImageRenderRequest> = {}): ImageRenderRequest {
  return {
    data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    naturalWidth: 100,
    naturalHeight: 100,
    x: 0,
    y: 0,
    cellWidth: 10,
    cellHeight: 3,
    alt: '',
    ...overrides,
  };
}

describe('fallbackGraphicsProtocol', () => {
  it('has the correct protocol name', () => {
    expect(fallbackGraphicsProtocol.name).toBe('fallback');
  });

  it('fills region with placeholder characters when no alt text', () => {
    const output = fallbackGraphicsProtocol.render(createRequest());

    expect(output).toContain('░░░░░░░░░░');
    // Should have 3 rows of output
    const cursorMoves = output.split(`${ESC}[`).length - 1;
    expect(cursorMoves).toBe(3);
  });

  it('renders alt text on the first row', () => {
    const output = fallbackGraphicsProtocol.render(createRequest({alt: 'Logo'}));

    expect(output).toContain('Logo');
    expect(output).not.toContain('░');
  });

  it('truncates alt text that exceeds cell width', () => {
    const output = fallbackGraphicsProtocol.render(
      createRequest({alt: 'A very long description', cellWidth: 10}),
    );

    expect(output).toContain('A very lo…');
  });

  it('positions cursor at the correct location', () => {
    const output = fallbackGraphicsProtocol.render(createRequest({x: 5, y: 3}));

    expect(output).toContain(`${ESC}[4;6H`);
  });
});
