import {describe, expect, it} from 'vitest';
import {Location} from '../Location';

describe('Location', () => {
  it('defaults to about:blank', () => {
    const location = new Location();
    expect(location.href).toBe('about:blank');
    expect(location.protocol).toBe('about:');
    expect(location.pathname).toBe('blank');
  });

  it('accepts a custom URL', () => {
    const location = new Location('https://example.com:8080/path?q=1#hash');
    expect(location.href).toBe('https://example.com:8080/path?q=1#hash');
    expect(location.protocol).toBe('https:');
    expect(location.hostname).toBe('example.com');
    expect(location.port).toBe('8080');
    expect(location.host).toBe('example.com:8080');
    expect(location.pathname).toBe('/path');
    expect(location.search).toBe('?q=1');
    expect(location.hash).toBe('#hash');
    expect(location.origin).toBe('https://example.com:8080');
  });

  it('updates href via setter', () => {
    const location = new Location();
    location.href = 'https://test.io/foo';
    expect(location.hostname).toBe('test.io');
    expect(location.pathname).toBe('/foo');
  });

  it('updates individual components via setters', () => {
    const location = new Location('https://example.com/path');

    location.protocol = 'http:';
    expect(location.protocol).toBe('http:');

    location.hostname = 'other.com';
    expect(location.hostname).toBe('other.com');

    location.port = '3000';
    expect(location.port).toBe('3000');

    location.pathname = '/new';
    expect(location.pathname).toBe('/new');

    location.search = '?x=1';
    expect(location.search).toBe('?x=1');

    location.hash = '#section';
    expect(location.hash).toBe('#section');
  });

  it('updates href via assign()', () => {
    const location = new Location();
    location.assign('https://assigned.com/page');
    expect(location.href).toBe('https://assigned.com/page');
  });

  it('updates href via replace()', () => {
    const location = new Location();
    location.replace('https://replaced.com/page');
    expect(location.href).toBe('https://replaced.com/page');
  });

  it('reload is a no-op that does not throw', () => {
    const location = new Location('https://example.com');
    expect(() => location.reload()).not.toThrow();
    expect(location.href).toBe('https://example.com/');
  });

  it('serializes to the href string', () => {
    const location = new Location('https://example.com/path');
    expect(location.toString()).toBe('https://example.com/path');
    expect(`${location}`).toBe('https://example.com/path');
  });
});
