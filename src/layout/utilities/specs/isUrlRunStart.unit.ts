import {describe, it, expect} from 'vitest';

import {isUrlRunStart} from '../isUrlRunStart';

describe('isUrlRunStart', () => {
  it('detects www. prefix', () => {
    expect(isUrlRunStart('www.')).toBe(true);
    expect(isUrlRunStart('www.example')).toBe(true);
  });

  it('detects scheme:// pattern', () => {
    expect(isUrlRunStart('https:', '//')).toBe(true);
    expect(isUrlRunStart('ftp:', '//')).toBe(true);
  });

  it('rejects scheme without following //', () => {
    expect(isUrlRunStart('https:', 'something')).toBe(false);
    expect(isUrlRunStart('https:')).toBe(false);
  });

  it('rejects non-URL text', () => {
    expect(isUrlRunStart('hello')).toBe(false);
  });
});
