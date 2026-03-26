import {describe, it} from 'vitest';

import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('Text', () => {
  describe('properties', () => {
    it.todo('has nodeType TEXT_NODE');
    it.todo('has nodeName #text');
  });

  describe('constructor', () => {
    it.todo('creates a text node with the given data');
    it.todo('creates a text node with empty data when omitted');
  });
});
