import {describe, it} from 'vitest';

import {Window} from '../../classes/Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('toNode', () => {
  it.todo('returns the node unchanged if it is already a Node instance');
  it.todo('converts a string to a text node');
  it.todo('converts a number to a text node');
  it.todo('converts null to a text node');
  it.todo('converts undefined to a text node');
});
