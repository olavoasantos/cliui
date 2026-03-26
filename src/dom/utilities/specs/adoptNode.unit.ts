import {describe, it} from 'vitest';

import {Window} from '../../classes/Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('adoptNode', () => {
  it.todo('sets the ownerDocument of the node to the new document');
  it.todo('recursively sets ownerDocument on all child nodes');
  it.todo('does not recurse into children for non-ParentNode types');
  it.todo('handles deeply nested subtrees');
});
