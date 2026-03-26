import {describe, it} from 'vitest';

import {Window} from '../../classes/Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('setupElement', () => {
  it.todo('associates the element with the owner document');
  it.todo('sets the NAME property on the element');
  it.todo('sets the NS property when a namespace is provided');
  it.todo('does not set the NS property when no namespace is given');
  it.todo('calls the createElement hook if it exists');
  it.todo('returns the same element instance');
});
