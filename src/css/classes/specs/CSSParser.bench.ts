import {bench, describe} from 'vitest';

import {CSSParser} from '../CSSParser';

function createStylesheet(ruleCount: number): string {
  const rules: string[] = [];

  for (let index = 0; index < ruleCount; index += 1) {
    rules.push(`
      .card-${index}, .panel-${index} > .title-${index} {
        color: rgb(${(index * 23) % 255}, ${(index * 47) % 255}, ${(index * 71) % 255});
        background-color: #111827;
        padding: 1 2;
        margin: ${index % 3} ${index % 5};
        border-style: rounded;
      }
    `);
  }

  return rules.join('\n');
}

const parser = new CSSParser();
const smallStylesheet = createStylesheet(8);
const typicalStylesheet = createStylesheet(40);
const largeStylesheet = createStylesheet(160);

describe('CSSParser', () => {
  bench('parses a small stylesheet', () => {
    parser.parse(smallStylesheet);
  });

  bench('parses a typical stylesheet', () => {
    parser.parse(typicalStylesheet);
  });

  bench('parses a large stylesheet', () => {
    parser.parse(largeStylesheet);
  });
});
