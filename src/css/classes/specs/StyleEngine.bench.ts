import {bench, describe} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {StyleEngine} from '../StyleEngine';

import type {Element} from '../../../dom/classes/Element';

type StyleEngineScenario = {
  engine: StyleEngine;
  mutate(): void;
};

function createScenario(cardCount: number): StyleEngineScenario {
  const window = new Window();
  const document = window.document;
  const engine = new StyleEngine();
  const titles: Element[] = [];
  const style = document.createElement('style');

  engine.attach(document);

  style.textContent = `
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 1;
      color: #e5e7eb;
    }

    .row {
      display: flex;
      gap: 1;
    }

    .card {
      display: flex;
      flex-direction: column;
      padding: 1;
      border-style: rounded;
      border-color: #7c3aed;
      background-color: #111827;
    }

    .title {
      font-weight: bold;
      color: #c4b5fd;
    }
  `;
  document.head.appendChild(style);

  const dashboard = document.createElement('div');
  dashboard.className = 'dashboard';

  for (let index = 0; index < cardCount; index += 1) {
    const row = document.createElement('div');
    row.className = 'row';

    for (let cardIndex = 0; cardIndex < 4; cardIndex += 1) {
      const card = document.createElement('div');
      card.className = 'card';
      const title = document.createElement('span');
      title.className = 'title';
      title.textContent = `Card ${index}-${cardIndex}`;
      titles.push(title);
      const body = document.createElement('span');
      body.textContent = 'Style recomputation benchmark payload';
      card.append(title, body);
      row.appendChild(card);
    }

    dashboard.appendChild(row);
  }

  document.body.appendChild(dashboard);
  engine.computeAll();

  let revision = 0;

  return {
    engine,
    mutate() {
      revision += 1;
      style.textContent = `
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 1;
          color: #e5e7eb;
        }

        .row {
          display: flex;
          gap: 1;
        }

        .card {
          display: flex;
          flex-direction: column;
          padding: ${revision % 3 === 0 ? 2 : 1};
          border-style: rounded;
          border-color: #7c3aed;
          background-color: #111827;
        }

        .title {
          font-weight: bold;
          color: ${revision % 2 === 0 ? '#c4b5fd' : '#93c5fd'};
        }
      `;
      engine.invalidateStylesheets();

      for (let index = 0; index < titles.length; index += 5) {
        titles[index]!.textContent = `Card rev ${revision}-${index}`;
      }

      engine.markAllDirty();
      engine.recomputeDirty();
      engine.clearLayoutDirty();
    },
  };
}

const smallScenario = createScenario(3);
const typicalScenario = createScenario(8);

describe('StyleEngine', () => {
  bench('recomputes a small dirty tree after stylesheet and subtree updates', () => {
    smallScenario.mutate();
  });

  bench('recomputes a typical dirty tree after stylesheet and subtree updates', () => {
    typicalScenario.mutate();
  });
});
