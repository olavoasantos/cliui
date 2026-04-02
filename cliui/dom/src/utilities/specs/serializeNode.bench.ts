import {bench, describe} from 'vitest';

import {Window} from '../../classes/Window';
import {serializeNode} from '../serializeNode';

function createScenario(sectionCount: number, cardCount: number): {serialize(): void} {
  const document = new Window().document;
  const root = document.createElement('div');
  root.className = 'dashboard';

  for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
    const section = document.createElement('section');
    section.setAttribute('data-section', `${sectionIndex}`);

    for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
      const card = document.createElement('article');
      card.className = cardIndex % 2 === 0 ? 'card card--active' : 'card';
      card.setAttribute('data-card', `${sectionIndex}-${cardIndex}`);

      const title = document.createElement('h2');
      title.textContent = `Service ${sectionIndex}-${cardIndex}`;

      const content = document.createElement('p');
      content.textContent =
        'Serialization benchmark payload with nested elements, text, and escaping for <>&" characters.';

      const note = document.createComment(`card ${sectionIndex}-${cardIndex}`);

      card.append(title, content, note);
      section.appendChild(card);
    }

    root.appendChild(section);
  }

  return {
    serialize() {
      serializeNode(root);
    },
  };
}

const mediumScenario = createScenario(10, 6);
const largeScenario = createScenario(20, 10);

describe('serializeNode', () => {
  bench('serializes a medium DOM subtree with nested dashboard cards', () => {
    mediumScenario.serialize();
  });

  bench('serializes a large DOM subtree with nested dashboard cards', () => {
    largeScenario.serialize();
  });
});
