import {describe, expect, it} from 'vitest';

import {StyleEngine} from '../../classes/StyleEngine';
import {appendUserAgentStyles} from '../appendUserAgentStyles';
import {Window} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;
  const engine = new StyleEngine();

  engine.attach(document);

  return {window, document, engine};
}

describe('appendUserAgentStyles', () => {
  it('appends CSS text to the UA stylesheet element', () => {
    const {document} = createEnv();

    appendUserAgentStyles(document, 'button { display: inline; }');

    const ua = document.head.querySelector('[data-ua-stylesheet]');
    expect(ua!.textContent).toContain('button { display: inline; }');
  });

  it('preserves existing UA stylesheet content', () => {
    const {document} = createEnv();
    const uaBefore = document.head.querySelector('[data-ua-stylesheet]')!.textContent;

    appendUserAgentStyles(document, 'table { display: block; }');

    const uaAfter = document.head.querySelector('[data-ua-stylesheet]')!.textContent!;
    expect(uaAfter).toContain(uaBefore!);
    expect(uaAfter).toContain('table { display: block; }');
  });

  it('supports multiple appends', () => {
    const {document} = createEnv();

    appendUserAgentStyles(document, 'button { display: inline; }');
    appendUserAgentStyles(document, 'input { display: inline; }');

    const uaText = document.head.querySelector('[data-ua-stylesheet]')!.textContent!;
    expect(uaText).toContain('button { display: inline; }');
    expect(uaText).toContain('input { display: inline; }');
  });

  it('does nothing when UA stylesheet is not present', () => {
    const window = new Window();
    const document = window.document;

    // No engine attached — no UA stylesheet injected
    expect(() => {
      appendUserAgentStyles(document, 'button { display: inline; }');
    }).not.toThrow();
  });

  it('appended styles are applied by the style engine', () => {
    const {document, engine} = createEnv();

    appendUserAgentStyles(document, 'button { font-weight: bold; padding: 0 1; }');

    const btn = document.createElement('button');
    document.body.appendChild(btn);

    engine.recomputeDirty();

    const computed = engine.getComputedStyle(btn);
    expect(computed.get('font-weight')).toBe('bold');
  });

  it('appended UA styles are overridden by user stylesheets', () => {
    const {document, engine} = createEnv();

    appendUserAgentStyles(document, 'button { font-weight: bold; }');

    const userStyle = document.createElement('style');
    userStyle.textContent = 'button { font-weight: normal; }';
    document.head.appendChild(userStyle);

    const btn = document.createElement('button');
    document.body.appendChild(btn);

    engine.recomputeDirty();

    expect(engine.getComputedStyle(btn).get('font-weight')).toBe('normal');
  });

  it('appended UA styles are overridden by inline styles', () => {
    const {document, engine} = createEnv();

    appendUserAgentStyles(document, 'button { font-weight: bold; }');

    const btn = document.createElement('button');
    btn.style.fontWeight = 'normal';
    document.body.appendChild(btn);

    engine.recomputeDirty();

    expect(engine.getComputedStyle(btn).get('font-weight')).toBe('normal');
  });
});
