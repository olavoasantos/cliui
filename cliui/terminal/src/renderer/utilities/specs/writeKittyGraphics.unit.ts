import {describe, expect, it} from 'vitest';

import {kittyGraphicsProtocol} from '../writeKittyGraphics';

import type {ImageRenderRequest} from '../../types/ImageRenderRequest';

const ESC = '\u001B';

function createRequest(overrides: Partial<ImageRenderRequest> = {}): ImageRenderRequest {
  return {
    data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    naturalWidth: 100,
    naturalHeight: 100,
    x: 5,
    y: 3,
    cellWidth: 10,
    cellHeight: 5,
    alt: '',
    ...overrides,
  };
}

describe('kittyGraphicsProtocol', () => {
  it('has the correct protocol name', () => {
    expect(kittyGraphicsProtocol.name).toBe('kitty');
  });

  it('produces output starting with cursor positioning', () => {
    const output = kittyGraphicsProtocol.render(createRequest());

    expect(output).toContain(`${ESC}[4;6H`);
  });

  it('includes APC graphics command with metadata', () => {
    const output = kittyGraphicsProtocol.render(createRequest());

    expect(output).toContain(`${ESC}_G`);
    expect(output).toContain('a=T');
    expect(output).toContain('f=100');
    expect(output).toContain('t=d');
    expect(output).toContain('c=10');
    expect(output).toContain('r=5');
  });

  it('encodes image data as base64', () => {
    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const expected = Buffer.from(data).toString('base64');
    const output = kittyGraphicsProtocol.render(createRequest({data}));

    expect(output).toContain(expected);
  });

  it('terminates with ST', () => {
    const output = kittyGraphicsProtocol.render(createRequest());

    expect(output).toContain(`${ESC}\\`);
  });

  it('sets m=0 for single-chunk data', () => {
    const output = kittyGraphicsProtocol.render(createRequest());

    expect(output).toContain('m=0');
  });

  it('chunks large data with m=1 for intermediate chunks', () => {
    // Create data large enough to require multiple chunks (> 4096 base64 chars)
    const largeData = new Uint8Array(4096);
    const output = kittyGraphicsProtocol.render(createRequest({data: largeData}));

    expect(output).toContain('m=1');
    expect(output).toContain('m=0');
  });
});
