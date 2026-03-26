import {describe, it} from 'vitest';

import {Window} from '../../classes/Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('selfAndDescendants', () => {
  it.todo('returns array containing only the node when it has no children');
  it.todo('includes the node as the first element');
  it.todo('includes all descendants after the node in depth-first order');
});
