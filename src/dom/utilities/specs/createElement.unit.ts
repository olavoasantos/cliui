import {describe, it} from 'vitest';

import {Window} from '../../classes/Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('createElement', () => {
  it.todo('creates an SVGElement when namespace is SVG');
  it.todo('creates an HTMLTemplateElement for template tag');
  it.todo('creates an HTMLStyleElement for style tag');
  it.todo('creates a custom element instance when one is registered');
  it.todo('creates a plain Element for unknown tag names');
  it.todo('lowercases the name for built-in element matching');
  it.todo('associates the element with the owner document');
});
