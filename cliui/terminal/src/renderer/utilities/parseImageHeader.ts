/**
 * Parsed image dimensions from a file header.
 */
export interface ImageDimensions {
  /** Image width in pixels. */
  width: number;

  /** Image height in pixels. */
  height: number;
}

/**
 * Parses image dimensions from a PNG, JPEG, or GIF file header.
 *
 * Only reads the minimal bytes needed for dimensions — does not
 * decode pixel data. Returns `null` if the format is unrecognized
 * or the header is malformed.
 *
 * @param data - Raw image file bytes.
 * @returns Parsed dimensions, or `null` if unrecognizable.
 */
export function parseImageHeader(data: Uint8Array): ImageDimensions | null {
  if (data.length < 8) {
    return null;
  }

  if (isPng(data)) {
    return parsePng(data);
  }

  if (isJpeg(data)) {
    return parseJpeg(data);
  }

  if (isGif(data)) {
    return parseGif(data);
  }

  return null;
}

/** PNG magic bytes: 137 80 78 71 13 10 26 10 */
function isPng(data: Uint8Array): boolean {
  return (
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  );
}

/**
 * PNG IHDR chunk starts at byte 8 (4-byte length + 4-byte type "IHDR").
 * Width is at offset 16 (4 bytes big-endian), height at offset 20.
 */
function parsePng(data: Uint8Array): ImageDimensions | null {
  if (data.length < 24) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);

  return {width, height};
}

/** JPEG magic bytes: FF D8 FF */
function isJpeg(data: Uint8Array): boolean {
  return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}

/**
 * JPEG dimensions are in SOF (Start of Frame) markers: FF C0–CF
 * (excluding FF C4 DHT and FF CC DAC). Scan markers to find one.
 */
function parseJpeg(data: Uint8Array): ImageDimensions | null {
  let offset = 2;

  while (offset + 4 < data.length) {
    if (data[offset] !== 0xff) {
      return null;
    }

    const marker = data[offset + 1]!;

    // SOF markers: C0-C3, C5-C7, C9-CB, CD-CF
    if (isSofMarker(marker)) {
      if (offset + 9 >= data.length) {
        return null;
      }

      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const height = view.getUint16(offset + 5);
      const width = view.getUint16(offset + 7);

      return {width, height};
    }

    // Skip this marker segment
    if (offset + 3 >= data.length) {
      return null;
    }

    const segmentLength = (data[offset + 2]! << 8) | data[offset + 3]!;
    offset += 2 + segmentLength;
  }

  return null;
}

function isSofMarker(marker: number): boolean {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

/** GIF magic bytes: "GIF87a" or "GIF89a" */
function isGif(data: Uint8Array): boolean {
  return (
    data[0] === 0x47 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x38 &&
    (data[4] === 0x37 || data[4] === 0x39) &&
    data[5] === 0x61
  );
}

/**
 * GIF logical screen descriptor: width at offset 6 (LE 16-bit),
 * height at offset 8 (LE 16-bit).
 */
function parseGif(data: Uint8Array): ImageDimensions | null {
  if (data.length < 10) {
    return null;
  }

  const width = data[6]! | (data[7]! << 8);
  const height = data[8]! | (data[9]! << 8);

  return {width, height};
}
