import {describe, it, expect} from 'vitest';
import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('HTMLElement subclasses', () => {
  it('HTMLHtmlElement has correct localName', () => {
    const {document} = createEnv();
    expect(document.documentElement.localName).toBe('html');
    expect(document.documentElement.nodeType).toBe(1);
  });

  it('HTMLHeadElement has correct localName', () => {
    const {document} = createEnv();
    expect(document.head.localName).toBe('head');
  });

  it('HTMLBodyElement has correct localName', () => {
    const {document} = createEnv();
    expect(document.body.localName).toBe('body');
  });

  it('custom elements are created via registry', () => {
    const {window, document} = createEnv();
    class MyWidget {}
    window.customElements.define('my-widget', MyWidget as unknown as CustomElementConstructor);
    const el = document.createElement('my-widget');
    expect(el).toBeInstanceOf(MyWidget);
  });
});
