import {describe, it, expect} from 'vitest';
import {Window} from '../../../dom';
import {StyleEngine} from '../../../css';
import {LayoutEngine} from '../../../layout';
import {Painter} from '../../../renderer/classes/Painter';
import {CellBuffer} from '../../../renderer/classes/CellBuffer';
import {UiOption} from '../../UiOption/component';
import {UiSelect} from '../component';

import type {CustomElementConstructor} from '../../../dom/types';

function setup(opts: {
  value?: string;
  width?: number;
  options: Array<{value: string; label: string}>;
}) {
  const w = new Window();
  const d = w.document;
  const se = new StyleEngine();
  se.attach(d);

  w.customElements.define(UiSelect.tagName, UiSelect as unknown as CustomElementConstructor);
  w.customElements.define(UiOption.tagName, UiOption as unknown as CustomElementConstructor);

  const style = d.createElement('style');
  style.textContent = `
    ui-select { width: ${opts.width ?? 20}; padding: 0 1; }
    ui-option { display: block; }
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

describe('UiSelect rendering', () => {
  it('shows the trigger with down indicator when collapsed', () => {
    const {se, d} = setup({value: 'banana', width: 20, options: FRUITS});
    const rows = renderToRows(se, d, 40, 5);

    expect(rows[0]).toContain('Banana');
    expect(rows[0]).toContain('▾');
  });

  it('right-aligns the indicator within the select width', () => {
    const {se, d} = setup({value: 'apple', width: 20, options: FRUITS});
    const rows = renderToRows(se, d, 40, 5);

    const indicatorIndex = rows[0]!.indexOf('▾');
    const labelEnd = rows[0]!.indexOf('Apple') + 5;

    expect(indicatorIndex).toBeGreaterThan(labelEnd + 2);
  });

  it('shows option text when dropdown is open', () => {
    const {se, d, select} = setup({value: 'banana', width: 20, options: FRUITS});
    select.open();
    const rows = renderToRows(se, d, 40, 10);

    expect(rows.some((r) => r.includes('Apple'))).toBe(true);
    expect(rows.some((r) => r.includes('Banana'))).toBe(true);
    expect(rows.some((r) => r.includes('Cherry'))).toBe(true);
  });

  it('aligns dropdown left edge with trigger left edge', () => {
    const {se, d, select} = setup({value: 'apple', width: 20, options: FRUITS});
    select.open();
    const rows = renderToRows(se, d, 40, 10);

    const triggerRow = rows[0]!;
    const triggerStart = triggerRow.search(/\S/);

    const optionRow = rows.find((r) => r.includes('Banana'))!;
    const optionStart = optionRow.search(/\S/);

    expect(optionStart).toBe(triggerStart);
  });

  it('flips indicator to up caret when open', () => {
    const {se, d, select} = setup({value: 'apple', width: 20, options: FRUITS});
    select.open();
    const rows = renderToRows(se, d, 40, 10);

    expect(rows[0]).toContain('▴');
    expect(rows[0]).not.toContain('▾');
  });
});
