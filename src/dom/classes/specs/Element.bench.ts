import {bench, describe} from 'vitest';

import {Window} from '../Window';

function createMutationScenario(elementCount: number): {elements: Array<Window['document']['body'] extends infer _ ? ReturnType<Window['document']['createElement']> : never>; mutate(): void} {
  const document = new Window().document;
  const elements = [] as Array<ReturnType<typeof document.createElement>>;
  let revision = 0;

  for (let index = 0; index < elementCount; index += 1) {
    const element = document.createElement('div');
    element.className = 'card';
    element.setAttribute('data-state', 'idle');
    document.body.appendChild(element);
    elements.push(element);
  }

  return {
    elements,
    mutate() {
      revision += 1;

      for (let index = 0; index < elements.length; index += 1) {
        const element = elements[index]!;

        element.className = revision % 2 === 0 ? 'card active' : 'card muted';
        element.style.padding = `${(index % 3) + 1} ${(revision % 4) + 1}`;
        element.style.borderStyle = revision % 2 === 0 ? 'rounded' : 'double';
        if (revision % 5 === 0) {
          element.setAttribute('hidden', '');
        } else {
          element.removeAttribute('hidden');
        }
        element.setAttribute('data-state', `${revision}-${index}`);
      }
    },
  };
}

const typicalScenario = createMutationScenario(120);
const largeScenario = createMutationScenario(320);

describe('Element', () => {
  bench('mutates attributes, className, and style across a typical subtree', () => {
    typicalScenario.mutate();
  });

  bench('mutates attributes, className, and style across a large subtree', () => {
    largeScenario.mutate();
  });
});
