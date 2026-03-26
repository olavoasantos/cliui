import {describe, it} from 'vitest';

import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('HTMLHeadElement', () => {
  it.todo('is created as the head element of the document');
  it.todo('is an instance of Element');
  it.todo('has localName head');
});
