import {bench, describe} from 'vitest';

import {Window} from '@cliui/dom';
import type {ComputedStyle} from '../../../css/types';
import type {LayoutBox} from '../../../layout/types';
import type {TerminalInputEvent} from '../../types';
import {EventDispatcher} from '../EventDispatcher';

function style(props: Record<string, string> = {}): ComputedStyle {
  return new Map(Object.entries(props));
}

function createBox(document: Window['document'], overrides: Partial<LayoutBox> = {}): LayoutBox {
  return {
    element: overrides.element ?? document.createElement('div'),
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 1,
    height: overrides.height ?? 1,
    contentX: overrides.contentX ?? overrides.x ?? 0,
    contentY: overrides.contentY ?? overrides.y ?? 0,
    contentWidth: overrides.contentWidth ?? overrides.width ?? 1,
    contentHeight: overrides.contentHeight ?? overrides.height ?? 1,
    computedStyle: overrides.computedStyle ?? style(),
    textLines: overrides.textLines,
    children: overrides.children ?? [],
    zIndex: overrides.zIndex ?? 0,
  };
}

function createScenario(
  columnCount: number,
  rowCount: number,
  eventCount: number,
): {
  dispatch(): void;
} {
  const window = new Window();
  const {document} = window;
  const dispatcher = new EventDispatcher(document);
  const events: TerminalInputEvent[] = [];
  const cardWidth = Math.max(8, Math.floor(columnCount / 4) - 2);
  const cardHeight = 5;
  const rootChildren: LayoutBox[] = [];

  for (let index = 0; index < eventCount; index += 1) {
    const x = (index % 4) * (cardWidth + 1);
    const y = (Math.floor(index / 4) % Math.max(1, Math.floor(rowCount / cardHeight))) * cardHeight;
    const element = document.createElement(index % 2 === 0 ? 'button' : 'div');

    if ('setAttribute' in element) {
      element.setAttribute('tabindex', '0');
    }

    rootChildren.push(
      createBox(document, {
        element,
        x,
        y,
        width: cardWidth,
        height: cardHeight - 1,
        contentX: x + 1,
        contentY: y + 1,
        contentWidth: Math.max(1, cardWidth - 2),
        contentHeight: Math.max(1, cardHeight - 3),
        computedStyle: style({overflow: index % 3 === 0 ? 'scroll' : 'visible'}),
        scrollHeight: cardHeight + 6,
        zIndex: index % 5,
      }),
    );

    events.push({
      type: 'mouse',
      eventType: 'press',
      button: 'left',
      column: x + 1,
      row: y + 1,
      ctrl: false,
      alt: false,
      shift: false,
    });
    events.push({
      type: 'mouse',
      eventType: 'release',
      button: 'none',
      column: x + 1,
      row: y + 1,
      ctrl: false,
      alt: false,
      shift: false,
    });
    events.push({
      type: 'mouse',
      eventType: 'wheel',
      button: index % 2 === 0 ? 'wheel-down' : 'wheel-right',
      column: x + 1,
      row: y + 1,
      ctrl: false,
      alt: false,
      shift: false,
    });
    events.push({
      type: 'key',
      key: index % 2 === 0 ? 'Tab' : 'Enter',
      code: index % 2 === 0 ? 'Tab' : 'Enter',
      ctrl: false,
      alt: false,
      shift: false,
    });
    events.push({type: 'paste', text: `payload-${index}`});
  }

  dispatcher.setLayoutRoot(
    createBox(document, {
      element: document.body,
      x: 0,
      y: 0,
      width: columnCount,
      height: rowCount,
      children: rootChildren,
    }),
  );

  return {
    dispatch() {
      dispatcher.dispatchAll(events);
    },
  };
}

const typicalScenario = createScenario(80, 24, 12);
const largeScenario = createScenario(120, 32, 24);

describe('EventDispatcher', () => {
  bench('dispatches a typical mixed terminal input burst into DOM events', () => {
    typicalScenario.dispatch();
  });

  bench('dispatches a large mixed terminal input burst into DOM events', () => {
    largeScenario.dispatch();
  });
});
