import {bench, describe} from 'vitest';

import {InputReader} from '../InputReader';

function parseChunks(chunks: string[]): void {
  const reader = new InputReader({});
  let count = 0;

  for (const chunk of chunks) {
    count += reader.parse(chunk).length;
  }

  void count;
}

const typicalKeyBurst = [
  'hello world',
  '\u001B[A\u001B[B\u001B[C\u001B[D',
  '\u001B[1;5C\u001B[3~\u001B[5~',
  '\u0003\u001Bx\r\t\u007F',
];

const mixedTerminalBurst = [
  '\u001B[I',
  '\u001B[<0;3;5M\u001B[<34;8;13M\u001B[<64;10;4M',
  '\u001B[200~pasted line 1\npasted line 2\u001B[201~',
  '\u001B[?2026;1$y',
  'Aa09',
  '\u001BOP\u001B[24~',
];

const fragmentedBurst = [
  '\u001B[',
  '1;5',
  'C',
  '\u001B[200~hel',
  'lo ',
  'world',
  '\u001B[201~',
  '\u001B[<0;12',
  ';8',
  'M',
  '\u001B[?',
  '2026;',
  '1$y',
  '\u001B',
  'x',
];

describe('InputReader', () => {
  bench('parses a typical burst of keyboard navigation input', () => {
    parseChunks(typicalKeyBurst);
  });

  bench('parses a mixed burst of keyboard mouse focus and paste input', () => {
    parseChunks(mixedTerminalBurst);
  });

  bench('parses fragmented escape sequences across many small chunks', () => {
    parseChunks(fragmentedBurst);
  });
});
