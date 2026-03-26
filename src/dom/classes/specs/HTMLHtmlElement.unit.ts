import {describe, it} from 'vitest';

import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('HTMLHtmlElement', () => {
  it.todo('is created as the document element');
  it.todo('is an instance of Element');
  it.todo('has localName html');
});
