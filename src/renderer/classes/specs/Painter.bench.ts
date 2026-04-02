import {bench, describe} from 'vitest';

import {Window} from '@cliui/dom';
import {CellBuffer} from '../CellBuffer';
import {Painter} from '../Painter';

import type {LayoutBox} from '../../../layout/types';
import type {ComputedStyle} from '../../../css/types';

function style(props: Record<string, string>): ComputedStyle {
  return new Map(Object.entries(props));
}

function createScenario(cardCount: number): {paint(): void} {
  const document = new Window().document;
  const painter = new Painter();
  const buffer = new CellBuffer(120, 32);
  const boxes: LayoutBox[] = [];

  for (let index = 0; index < cardCount; index += 1) {
    boxes.push({
      element: document.createElement('div'),
      x: (index % 4) * 28,
      y: Math.floor(index / 4) * 6,
      width: 26,
      height: 5,
      contentX: (index % 4) * 28 + 1,
      contentY: Math.floor(index / 4) * 6 + 1,
      contentWidth: 24,
      contentHeight: 3,
      computedStyle: style({
        'background-color': index % 2 === 0 ? '#111827' : '#1f2937',
        color: '#e5e7eb',
        'border-style': index % 3 === 0 ? 'rounded' : 'single',
        'border-color': '#7c3aed',
      }),
      textLines: ['Panel title', 'Status: healthy', 'Throughput 120 req/s'],
      children: [],
      zIndex: index % 2,
    });
  }

  return {
    paint() {
      buffer.clear();
      painter.paint(boxes, buffer);
    },
  };
}

const typicalScenario = createScenario(8);
const largeScenario = createScenario(16);

describe('Painter', () => {
  bench('paints a typical set of nested dashboard cards', () => {
    typicalScenario.paint();
  });

  bench('paints a large set of nested dashboard cards', () => {
    largeScenario.paint();
  });
});
