import {bench, describe} from 'vitest';

import {Window} from '../../classes/Window';
import {parseHtml} from '../parseHtml';

function createHtml(sectionCount: number, cardCount: number): string {
  const sections: string[] = [];

  for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
    const cards: string[] = [];

    for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
      cards.push(
        `<article class="card${cardIndex % 2 === 0 ? ' card--active' : ''}" data-card="${sectionIndex}-${cardIndex}">` +
          `<h2>Service ${sectionIndex}-${cardIndex}</h2>` +
          `<p>Latency ${sectionIndex + cardIndex}ms</p>` +
          `<span data-state="${cardIndex % 3 === 0 ? 'warn' : 'ok'}">${cardIndex % 3 === 0 ? 'Warn' : 'Ok'}</span>` +
          `<!-- card ${sectionIndex}-${cardIndex} -->` +
          `</article>`,
      );
    }

    sections.push(`<section data-section="${sectionIndex}">${cards.join('')}</section>`);
  }

  return `<div class="dashboard">${sections.join('')}</div>`;
}

function createScenario(sectionCount: number, cardCount: number): {parse(): void} {
  const document = new Window().document;
  const html = createHtml(sectionCount, cardCount);

  return {
    parse() {
      parseHtml(html, document.body);
    },
  };
}

const fragmentScenario = createScenario(8, 6);
const documentSizedScenario = createScenario(20, 10);

describe('parseHtml', () => {
  bench('parses a realistic fragment-sized dashboard payload', () => {
    fragmentScenario.parse();
  });

  bench('parses a realistic document-sized dashboard payload', () => {
    documentSizedScenario.parse();
  });
});
