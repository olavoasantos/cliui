import {describe, expect, it} from 'vitest';
import {Navigator} from '../Navigator';

describe('Navigator', () => {
  it('returns a user agent string containing TerminalDOM', () => {
    const navigator = new Navigator();
    expect(navigator.userAgent).toContain('TerminalDOM');
  });

  it('returns en-US as the default language', () => {
    const navigator = new Navigator();
    expect(navigator.language).toBe('en-US');
    expect(navigator.languages).toContain('en-US');
  });

  it('reports online status as true', () => {
    const navigator = new Navigator();
    expect(navigator.onLine).toBe(true);
  });

  it('reports hardware concurrency as a positive number', () => {
    const navigator = new Navigator();
    expect(navigator.hardwareConcurrency).toBeGreaterThan(0);
  });

  it('reports cookies as disabled', () => {
    const navigator = new Navigator();
    expect(navigator.cookieEnabled).toBe(false);
  });

  it('returns the runtime platform', () => {
    const navigator = new Navigator();
    expect(navigator.platform).toBe(process.platform);
  });

  it('returns standard browser identification strings', () => {
    const navigator = new Navigator();
    expect(navigator.appCodeName).toBe('Mozilla');
    expect(navigator.appName).toBe('Netscape');
    expect(navigator.product).toBe('Gecko');
    expect(navigator.vendor).toBe('');
  });

  it('derives appVersion from the user agent', () => {
    const navigator = new Navigator();
    const ua = navigator.userAgent;
    const expected = ua.substring(ua.indexOf('/') + 1);
    expect(navigator.appVersion).toBe(expected);
  });

  it('reports zero touch points', () => {
    const navigator = new Navigator();
    expect(navigator.maxTouchPoints).toBe(0);
  });

  it('returns null for browser-only subsystems', () => {
    const navigator = new Navigator();
    expect(navigator.clipboard).toBeNull();
    expect(navigator.permissions).toBeNull();
    expect(navigator.geolocation).toBeNull();
  });

  it('serializes to [object Navigator]', () => {
    const navigator = new Navigator();
    expect(navigator.toString()).toBe('[object Navigator]');
  });
});
