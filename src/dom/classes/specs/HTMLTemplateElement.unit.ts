import {describe, it, expect} from 'vitest';
import {Window} from '../Window';
import type {HTMLTemplateElement} from '../HTMLTemplateElement';
import {NodeType} from '../../constants';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('HTMLTemplateElement', () => {
  it('creates a template element', () => {
    const {document} = createEnv();
    const el = document.createElement('template') as HTMLTemplateElement;
    expect(el.localName).toBe('template');
  });

  it('has a content property that is a DocumentFragment', () => {
    const {document} = createEnv();
    const el = document.createElement('template') as HTMLTemplateElement;
    expect(el.content.nodeType).toBe(NodeType.DOCUMENT_FRAGMENT_NODE);
  });

  it('content is lazily created', () => {
    const {document} = createEnv();
    const el = document.createElement('template') as HTMLTemplateElement;
    const content1 = el.content;
    const content2 = el.content;
    expect(content1).toBe(content2);
  });

  it('innerHTML sets content', () => {
    const {document} = createEnv();
    const el = document.createElement('template') as HTMLTemplateElement;
    el.innerHTML = '<div>test</div>';
    expect(el.content.childNodes.length).toBe(1);
    expect(el.content.firstChild?.nodeName).toBe('DIV');
  });

  it('innerHTML reads from content', () => {
    const {document} = createEnv();
    const el = document.createElement('template') as HTMLTemplateElement;
    el.innerHTML = '<span>hello</span>';
    expect(el.innerHTML).toBe('<span>hello</span>');
  });

  it('innerHTML returns empty string when no content set', () => {
    const {document} = createEnv();
    const el = document.createElement('template') as HTMLTemplateElement;
    expect(el.innerHTML).toBe('');
  });
});
