import {describe, expect, it, vi} from 'vitest';

import {Window} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {Img} from '../component';

// Mock node:fs so tests don't need real files
vi.mock('node:fs', () => ({
  readFileSync: vi.fn((path: string) => {
    if (path === '/test/image.png') {
      // Minimal PNG header: signature + IHDR with 200x100 dimensions
      const data = new Uint8Array(24);
      data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const view = new DataView(data.buffer);
      view.setUint32(8, 13);
      data.set([0x49, 0x48, 0x44, 0x52], 12);
      view.setUint32(16, 200);
      view.setUint32(20, 100);
      return Buffer.from(data);
    }

    if (path === '/test/missing.png') {
      throw new Error('ENOENT');
    }

    return Buffer.alloc(0);
  }),
}));

function createEnv() {
  const window = new Window();
  window.customElements.define(Img.tagName, Img as unknown as CustomElementConstructor);
  return {window, document: window.document};
}

describe('Img', () => {
  it('registers under the img tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('img')).toBe(Img as unknown as CustomElementConstructor);
  });

  it('src property reflects the attribute', () => {
    const {document} = createEnv();
    const img = document.createElement('img') as Img;

    expect(img.src).toBe('');

    img.src = '/test/image.png';

    expect(img.getAttribute('src')).toBe('/test/image.png');
  });

  it('alt property reflects the attribute', () => {
    const {document} = createEnv();
    const img = document.createElement('img') as Img;

    img.alt = 'A photo';

    expect(img.getAttribute('alt')).toBe('A photo');
    expect(img.alt).toBe('A photo');
  });

  it('width and height properties reflect attributes', () => {
    const {document} = createEnv();
    const img = document.createElement('img') as Img;

    img.width = 20;
    img.height = 10;

    expect(img.getAttribute('width')).toBe('20');
    expect(img.getAttribute('height')).toBe('10');
    expect(img.width).toBe(20);
    expect(img.height).toBe(10);
  });

  it('loads image data and parses dimensions on connect', () => {
    const {document} = createEnv();
    const img = document.createElement('img') as Img;
    img.setAttribute('src', '/test/image.png');
    document.body.appendChild(img);

    expect(img.imageData).not.toBeNull();
    expect(img.imageData!.length).toBe(24);
    expect(img.naturalWidth).toBe(200);
    expect(img.naturalHeight).toBe(100);
  });

  it('handles missing files gracefully', () => {
    const {document} = createEnv();
    const img = document.createElement('img') as Img;
    img.setAttribute('src', '/test/missing.png');
    document.body.appendChild(img);

    expect(img.imageData).toBeNull();
    expect(img.naturalWidth).toBe(0);
    expect(img.naturalHeight).toBe(0);
  });

  it('clears image data when src is removed', () => {
    const {document} = createEnv();
    const img = document.createElement('img') as Img;
    img.setAttribute('src', '/test/image.png');
    document.body.appendChild(img);

    expect(img.imageData).not.toBeNull();

    img.removeAttribute('src');

    expect(img.imageData).toBeNull();
    expect(img.naturalWidth).toBe(0);
  });

  it('reloads when src attribute changes', () => {
    const {document} = createEnv();
    const img = document.createElement('img') as Img;
    img.setAttribute('src', '/test/image.png');
    document.body.appendChild(img);

    expect(img.naturalWidth).toBe(200);

    img.setAttribute('src', '/test/missing.png');

    expect(img.imageData).toBeNull();
    expect(img.naturalWidth).toBe(0);
  });

  it('returns 0 for width/height when attributes are not set', () => {
    const {document} = createEnv();
    const img = document.createElement('img') as Img;

    expect(img.width).toBe(0);
    expect(img.height).toBe(0);
  });
});
