import {describe, it, expect} from 'vitest';
import {Event, Window} from '../../../dom';
import {StyleEngine} from '../../../css';
import {LayoutEngine} from '../../../layout';
import {Painter} from '../../../renderer/classes/Painter';
import {CellBuffer} from '../../../renderer/classes/CellBuffer';
import {UiOption} from '../../UiOption/component';
import {UiSelect} from '../component';

import type {CustomElementConstructor} from '../../../dom/types';

/**
 * Sets up a select with the SAME CSS the example app uses — no component
 * styles injected, only user-authored CSS.
 */
function setup(opts: {value?: string; options: Array<{value: string; label: string}>}) {
  const w = new Window();
  const d = w.document;
  const se = new StyleEngine();
  se.attach(d);

  w.customElements.define(UiSelect.tagName, UiSelect as unknown as CustomElementConstructor);
  w.customElements.define(UiOption.tagName, UiOption as unknown as CustomElementConstructor);

  /* Mimic the example's user CSS — NO component styles.css injected */
  const style = d.createElement('style');
  style.textContent = `
    ui-select {
      color: #e5e7eb;
      background-color: #1e293b;
      text-decoration: none;
      width: 20;
    }
    ui-select:focus { background-color: #334155; }
    ui-select .ui-select-listbox { background-color: #1e293b; }
    ui-option { display: block; color: #e5e7eb; }
    ui-option[highlighted] { background-color: #7c3aed; color: #ffffff; }
    ui-option[selected] { font-weight: bold; }
  `;
  d.head.appendChild(style);

  const select = d.createElement('ui-select') as UiSelect;
  if (opts.value) select.setAttribute('value', opts.value);

  for (const data of opts.options) {
    const opt = d.createElement('ui-option') as UiOption;
    opt.setAttribute('value', data.value);
    opt.textContent = data.label;
    select.appendChild(opt);
  }

  d.body.appendChild(select);

  return {w, d, se, select};
}

function renderToRows(
  se: StyleEngine,
  d: import('../../../dom').Document,
  cols: number,
  rows: number,
): string[] {
  se.computeAll();
  const le = new LayoutEngine(se);
  const layout = le.layout(d.body, cols, rows);
  const buffer = new CellBuffer(cols, rows);
  new Painter().paint(layout, buffer);

  const result: string[] = [];

  for (let y = 0; y < rows; y++) {
    let row = '';

    for (let x = 0; x < cols; x++) {
      row += buffer.get(x, y)?.char ?? ' ';
    }

    result.push(row);
  }

  return result;
}

const FRUITS = [
  {value: 'apple', label: 'Apple'},
  {value: 'banana', label: 'Banana'},
  {value: 'cherry', label: 'Cherry'},
];

describe('UiSelect rendering (real example CSS)', () => {
  it('shows indicator at the right edge of the select width', () => {
    const {se, d} = setup({value: 'apple', options: FRUITS});
    const rows = renderToRows(se, d, 40, 5);

    expect(rows[0]).toContain('Apple');
    expect(rows[0]).toContain('▾');

    const indicatorIndex = rows[0]!.indexOf('▾');
    const labelEnd = rows[0]!.indexOf('Apple') + 5;

    /* Indicator should be well past the label, near the right edge */
    expect(indicatorIndex).toBeGreaterThan(labelEnd + 3);
  });

  it('shows options when opened', () => {
    const {se, d, select} = setup({value: 'apple', options: FRUITS});
    select.open();
    const rows = renderToRows(se, d, 40, 10);

    expect(rows.some((r) => r.includes('Apple'))).toBe(true);
    expect(rows.some((r) => r.includes('Banana'))).toBe(true);
    expect(rows.some((r) => r.includes('Cherry'))).toBe(true);
  });

  it('aligns option text with trigger text', () => {
    const {se, d, select} = setup({value: 'apple', options: FRUITS});
    select.open();
    const rows = renderToRows(se, d, 40, 10);

    const triggerStart = rows[0]!.search(/[A-Z]/);
    const bananaRow = rows.find((r) => r.includes('Banana'))!;
    const bananaStart = bananaRow.search(/[A-Z]/);

    expect(bananaStart).toBe(triggerStart);
  });

  it('flips indicator when opened', () => {
    const {se, d, select} = setup({value: 'apple', options: FRUITS});
    select.open();
    const rows = renderToRows(se, d, 40, 10);

    expect(rows[0]).toContain('▴');
  });
});

describe('UiSelect click behavior', () => {
  it('clicking an option selects it and closes dropdown', () => {
    const {select} = setup({value: 'apple', options: FRUITS});

    select.open();
    expect(select.isOpen()).toBe(true);

    /* Simulate what EventDispatcher does: mousedown then click */
    const options = Array.from(
      (select as unknown as {childNodes: ArrayLike<unknown>}).childNodes,
    ).flatMap((child) => {
      if ((child as import('../../../dom').Element).localName === 'div') {
        return Array.from(
          (child as import('../../../dom').Element as unknown as {childNodes: ArrayLike<unknown>})
            .childNodes,
        ).filter(
          (n) => (n as import('../../../dom').Element).localName === 'ui-option',
        ) as unknown as UiOption[];
      }

      return [];
    });

    const targetOption = options.find((o) => o.getValue() === 'cherry');
    expect(targetOption).toBeDefined();

    /* Mousedown on option (no tabindex) */
    targetOption!.dispatchEvent(new Event('mousedown', {bubbles: true, cancelable: true}));

    /* The dropdown should still be open (mousedown should be prevented) */
    expect(select.isOpen()).toBe(true);

    /* Click bubbles from option to select */
    targetOption!.dispatchEvent(new Event('click', {bubbles: true}));

    expect(select.getAttribute('value')).toBe('cherry');
    expect(select.isOpen()).toBe(false);
  });

  it('clicking a focused open select closes it', () => {
    const {w, select} = setup({value: 'apple', options: FRUITS});

    /* Focus the select */
    w.document.setActiveElement(select as unknown as import('../../../dom').Element);
    select.open();
    expect(select.isOpen()).toBe(true);

    /* Click on the trigger area (not an option) */
    select.dispatchEvent(new Event('click', {bubbles: true}));

    expect(select.isOpen()).toBe(false);
  });

  it('tab away from open select closes it', () => {
    const {w, select} = setup({value: 'apple', options: FRUITS});

    const other = w.document.createElement('div');
    other.setAttribute('tabindex', '1');
    w.document.body.appendChild(other);

    w.document.setActiveElement(select as unknown as import('../../../dom').Element);
    select.open();
    expect(select.isOpen()).toBe(true);

    /* Simulate tab: setActiveElement to next element */
    w.document.setActiveElement(other);

    expect(select.isOpen()).toBe(false);
  });
});
