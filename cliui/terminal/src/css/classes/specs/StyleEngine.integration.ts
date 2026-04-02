import {describe, expect, it} from 'vitest';

import {StyleEngine} from '../StyleEngine';
import {Window} from '@cliui/dom';

describe('StyleEngine integration', () => {
  it('recomputes dirty elements after DOM, inline style, and stylesheet changes and exposes resolved styles for layout consumers', () => {
    const window = new Window();
    const document = window.document;
    const engine = new StyleEngine();

    engine.attach(document);

    const style = document.createElement('style');
    style.textContent = `
      .panel {
        display: flex;
        color: red;
      }

      .panel .label {
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.className = 'panel';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = 'status';
    panel.appendChild(label);
    document.body.appendChild(panel);

    engine.computeAll();

    expect(engine.getComputedStyle(panel).get('display')).toBe('flex');
    expect(engine.getComputedStyle(panel).get('color')).toBe('red');
    expect(engine.getComputedStyle(label).get('font-weight')).toBe('bold');
    expect(engine.getComputedStyle(label).get('color')).toBe('red');

    panel.style.color = 'purple';
    engine.recomputeDirty();

    expect(engine.getComputedStyle(panel).get('color')).toBe('purple');
    expect(engine.getComputedStyle(label).get('color')).toBe('purple');
    expect(engine.getLayoutDirtyElements().has(panel)).toBe(false);
    expect(engine.getLayoutDirtyElements().has(label)).toBe(false);

    engine.clearLayoutDirty();
    style.textContent = `
      .panel {
        display: block;
        padding: 2;
        color: blue;
      }

      .panel .label {
        font-weight: bold;
        text-align: center;
      }
    `;
    engine.invalidateStylesheets();
    engine.markStyleDirty(panel);
    engine.recomputeDirty();

    const panelStyle = engine.getComputedStyle(panel);
    const labelStyle = engine.getComputedStyle(label);

    expect(panelStyle.get('display')).toBe('block');
    expect(panelStyle.get('padding-top')).toBe('2');
    expect(panelStyle.get('color')).toBe('purple');
    expect(labelStyle.get('font-weight')).toBe('bold');
    expect(labelStyle.get('text-align')).toBe('center');
    expect(labelStyle.get('color')).toBe('purple');
    expect(engine.getLayoutDirtyElements().has(panel)).toBe(true);
    expect(engine.getLayoutDirtyElements().has(label)).toBe(true);

    engine.clearLayoutDirty();

    const badge = document.createElement('span');
    badge.className = 'label';
    badge.textContent = 'new';
    panel.appendChild(badge);

    expect(engine.getLayoutDirtyElements().has(panel)).toBe(true);

    engine.recomputeDirty();

    expect(engine.getComputedStyle(badge).get('font-weight')).toBe('bold');
    expect(engine.getComputedStyle(badge).get('text-align')).toBe('center');
    expect(engine.getComputedStyle(badge).get('color')).toBe('purple');
  });

  it('recomputes pseudo-class styles when focus, hover, and active state change', () => {
    const window = new Window();
    const document = window.document;
    const engine = new StyleEngine();

    engine.attach(document);

    const style = document.createElement('style');
    style.textContent = `
      button:focus {
        color: purple;
      }

      button:hover {
        font-weight: bold;
      }

      button:active {
        background-color: blue;
      }

      button:disabled {
        opacity: 0.5;
      }
    `;
    document.head.appendChild(style);

    const first = document.createElement('button');
    const second = document.createElement('button');
    document.body.appendChild(first);
    document.body.appendChild(second);

    engine.computeAll();

    expect(engine.getComputedStyle(first).get('color')).toBe('');
    expect(engine.getComputedStyle(second).get('color')).toBe('');

    document.setActiveElement(first);
    engine.recomputeDirty();

    expect(engine.getComputedStyle(first).get('color')).toBe('purple');
    expect(engine.getComputedStyle(second).get('color')).toBe('');

    document.setActiveElement(second);
    engine.recomputeDirty();

    expect(engine.getComputedStyle(first).get('color')).toBe('');
    expect(engine.getComputedStyle(second).get('color')).toBe('purple');

    document.setHoveredElement(first);
    engine.recomputeDirty();

    expect(engine.getComputedStyle(first).get('font-weight')).toBe('bold');
    expect(engine.getComputedStyle(second).get('font-weight')).toBe('normal');

    document.setHoveredElement(second);
    engine.recomputeDirty();

    expect(engine.getComputedStyle(first).get('font-weight')).toBe('normal');
    expect(engine.getComputedStyle(second).get('font-weight')).toBe('bold');

    first.setAttribute('pressed', '');
    engine.recomputeDirty();

    expect(engine.getComputedStyle(first).get('background-color')).toBe('blue');

    first.removeAttribute('pressed');
    engine.recomputeDirty();

    expect(engine.getComputedStyle(first).get('background-color')).toBeUndefined();

    first.setAttribute('disabled', '');
    engine.recomputeDirty();

    expect(engine.getComputedStyle(first).get('opacity')).toBe('0.5');
  });
});
