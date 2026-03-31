import {describe, expect, it} from 'vitest';

import {UiMarkdown} from '../component';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiMarkdown.tagName, UiMarkdown);

  return {window, document};
}

describe('UiMarkdown', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-markdown')).toBe(UiMarkdown);
  });

  it('renders headings from Markdown syntax', () => {
    const {document} = createEnv();
    const md = document.createElement('ui-markdown') as UiMarkdown;
    md.textContent = '# Hello\n## World';
    document.body.appendChild(md);

    expect(md.childNodes.length).toBe(2);
    expect((md.childNodes[0] as import('../../../dom').Element).localName).toBe('h1');
    expect((md.childNodes[1] as import('../../../dom').Element).localName).toBe('h2');
  });

  it('renders list items', () => {
    const {document} = createEnv();
    const md = document.createElement('ui-markdown') as UiMarkdown;
    md.textContent = '- Item 1\n- Item 2';
    document.body.appendChild(md);

    expect((md.childNodes[0] as import('../../../dom').Element).localName).toBe('li');
    expect((md.childNodes[0] as import('../../../dom').Element).textContent).toBe('Item 1');
  });

  it('renders horizontal rules', () => {
    const {document} = createEnv();
    const md = document.createElement('ui-markdown') as UiMarkdown;
    md.textContent = 'Above\n---\nBelow';
    document.body.appendChild(md);

    expect((md.childNodes[1] as import('../../../dom').Element).localName).toBe('hr');
  });

  it('renders paragraphs for plain text', () => {
    const {document} = createEnv();
    const md = document.createElement('ui-markdown') as UiMarkdown;
    md.textContent = 'Hello world';
    document.body.appendChild(md);

    expect((md.childNodes[0] as import('../../../dom').Element).localName).toBe('p');
  });
});
