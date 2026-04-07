import {describe, it, expect, vi} from 'vitest';
import {MediaQueryList, MediaQueryListEvent} from '../MediaQueryList';

describe('MediaQueryList', () => {
  it('stores the media query string', () => {
    const mql = new MediaQueryList('(prefers-color-scheme: dark)', true);
    expect(mql.media).toBe('(prefers-color-scheme: dark)');
  });

  it('stores the initial matches state', () => {
    const mql = new MediaQueryList('(prefers-color-scheme: dark)', true);
    expect(mql.matches).toBe(true);

    const mql2 = new MediaQueryList('(prefers-color-scheme: light)', false);
    expect(mql2.matches).toBe(false);
  });

  describe('update', () => {
    it('updates matches and dispatches change event', () => {
      const mql = new MediaQueryList('(prefers-color-scheme: dark)', true);
      const handler = vi.fn();
      mql.addEventListener('change', handler);

      mql.update(false);

      expect(mql.matches).toBe(false);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not dispatch when matches does not change', () => {
      const mql = new MediaQueryList('(prefers-color-scheme: dark)', true);
      const handler = vi.fn();
      mql.addEventListener('change', handler);

      mql.update(true);

      expect(handler).not.toHaveBeenCalled();
    });

    it('calls onchange handler', () => {
      const mql = new MediaQueryList('(prefers-color-scheme: dark)', true);
      mql.onchange = vi.fn();

      mql.update(false);

      expect(mql.onchange).toHaveBeenCalledOnce();
      const event = (mql.onchange as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as MediaQueryListEvent;
      expect(event.matches).toBe(false);
      expect(event.media).toBe('(prefers-color-scheme: dark)');
    });
  });
});

describe('MediaQueryListEvent', () => {
  it('has matches and media properties', () => {
    const event = new MediaQueryListEvent('change', {
      matches: true,
      media: '(prefers-color-scheme: dark)',
    });
    expect(event.matches).toBe(true);
    expect(event.media).toBe('(prefers-color-scheme: dark)');
    expect(event.type).toBe('change');
  });
});
