import {describe, expect, it} from 'vitest';
import {BorderStyleRegistry} from '../BorderStyleRegistry';

describe('BorderStyleRegistry', () => {
  it('contains built-in border styles', () => {
    const registry = new BorderStyleRegistry();

    expect(registry.has('single')).toBe(true);
    expect(registry.has('rounded')).toBe(true);
    expect(registry.has('double')).toBe(true);
    expect(registry.has('thick')).toBe(true);
    expect(registry.has('ascii')).toBe(true);
    expect(registry.has('hidden')).toBe(true);
    expect(registry.has('block')).toBe(true);
    expect(registry.has('half-block')).toBe(true);
  });

  it('returns the correct characters for a built-in style', () => {
    const registry = new BorderStyleRegistry();
    const rounded = registry.get('rounded');

    expect(rounded.topLeft).toBe('╭');
    expect(rounded.topRight).toBe('╮');
    expect(rounded.bottomLeft).toBe('╰');
    expect(rounded.bottomRight).toBe('╯');
    expect(rounded.top).toBe('─');
    expect(rounded.left).toBe('│');
  });

  it('falls back to single for unknown styles', () => {
    const registry = new BorderStyleRegistry();
    const fallback = registry.get('nonexistent');
    const single = registry.get('single');

    expect(fallback).toEqual(single);
  });

  it('registers a custom border style from an at-rule', () => {
    const registry = new BorderStyleRegistry();

    registry.register({
      identifier: 'border-style',
      prelude: 'stars',
      declarations: [
        {property: 'top', value: '"★"'},
        {property: 'bottom', value: '"★"'},
        {property: 'left', value: '"☆"'},
        {property: 'right', value: '"☆"'},
        {property: 'top-left', value: '"✦"'},
        {property: 'top-right', value: '"✦"'},
        {property: 'bottom-left', value: '"✦"'},
        {property: 'bottom-right', value: '"✦"'},
      ],
    });

    expect(registry.has('stars')).toBe(true);

    const stars = registry.get('stars');

    expect(stars.top).toBe('★');
    expect(stars.bottom).toBe('★');
    expect(stars.left).toBe('☆');
    expect(stars.right).toBe('☆');
    expect(stars.topLeft).toBe('✦');
    expect(stars.topRight).toBe('✦');
    expect(stars.bottomLeft).toBe('✦');
    expect(stars.bottomRight).toBe('✦');
  });

  it('handles unquoted values', () => {
    const registry = new BorderStyleRegistry();

    registry.register({
      identifier: 'border-style',
      prelude: 'pipes',
      declarations: [
        {property: 'top', value: '='},
        {property: 'bottom', value: '='},
        {property: 'left', value: '|'},
        {property: 'right', value: '|'},
        {property: 'top-left', value: '+'},
        {property: 'top-right', value: '+'},
        {property: 'bottom-left', value: '+'},
        {property: 'bottom-right', value: '+'},
      ],
    });

    const pipes = registry.get('pipes');

    expect(pipes.top).toBe('=');
    expect(pipes.left).toBe('|');
    expect(pipes.topLeft).toBe('+');
  });

  it('defaults missing properties to spaces', () => {
    const registry = new BorderStyleRegistry();

    registry.register({
      identifier: 'border-style',
      prelude: 'partial',
      declarations: [{property: 'top', value: '─'}],
    });

    const partial = registry.get('partial');

    expect(partial.top).toBe('─');
    expect(partial.bottom).toBe(' ');
    expect(partial.left).toBe(' ');
    expect(partial.topLeft).toBe(' ');
  });

  it('can override a built-in style', () => {
    const registry = new BorderStyleRegistry();

    registry.register({
      identifier: 'border-style',
      prelude: 'single',
      declarations: [
        {property: 'top', value: '~'},
        {property: 'bottom', value: '~'},
        {property: 'left', value: '!'},
        {property: 'right', value: '!'},
        {property: 'top-left', value: '#'},
        {property: 'top-right', value: '#'},
        {property: 'bottom-left', value: '#'},
        {property: 'bottom-right', value: '#'},
      ],
    });

    const single = registry.get('single');

    expect(single.top).toBe('~');
    expect(single.topLeft).toBe('#');
  });

  it('ignores unknown declarations', () => {
    const registry = new BorderStyleRegistry();

    registry.register({
      identifier: 'border-style',
      prelude: 'test',
      declarations: [
        {property: 'top', value: '─'},
        {property: 'unknown-prop', value: 'x'},
      ],
    });

    const test = registry.get('test');

    expect(test.top).toBe('─');
  });
});
