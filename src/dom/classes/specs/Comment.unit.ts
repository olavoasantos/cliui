import {describe, it} from 'vitest';

import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('Comment', () => {
  describe('properties', () => {
    it.todo('has nodeType COMMENT_NODE');
    it.todo('has nodeName #comment');
  });

  describe('constructor', () => {
    it.todo('creates a comment node with the given data');
    it.todo('creates a comment node with empty data when omitted');
  });
});
