import {bench, describe} from 'vitest';

import {MutationObserver} from '../MutationObserver';
import {Window} from '../Window';

function createScenario(targetCount: number): {mutate(): void; cleanup(): void} {
  const document = new Window().document;
  const container = document.createElement('div');
  const targets: Array<ReturnType<typeof document.createElement>> = [];
  const observer = new MutationObserver(() => {});
  let revision = 0;

  document.body.appendChild(container);

  for (let index = 0; index < targetCount; index += 1) {
    const target = document.createElement('div');
    const text = document.createTextNode(`node-${index}`);
    target.appendChild(text);
    container.appendChild(target);
    targets.push(target);
  }

  observer.observe(container, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
    attributeOldValue: true,
    characterDataOldValue: true,
  });

  return {
    mutate() {
      revision += 1;

      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index]!;
        target.setAttribute('data-state', `${revision}-${index}`);
        const text = target.firstChild;

        if (text !== null) {
          text.textContent = `node-${revision}-${index}`;
        }
      }

      const badge = document.createElement('span');
      container.appendChild(badge);
      container.removeChild(badge);
      observer.takeRecords();
    },
    cleanup() {
      observer.disconnect();
      observer.takeRecords();
    },
  };
}

const typicalScenario = createScenario(80);
const largeScenario = createScenario(220);

describe('MutationObserver', () => {
  bench('batches observer records for a typical mutation burst', () => {
    typicalScenario.mutate();
  });

  bench('batches observer records for a large mutation burst', () => {
    largeScenario.mutate();
  });
});
