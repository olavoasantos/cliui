import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import {StyleEngine} from '../../../css/classes/StyleEngine';
import {LayoutEngine} from '../../../layout/classes/LayoutEngine';
import {CellBuffer} from '../CellBuffer';
import {Painter} from '../Painter';

function createEnv() {
  const window = new Window();
  const document = window.document;
  const styleEngine = new StyleEngine();
  styleEngine.attach(document);

  return {window, document, styleEngine};
}

describe('Painter — hr element', () => {
  it('renders hr as a horizontal line spanning parent width', () => {
    const {document, styleEngine} = createEnv();
    const hr = document.createElement('hr');
    document.body.appendChild(hr);

    styleEngine.computeAll();
    const layoutEngine = new LayoutEngine(styleEngine);
    const box = layoutEngine.layout(document.body, 20, 10);

    const painter = new Painter();
    const buffer = new CellBuffer(20, 10);
    painter.paint(box, buffer);

    // hr should render with '─' characters across the full width
    for (let x = 0; x < 20; x++) {
      const cell = buffer.get(x, 0);
      expect(cell?.char).toBe('─');
    }
  });

  it('renders hr with custom width', () => {
    const {document, styleEngine} = createEnv();
    const hr = document.createElement('hr');
    hr.style.width = '10';
    document.body.appendChild(hr);

    styleEngine.computeAll();
    const layoutEngine = new LayoutEngine(styleEngine);
    const box = layoutEngine.layout(document.body, 20, 10);

    const painter = new Painter();
    const buffer = new CellBuffer(20, 10);
    painter.paint(box, buffer);

    // First 10 cells should have '─'
    for (let x = 0; x < 10; x++) {
      expect(buffer.get(x, 0)?.char).toBe('─');
    }

    // Cell 10 should be empty/space
    expect(buffer.get(10, 0)?.char).toBe(' ');
  });
});
