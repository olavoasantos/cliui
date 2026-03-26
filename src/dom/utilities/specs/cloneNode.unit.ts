import {describe, it} from 'vitest';

import {Window} from '../../classes/Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('cloneNode', () => {
  describe('text node', () => {
    it.todo('clones preserving data');
  });

  describe('comment node', () => {
    it.todo('clones preserving data');
  });

  describe('element', () => {
    it.todo('clones with the correct localName');
    it.todo('copies all attributes to the clone');
    it.todo('recursively clones children when deep is true');
    it.todo('does not clone children when deep is false');
  });

  describe('document fragment', () => {
    it.todo('creates a new fragment');
    it.todo('recursively clones children when deep is true');
    it.todo('creates an empty fragment when deep is false');
  });

  describe('cross-document cloning', () => {
    it.todo('clones into a different document when specified');
    it.todo('uses the node own ownerDocument when document is omitted');
  });
});
