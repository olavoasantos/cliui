import {bench, describe} from 'vitest';

import {Window} from '../Window';

import type {Element} from '../Element';

function createTextContentUpdateScenario(elementCount: number): {update(): void} {
  const document = new Window().document;
  const container = document.createElement('section');
  const elements: Element[] = [];
  let revision = 0;

  for (let index = 0; index < elementCount; index += 1) {
    const title = document.createElement('div');
    title.textContent = `Metric ${index}`;
    container.appendChild(title);
    elements.push(title);
  }

  document.body.appendChild(container);

  return {
    update() {
      revision = (revision + 1) % 1000;

      for (let index = 0; index < elements.length; index += 3) {
        elements[index]!.textContent = `Metric ${index} rev ${revision}`;
      }
    },
  };
}

const typicalScenario = createTextContentUpdateScenario(24);
const largeScenario = createTextContentUpdateScenario(96);

describe('Node', () => {
  bench('updates textContent across a typical batch of single-text elements', () => {
    typicalScenario.update();
  });

  bench('updates textContent across a large batch of single-text elements', () => {
    largeScenario.update();
  });
});
