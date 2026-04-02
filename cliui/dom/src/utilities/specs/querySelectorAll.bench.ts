import {bench, describe} from 'vitest';

import {Window} from '../../classes/Window';
import {querySelectorAll} from '../querySelectorAll';

function populateTree(document: Window['document'], sectionCount: number, cardCount: number): void {
  for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
    const section = document.createElement('section');
    section.className = `dashboard-section section-${sectionIndex}`;
    section.setAttribute('data-section', `${sectionIndex}`);

    for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
      const card = document.createElement('article');
      card.className = cardIndex % 2 === 0 ? 'card card--active' : 'card';
      card.setAttribute('data-card', `${sectionIndex}-${cardIndex}`);

      const title = document.createElement('h2');
      title.className = 'title';
      title.textContent = `Service ${sectionIndex}-${cardIndex}`;

      const status = document.createElement('span');
      status.className = cardIndex % 3 === 0 ? 'status status--warn' : 'status';
      status.setAttribute('data-state', cardIndex % 3 === 0 ? 'warn' : 'ok');
      status.textContent = cardIndex % 3 === 0 ? 'Warn' : 'Ok';

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.append(title, status);

      card.appendChild(meta);
      section.appendChild(card);
    }

    document.body.appendChild(section);
  }
}

function createScenario(sectionCount: number, cardCount: number): {run(): void} {
  const document = new Window().document;
  populateTree(document, sectionCount, cardCount);

  return {
    run() {
      querySelectorAll(
        document.body,
        'section.dashboard-section article.card span.status[data-state="warn"]',
      );
      querySelectorAll(document.body, 'article.card.card--active .title');
      querySelectorAll(document.body, '[data-card]');
    },
  };
}

const typicalScenario = createScenario(12, 8);
const largeScenario = createScenario(24, 12);

describe('querySelectorAll', () => {
  bench('queries common selectors across a typical dashboard tree', () => {
    typicalScenario.run();
  });

  bench('queries common selectors across a large dashboard tree', () => {
    largeScenario.run();
  });
});
