import {describe, it, expect, vi} from 'vitest';
import {Window} from '../Window';
import {Element} from '../Element';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('Custom element lifecycle', () => {
  describe('connectedCallback', () => {
    it('fires when a custom element is inserted into the document', () => {
      const {window, document} = createEnv();
      const connected = vi.fn();

      class MyElement extends Element {
        connectedCallback() {
          connected();
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const el = document.createElement('my-element');

      expect(connected).not.toHaveBeenCalled();
      document.body.appendChild(el);
      expect(connected).toHaveBeenCalledOnce();
    });

    it('fires on nested custom elements in depth-first order', () => {
      const {window, document} = createEnv();
      const order: string[] = [];

      class ParentEl extends Element {
        connectedCallback() {
          order.push('parent');
        }
      }

      class ChildEl extends Element {
        connectedCallback() {
          order.push('child');
        }
      }

      window.customElements.define('parent-el', ParentEl as unknown as CustomElementConstructor);
      window.customElements.define('child-el', ChildEl as unknown as CustomElementConstructor);

      const parent = document.createElement('parent-el');
      const child = document.createElement('child-el');
      parent.appendChild(child);

      document.body.appendChild(parent);
      expect(order).toEqual(['parent', 'child']);
    });

    it('does not fire when appended to a disconnected subtree', () => {
      const {window, document} = createEnv();
      const connected = vi.fn();

      class MyElement extends Element {
        connectedCallback() {
          connected();
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const container = document.createElement('div');
      const el = document.createElement('my-element');

      container.appendChild(el);
      expect(connected).not.toHaveBeenCalled();
    });

    it('fires when a disconnected subtree containing custom elements is attached to the document', () => {
      const {window, document} = createEnv();
      const connected = vi.fn();

      class MyElement extends Element {
        connectedCallback() {
          connected();
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const container = document.createElement('div');
      const el = document.createElement('my-element');
      container.appendChild(el);

      expect(connected).not.toHaveBeenCalled();
      document.body.appendChild(container);
      expect(connected).toHaveBeenCalledOnce();
    });
  });

  describe('disconnectedCallback', () => {
    it('fires when a custom element is removed from the document', () => {
      const {window, document} = createEnv();
      const disconnected = vi.fn();

      class MyElement extends Element {
        disconnectedCallback() {
          disconnected();
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const el = document.createElement('my-element');
      document.body.appendChild(el);

      expect(disconnected).not.toHaveBeenCalled();
      document.body.removeChild(el);
      expect(disconnected).toHaveBeenCalledOnce();
    });

    it('fires on nested custom elements when parent is removed', () => {
      const {window, document} = createEnv();
      const order: string[] = [];

      class ParentEl extends Element {
        disconnectedCallback() {
          order.push('parent');
        }
      }

      class ChildEl extends Element {
        disconnectedCallback() {
          order.push('child');
        }
      }

      window.customElements.define('parent-el', ParentEl as unknown as CustomElementConstructor);
      window.customElements.define('child-el', ChildEl as unknown as CustomElementConstructor);

      const parent = document.createElement('parent-el');
      const child = document.createElement('child-el');
      parent.appendChild(child);
      document.body.appendChild(parent);

      document.body.removeChild(parent);
      expect(order).toEqual(['parent', 'child']);
    });

    it('does not fire when removed from a disconnected subtree', () => {
      const {window, document} = createEnv();
      const disconnected = vi.fn();

      class MyElement extends Element {
        disconnectedCallback() {
          disconnected();
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const container = document.createElement('div');
      const el = document.createElement('my-element');
      container.appendChild(el);

      container.removeChild(el);
      expect(disconnected).not.toHaveBeenCalled();
    });
  });

  describe('attributeChangedCallback', () => {
    it('fires for attributes listed in observedAttributes', () => {
      const {window, document} = createEnv();
      const callback = vi.fn();

      class MyElement extends Element {
        static override readonly observedAttributes = ['title', 'data-value'];

        override attributeChangedCallback(
          name: string,
          oldValue: string | null,
          newValue: string | null,
        ) {
          callback(name, oldValue, newValue);
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const el = document.createElement('my-element');
      document.body.appendChild(el);

      el.setAttribute('title', 'hello');
      expect(callback).toHaveBeenCalledWith('title', null, 'hello');

      el.setAttribute('title', 'world');
      expect(callback).toHaveBeenCalledWith('title', 'hello', 'world');
    });

    it('does not fire for attributes not in observedAttributes', () => {
      const {window, document} = createEnv();
      const callback = vi.fn();

      class MyElement extends Element {
        static override readonly observedAttributes = ['title'];

        override attributeChangedCallback(
          name: string,
          oldValue: string | null,
          newValue: string | null,
        ) {
          callback(name, oldValue, newValue);
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const el = document.createElement('my-element');
      document.body.appendChild(el);

      el.setAttribute('id', 'test');
      expect(callback).not.toHaveBeenCalled();
    });

    it('fires with null newValue when attribute is removed', () => {
      const {window, document} = createEnv();
      const callback = vi.fn();

      class MyElement extends Element {
        static override readonly observedAttributes = ['title'];

        override attributeChangedCallback(
          name: string,
          oldValue: string | null,
          newValue: string | null,
        ) {
          callback(name, oldValue, newValue);
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const el = document.createElement('my-element');
      document.body.appendChild(el);

      el.setAttribute('title', 'hello');
      callback.mockClear();

      el.removeAttribute('title');
      expect(callback).toHaveBeenCalledWith('title', 'hello', null);
    });

    it('fires regardless of whether the element is connected', () => {
      const {window, document} = createEnv();
      const callback = vi.fn();

      class MyElement extends Element {
        static override readonly observedAttributes = ['title'];

        override attributeChangedCallback(
          name: string,
          oldValue: string | null,
          newValue: string | null,
        ) {
          callback(name, oldValue, newValue);
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const el = document.createElement('my-element');

      el.setAttribute('title', 'hello');
      expect(callback).toHaveBeenCalledWith('title', null, 'hello');
    });
  });

  describe('callback timing', () => {
    it('connectedCallback fires after the element is in the DOM tree', () => {
      const {window, document} = createEnv();
      let parentDuringCallback: unknown = null;

      class MyElement extends Element {
        connectedCallback() {
          parentDuringCallback = this.parentNode;
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const el = document.createElement('my-element');
      document.body.appendChild(el);

      expect(parentDuringCallback).toBe(document.body);
    });

    it('disconnectedCallback fires after the element is removed from the DOM tree', () => {
      const {window, document} = createEnv();
      let parentDuringCallback: unknown = 'not-called';

      class MyElement extends Element {
        disconnectedCallback() {
          parentDuringCallback = this.parentNode;
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const el = document.createElement('my-element');
      document.body.appendChild(el);

      document.body.removeChild(el);
      expect(parentDuringCallback).toBeNull();
    });
  });

  describe('element movement', () => {
    it('fires disconnectedCallback then connectedCallback when moving between parents', () => {
      const {window, document} = createEnv();
      const events: string[] = [];

      class MyElement extends Element {
        connectedCallback() {
          events.push('connected');
        }

        disconnectedCallback() {
          events.push('disconnected');
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const el = document.createElement('my-element');
      const containerA = document.createElement('div');
      const containerB = document.createElement('div');
      document.body.appendChild(containerA);
      document.body.appendChild(containerB);

      containerA.appendChild(el);
      expect(events).toEqual(['connected']);

      containerB.appendChild(el);
      expect(events).toEqual(['connected', 'disconnected', 'connected']);
    });
  });

  describe('upgrade', () => {
    it('upgrades existing elements when define() is called after createElement()', () => {
      const {window, document} = createEnv();
      const connected = vi.fn();

      const el = document.createElement('late-element');
      document.body.appendChild(el);

      expect(connected).not.toHaveBeenCalled();

      class LateElement extends Element {
        connectedCallback() {
          connected();
        }
      }

      window.customElements.define(
        'late-element',
        LateElement as unknown as CustomElementConstructor,
      );

      expect(el).toBeInstanceOf(LateElement);
      expect(connected).toHaveBeenCalledOnce();
    });

    it('does not call connectedCallback on manual upgrade if element is not connected', () => {
      const {window, document} = createEnv();
      const connected = vi.fn();

      const container = document.createElement('div');
      const el = document.createElement('late-element');
      container.appendChild(el);

      class LateElement extends Element {
        connectedCallback() {
          connected();
        }
      }

      window.customElements.define(
        'late-element',
        LateElement as unknown as CustomElementConstructor,
      );

      // Auto-upgrade on define() only walks the document tree, so the
      // disconnected element is not upgraded yet.
      expect(el).not.toBeInstanceOf(LateElement);

      // Manual upgrade targets the disconnected subtree.
      window.customElements.upgrade(container);
      expect(el).toBeInstanceOf(LateElement);
      expect(connected).not.toHaveBeenCalled();
    });

    it('manual upgrade() upgrades elements in a subtree', () => {
      const {window, document} = createEnv();
      const container = document.createElement('div');
      const el = document.createElement('my-widget');
      container.appendChild(el);

      class MyWidget extends Element {
        greeting() {
          return 'hello';
        }
      }

      window.customElements.define('my-widget', MyWidget as unknown as CustomElementConstructor);

      // The auto-upgrade on define() won't catch this since container is not
      // in the document. Use manual upgrade.
      window.customElements.upgrade(container);

      expect(el).toBeInstanceOf(MyWidget);
      expect((el as unknown as MyWidget).greeting()).toBe('hello');
    });

    it('does not re-upgrade elements that are already instances of the constructor', () => {
      const {window, document} = createEnv();
      const connected = vi.fn();

      class MyElement extends Element {
        connectedCallback() {
          connected();
        }
      }

      window.customElements.define('my-element', MyElement as unknown as CustomElementConstructor);
      const el = document.createElement('my-element');
      document.body.appendChild(el);

      expect(connected).toHaveBeenCalledOnce();
      connected.mockClear();

      // Manual upgrade should not re-trigger
      window.customElements.upgrade(document);
      expect(connected).not.toHaveBeenCalled();
    });
  });
});
