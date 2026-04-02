import {bench, describe} from 'vitest';

import {Window} from '@cliui/dom';
import {FlexLayout} from '../FlexLayout';

import type {Document} from '@cliui/dom';
import type {ComputedStyle} from '../../../css/types';
import type {LayoutBox} from '../../types';

type FlexScenario = {
  layout(): void;
};

function style(properties: Record<string, string>): ComputedStyle {
  return new Map(Object.entries(properties));
}

function createChildTemplate(
  document: Document,
  index: number,
  width: number,
  height: number,
): LayoutBox {
  return {
    element: document.createElement('div'),
    x: 0,
    y: 0,
    width,
    height,
    contentX: 0,
    contentY: 0,
    contentWidth: width,
    contentHeight: height,
    computedStyle: style({
      'flex-grow': index % 3 === 0 ? '1' : '0',
      'flex-shrink': index % 2 === 0 ? '1' : '2',
      'flex-basis': String(width - (index % 2)),
      'align-self': index % 5 === 0 ? 'center' : 'auto',
    }),
    textLines: Array.from({length: height}, (_, lineIndex) => `child-${index}-${lineIndex}`),
    children: [],
    zIndex: 0,
  };
}

function cloneBox(template: LayoutBox): LayoutBox {
  return {
    ...template,
    computedStyle: new Map(template.computedStyle),
    textLines: template.textLines === undefined ? undefined : [...template.textLines],
    children: template.children.map((child) => cloneBox(child)),
  };
}

function createScenario(childCount: number, availableWidth: number, wrap: boolean): FlexScenario {
  const document = new Window().document;
  const flexLayout = new FlexLayout();
  const container = document.createElement('section');
  const computedStyle = style({
    'flex-direction': 'row',
    'flex-wrap': wrap ? 'wrap' : 'nowrap',
    'justify-content': 'space-between',
    'align-items': 'center',
    'padding-top': '1',
    'padding-right': '1',
    'padding-bottom': '1',
    'padding-left': '1',
    'column-gap': '1',
    'row-gap': '1',
  });
  const templates = Array.from({length: childCount}, (_, index) =>
    createChildTemplate(document, index, 4 + (index % 4), 1 + (index % 3)),
  );

  return {
    layout() {
      const children = templates.map((template) => cloneBox(template));

      flexLayout.layout(container, computedStyle, children, [], availableWidth, 40, 0, 0);
    },
  };
}

const smallScenario = createScenario(6, 28, false);
const typicalScenario = createScenario(18, 48, true);
const largeScenario = createScenario(48, 72, true);

describe('FlexLayout', () => {
  bench('lays out a small flex row without wrapping', () => {
    smallScenario.layout();
  });

  bench('lays out a typical wrapped flex container', () => {
    typicalScenario.layout();
  });

  bench('lays out a large wrapped flex container', () => {
    largeScenario.layout();
  });
});
