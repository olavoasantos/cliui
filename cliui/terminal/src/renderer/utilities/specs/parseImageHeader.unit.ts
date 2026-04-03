import {describe, expect, it} from 'vitest';

import {parseImageHeader} from '../parseImageHeader';

describe('parseImageHeader', () => {
  it('returns null for data shorter than 8 bytes', () => {
    expect(parseImageHeader(new Uint8Array([0, 1, 2]))).toBeNull();
  });

  it('returns null for unrecognized format', () => {
    expect(parseImageHeader(new Uint8Array(32))).toBeNull();
  });

  describe('PNG', () => {
    function createPng(width: number, height: number): Uint8Array {
      const data = new Uint8Array(24);
      // PNG signature
      data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      // IHDR chunk: length (13) + "IHDR"
      const view = new DataView(data.buffer);
      view.setUint32(8, 13); // chunk length
      data.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
      view.setUint32(16, width);
      view.setUint32(20, height);
      return data;
    }

    it('parses width and height from a PNG header', () => {
      const result = parseImageHeader(createPng(640, 480));

      expect(result).toEqual({width: 640, height: 480});
    });

    it('parses large PNG dimensions', () => {
      const result = parseImageHeader(createPng(3840, 2160));

      expect(result).toEqual({width: 3840, height: 2160});
    });

    it('returns null for truncated PNG', () => {
      const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

      expect(parseImageHeader(data)).toBeNull();
    });
  });

  describe('JPEG', () => {
    function createJpeg(width: number, height: number): Uint8Array {
      // FF D8 FF E0 (APP0 marker) + length + SOF0 marker with dimensions
      const data = new Uint8Array(32);
      data[0] = 0xff;
      data[1] = 0xd8;
      // APP0 marker
      data[2] = 0xff;
      data[3] = 0xe0;
      data[4] = 0x00;
      data[5] = 0x04; // segment length = 4 (just length bytes + 2 data bytes)
      data[6] = 0x00;
      data[7] = 0x00;
      // SOF0 marker at offset 8
      data[8] = 0xff;
      data[9] = 0xc0;
      data[10] = 0x00;
      data[11] = 0x0b; // segment length
      data[12] = 0x08; // precision
      // Height at offset 13 (big-endian 16-bit)
      data[13] = (height >> 8) & 0xff;
      data[14] = height & 0xff;
      // Width at offset 15 (big-endian 16-bit)
      data[15] = (width >> 8) & 0xff;
      data[16] = width & 0xff;
      return data;
    }

    it('parses width and height from a JPEG header', () => {
      const result = parseImageHeader(createJpeg(800, 600));

      expect(result).toEqual({width: 800, height: 600});
    });

    it('returns null for truncated JPEG', () => {
      const data = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x05]);

      expect(parseImageHeader(data)).toBeNull();
    });
  });

  describe('GIF', () => {
    function createGif(width: number, height: number): Uint8Array {
      const data = new Uint8Array(10);
      // "GIF89a"
      data.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      // Width (little-endian 16-bit)
      data[6] = width & 0xff;
      data[7] = (width >> 8) & 0xff;
      // Height (little-endian 16-bit)
      data[8] = height & 0xff;
      data[9] = (height >> 8) & 0xff;
      return data;
    }

    it('parses width and height from a GIF89a header', () => {
      const result = parseImageHeader(createGif(320, 240));

      expect(result).toEqual({width: 320, height: 240});
    });

    it('parses GIF87a header', () => {
      const data = createGif(100, 50);
      data[4] = 0x37; // "GIF87a"

      expect(parseImageHeader(data)).toEqual({width: 100, height: 50});
    });

    it('returns null for truncated GIF', () => {
      const data = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);

      expect(parseImageHeader(data)).toBeNull();
    });
  });
});
