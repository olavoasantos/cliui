import {bench, describe} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {CSSParser} from '../CSSParser';
import {SelectorMatcher} from '../SelectorMatcher';

import type {Element} from '../../../dom/classes/Element';

function createDeepTreeScenario(depth: number): {rules: ReturnType<CSSParser['parse']>; target: Element} {
  const document = new Window().document;
  const parser = new CSSParser();
  let current = document.body as unknown as Element;

  for (let index = 0; index < depth; index += 1) {
    const node = document.createElement('section');
    node.className = `level level-${index}`;
    current.appendChild(node);
    current = node;
  }

  const target = document.createElement('span');
  target.className = 'target active';
  target.setAttribute('data-state', 'open');
  current.appendChild(target);

  return {
    rules: parser.parse(`
      .level .target { color: red; }
      .level-0 .level-1 .level-2 .level-3 .target.active[data-state="open"] { font-weight: bold; }
      section > .target { text-align: center; }
    `),
    target,
  };
}

function createWideTreeScenario(rowCount: number, columnsPerRow: number): {
  rules: ReturnType<CSSParser['parse']>;
  target: Element;
} {
  const document = new Window().document;
  const parser = new CSSParser();
  let target!: Element;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = document.createElement('div');
    row.className = `row row-${rowIndex}`;

    for (let columnIndex = 0; columnIndex < columnsPerRow; columnIndex += 1) {
      const cell = document.createElement('span');
      cell.className = `cell cell-${columnIndex}`;

      if (rowIndex === rowCount - 1 && columnIndex === columnsPerRow - 1) {
        cell.className += ' target highlighted';
        cell.setAttribute('data-kind', 'summary');
        target = cell;
      }

      row.appendChild(cell);
    }

    document.body.appendChild(row);
  }

  return {
    rules: parser.parse(`
      .row .cell { color: #93c5fd; }
      .row-11 > .target.highlighted { background-color: #111827; }
      [data-kind="summary"] { font-weight: bold; }
    `),
    target,
  };
}

const matcher = new SelectorMatcher();
const deepScenario = createDeepTreeScenario(10);
const wideScenario = createWideTreeScenario(12, 24);

describe('SelectorMatcher', () => {
  bench('matches selectors against a deep DOM tree', () => {
    matcher.match(deepScenario.rules, deepScenario.target);
  });

  bench('matches selectors against a wide DOM tree', () => {
    matcher.match(wideScenario.rules, wideScenario.target);
  });
});
