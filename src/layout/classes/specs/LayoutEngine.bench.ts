import {bench, describe} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {StyleEngine} from '../../../css/classes/StyleEngine';
import {LayoutEngine} from '../LayoutEngine';

import type {Document} from '../../../dom/classes/Document';

type LayoutScenario = {
  layout(): void;
};

function populateDocument(document: Document, rowCount: number, cardsPerRow: number): void {
  const style = document.createElement('style');

  style.textContent = `
    body {
      display: flex;
      flex-direction: column;
      padding: 1;
      row-gap: 1;
    }

    .dashboard {
      display: flex;
      flex-direction: column;
      row-gap: 1;
      width: 100%;
    }

    .row {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      column-gap: 1;
      row-gap: 1;
      width: 100%;
    }

    .card {
      display: flex;
      flex-direction: column;
      width: 24%;
      min-height: 5;
      padding: 1;
      border-style: rounded;
      row-gap: 1;
    }

    .title {
      display: inline;
      width: 100%;
    }

    .meta {
      display: inline;
      width: 100%;
    }

    .details {
      display: inline;
      width: 100%;
    }
  `;
  document.head.appendChild(style);

  const dashboard = document.createElement('section');
  dashboard.className = 'dashboard';

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = document.createElement('div');
    row.className = 'row';

    for (let cardIndex = 0; cardIndex < cardsPerRow; cardIndex += 1) {
      const card = document.createElement('article');
      card.className = 'card';

      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = `Service ${rowIndex}-${cardIndex}`;

      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = `CPU ${(rowIndex + 2) * (cardIndex + 3)}% MEM ${(rowIndex + 1) * 8}MB`;

      const details = document.createElement('span');
      details.className = 'details';
      details.textContent =
        'Terminal layout benchmark payload with wrapping text, percentage sizing, and nested flex rows.';

      card.append(title, meta, details);
      row.appendChild(card);
    }

    dashboard.appendChild(row);
  }

  const floating = document.createElement('aside');
  floating.textContent = 'floating overlay';
  floating.style.position = 'absolute';
  floating.style.left = '2';
  floating.style.top = '1';
  floating.style.width = '18';

  document.body.append(dashboard, floating);
}

function createScenario(
  rowCount: number,
  cardsPerRow: number,
  columns: number,
  rows: number,
): LayoutScenario {
  const window = new Window();
  const document = window.document;
  const styleEngine = new StyleEngine();

  styleEngine.attach(document);
  populateDocument(document, rowCount, cardsPerRow);
  styleEngine.computeAll();

  const layoutEngine = new LayoutEngine(styleEngine);

  return {
    layout() {
      layoutEngine.layout(document.body, columns, rows);
    },
  };
}

const compactScenario = createScenario(3, 3, 80, 24);
const typicalScenario = createScenario(6, 4, 120, 32);
const largeScenario = createScenario(10, 5, 160, 48);

describe('LayoutEngine', () => {
  bench('lays out a compact dashboard at 80x24', () => {
    compactScenario.layout();
  });

  bench('lays out a typical dashboard at 120x32', () => {
    typicalScenario.layout();
  });

  bench('lays out a large dashboard at 160x48', () => {
    largeScenario.layout();
  });
});
