import {describe, expect, it} from 'vitest';

import {itermGraphicsProtocol} from '../writeItermGraphics';

import type {ImageRenderRequest} from '../../types';

const ESC = '\u001B';

function createRequest(overrides: Partial<ImageRenderRequest> = {}): ImageRenderRequest {
  return {
    data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    naturalWidth: 100,
    naturalHeight: 100,
    x: 2,
    y: 1,
    cellWidth: 8,
    cellHeight: 4,
    alt: '',
    ...overrides,
  };
}

describe('itermGraphicsProtocol', () => {
  it('has the correct protocol name', () => {
    expect(itermGraphicsProtocol.name).toBe('iterm2');
  });

  it('produces output starting with cursor positioning', () => {
    const output = itermGraphicsProtocol.render(createRequest());

    expect(output).toContain(`${ESC}[2;3H`);
  });

  it('includes OSC 1337 File command', () => {
    const output = itermGraphicsProtocol.render(createRequest());

    expect(output).toContain(`${ESC}]1337;File=inline=1`);
  });

  it('includes width and height parameters', () => {
    const output = itermGraphicsProtocol.render(createRequest());

    expect(output).toContain('width=8');
    expect(output).toContain('height=4');
  });

  it('encodes image data as base64 after the colon', () => {
    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const expected = Buffer.from(data).toString('base64');
    const output = itermGraphicsProtocol.render(createRequest({data}));

    expect(output).toContain(`:${expected}`);
  });

  it('terminates with BEL', () => {
    const output = itermGraphicsProtocol.render(createRequest());

    expect(output.endsWith('\u0007')).toBe(true);
  });
});
