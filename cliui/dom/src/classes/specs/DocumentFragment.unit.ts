import {describe, it, expect} from 'vitest';
import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('DocumentFragment', () => {
  it('has correct nodeType', () => {
    const {document} = createEnv();
    const frag = document.createDocumentFragment();
    expect(frag.nodeType).toBe(11);
  });

  it('has correct nodeName', () => {
    const {document} = createEnv();
    const frag = document.createDocumentFragment();
    expect(frag.nodeName).toBe('#document-fragment');
  });

  it('can hold children', () => {
    const {document} = createEnv();
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createElement('div'));
    frag.appendChild(document.createElement('span'));
    expect(frag.childNodes.length).toBe(2);
  });

  it('empties itself when appended to a parent', () => {
    const {document} = createEnv();
    const frag = document.createDocumentFragment();
    const a = document.createElement('a');
    const b = document.createElement('b');
    frag.appendChild(a);
    frag.appendChild(b);

    const parent = document.createElement('div');
    parent.appendChild(frag);

    expect(parent.childNodes.length).toBe(2);
    expect(parent.firstChild).toBe(a);
    expect(parent.lastChild).toBe(b);
    expect(frag.childNodes.length).toBe(0);
  });

  it('supports querySelector', () => {
    const {document} = createEnv();
    const frag = document.createDocumentFragment();
    const child = document.createElement('span');
    child.setAttribute('class', 'target');
    frag.appendChild(child);
    expect(frag.querySelector('.target')).toBe(child);
  });
});
