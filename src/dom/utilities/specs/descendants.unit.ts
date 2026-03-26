import {describe, it} from 'vitest';

import {Window} from '../../classes/Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('descendants', () => {
  it.todo('returns empty array for a node with no children');
  it.todo('returns direct children for a single level of nesting');
  it.todo('returns nodes in depth-first order for multi-level trees');
  it.todo('does not include the root node in the result');
});
