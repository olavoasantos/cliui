import {bench, describe} from 'vitest';

import {Window} from '@cliui/dom';
import {Renderer} from '../Renderer';

import type {LayoutBox} from '../../../layout/types';
import type {ComputedStyle} from '../../../css/types';

function style(props: Record<string, string>): ComputedStyle {
  return new Map(Object.entries(props));
}

function createScenario(cols: number, rows: number, cardCount: number): {render(): void} {
  const document = new Window().document;
  const renderer = new Renderer(cols, rows);
  const boxes: LayoutBox[] = [];

  for (let index = 0; index < cardCount; index += 1) {
    const x = (index % 4) * Math.floor(cols / 4);
    const y = Math.floor(index / 4) * 6;

    boxes.push({
      element: document.createElement('section'),
      x,
      y,
      width: Math.floor(cols / 4) - 1,
      height: 5,
      contentX: x + 1,
      contentY: y + 1,
      contentWidth: Math.floor(cols / 4) - 3,
      contentHeight: 3,
      computedStyle: style({
        'background-color': '#111827',
        color: '#e5e7eb',
        'border-style': 'rounded',
        'border-color': '#6366f1',
      }),
      textLines: ['Dashboard', `Card ${index}`, 'Latency 12ms'],
      children: [],
      zIndex: index % 3,
    });
  }

  return {
    render() {
      renderer.render(boxes);
    },
  };
}

const compactScenario = createScenario(80, 24, 8);
const typicalScenario = createScenario(120, 32, 12);
const largeScenario = createScenario(160, 48, 16);

describe('Renderer', () => {
  bench('renders a compact dashboard frame at 80x24', () => {
    compactScenario.render();
  });

  bench('renders a typical dashboard frame at 120x32', () => {
    typicalScenario.render();
  });

  bench('renders a large dashboard frame at 160x48', () => {
    largeScenario.render();
  });
});
