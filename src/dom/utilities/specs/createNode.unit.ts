import {describe, it} from 'vitest';

import {Window} from '../../classes/Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('createNode', () => {
  it.todo('sets the OWNER_DOCUMENT property on the node');
  it.todo('makes the OWNER_DOCUMENT property non-enumerable');
  it.todo('returns the same node instance');
});
