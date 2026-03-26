import {describe, it, expect} from 'vitest';
import {Window} from '../Window';
import type {Element} from '../Element';
import {NodeType} from '../../constants';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('Document', () => {
  describe('basic properties', () => {
    it('has correct nodeType', () => {
      const {document} = createEnv();
      expect(document.nodeType).toBe(NodeType.DOCUMENT_NODE);
    });

    it('has correct nodeName', () => {
      const {document} = createEnv();
      expect(document.nodeName).toBe('#DOCUMENT');
    });

    it('isConnected is true', () => {
      const {document} = createEnv();
      expect(document.isConnected).toBe(true);
    });

    it('has a defaultView', () => {
      const {window, document} = createEnv();
      expect(document.defaultView).toBe(window);
    });

    it('ownerDocument is itself', () => {
      const {document} = createEnv();
      expect(document.ownerDocument).toBe(document);
    });
  });

  describe('document structure', () => {
    it('has a documentElement (html)', () => {
      const {document} = createEnv();
      expect(document.documentElement).toBeDefined();
      expect(document.documentElement.localName).toBe('html');
    });

    it('has a head element', () => {
      const {document} = createEnv();
      expect(document.head).toBeDefined();
      expect(document.head.localName).toBe('head');
    });

    it('has a body element', () => {
      const {document} = createEnv();
      expect(document.body).toBeDefined();
      expect(document.body.localName).toBe('body');
    });

    it('head and body are children of documentElement', () => {
      const {document} = createEnv();
      expect(document.documentElement.childNodes.length).toBe(2);
      expect(document.documentElement.firstChild).toBe(document.head);
      expect(document.documentElement.lastChild).toBe(document.body);
    });
  });

  describe('createElement', () => {
    it('creates an element with the given tag name', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.localName).toBe('div');
      expect(el.nodeName).toBe('DIV');
      expect(el.nodeType).toBe(NodeType.ELEMENT_NODE);
    });

    it('created element has ownerDocument', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.ownerDocument).toBe(document);
    });

    it('creates a template element for "template" tag', () => {
      const {document} = createEnv();
      const el = document.createElement('template');
      expect(el.localName).toBe('template');
      expect(el).toHaveProperty('content');
    });
  });

  describe('createElementNS', () => {
    it('creates an SVG element with SVG namespace', () => {
      const {document} = createEnv();
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      expect(el.localName).toBe('circle');
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
    });
  });

  describe('createTextNode', () => {
    it('creates a text node', () => {
      const {document} = createEnv();
      const text = document.createTextNode('hello');
      expect(text.data).toBe('hello');
      expect(text.nodeType).toBe(NodeType.TEXT_NODE);
      expect(text.ownerDocument).toBe(document);
    });
  });

  describe('createComment', () => {
    it('creates a comment node', () => {
      const {document} = createEnv();
      const comment = document.createComment('test');
      expect(comment.data).toBe('test');
      expect(comment.nodeType).toBe(NodeType.COMMENT_NODE);
      expect(comment.ownerDocument).toBe(document);
    });
  });

  describe('createDocumentFragment', () => {
    it('creates a document fragment', () => {
      const {document} = createEnv();
      const frag = document.createDocumentFragment();
      expect(frag.nodeType).toBe(NodeType.DOCUMENT_FRAGMENT_NODE);
      expect(frag.ownerDocument).toBe(document);
    });
  });

  describe('createEvent', () => {
    it('creates an empty event', () => {
      const {document} = createEnv();
      const event = document.createEvent();
      expect(event.type).toBe('');
    });
  });

  describe('importNode', () => {
    it('imports a node from another document (shallow)', () => {
      const env1 = createEnv();
      const env2 = createEnv();
      const el = env1.document.createElement('div');
      el.appendChild(env1.document.createElement('span'));

      const imported = env2.document.importNode(el, false) as Element;
      expect(imported.ownerDocument).toBe(env2.document);
      expect(imported.nodeName).toBe('DIV');
      expect(imported.childNodes.length).toBe(0);
    });

    it('imports a node from another document (deep)', () => {
      const env1 = createEnv();
      const env2 = createEnv();
      const el = env1.document.createElement('div');
      el.appendChild(env1.document.createElement('span'));

      const imported = env2.document.importNode(el, true) as Element;
      expect(imported.ownerDocument).toBe(env2.document);
      expect(imported.childNodes.length).toBe(1);
    });
  });

  describe('adoptNode', () => {
    it('adopts a node from another document', () => {
      const env1 = createEnv();
      const env2 = createEnv();
      const el = env1.document.createElement('div');

      const adopted = env2.document.adoptNode(el);
      expect(adopted).toBe(el);
      expect(adopted.ownerDocument).toBe(env2.document);
    });

    it('removes node from previous parent when adopting', () => {
      const env1 = createEnv();
      const env2 = createEnv();
      const parent = env1.document.createElement('div');
      const child = env1.document.createElement('span');
      parent.appendChild(child);

      env2.document.adoptNode(child);
      expect(parent.childNodes.length).toBe(0);
      expect(child.parentNode).toBeNull();
      expect(child.ownerDocument).toBe(env2.document);
    });

    it('returns same node when already owned', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      const result = document.adoptNode(el);
      expect(result).toBe(el);
    });

    it('adopts children recursively', () => {
      const env1 = createEnv();
      const env2 = createEnv();
      const parent = env1.document.createElement('div');
      const child = env1.document.createElement('span');
      parent.appendChild(child);

      env2.document.adoptNode(parent);
      expect(child.ownerDocument).toBe(env2.document);
    });
  });

  describe('querySelector / querySelectorAll on document', () => {
    it('finds elements in the document tree', () => {
      const {document} = createEnv();
      const div = document.createElement('div');
      div.setAttribute('id', 'test');
      document.body.appendChild(div);
      expect(document.querySelector('#test')).toBe(div);
    });

    it('finds all matching elements', () => {
      const {document} = createEnv();
      document.body.appendChild(document.createElement('span'));
      document.body.appendChild(document.createElement('span'));
      const result = document.querySelectorAll('span');
      expect(result.length).toBe(2);
    });
  });

  describe('focus management', () => {
    it('defaults activeElement to document.body', () => {
      const {document} = createEnv();

      expect(document.activeElement).toBe(document.body);
    });

    it('dispatches blur/focusout and focus/focusin when the active element changes', () => {
      const {document} = createEnv();
      const first = document.createElement('button');
      const second = document.createElement('input');
      const events: string[] = [];

      first.setAttribute('tabindex', '0');
      second.setAttribute('tabindex', '0');
      document.body.appendChild(first);
      document.body.appendChild(second);

      first.addEventListener('blur', () => {
        events.push('first:blur');
      });
      first.addEventListener('focusout', () => {
        events.push('first:focusout');
      });
      second.addEventListener('focus', () => {
        events.push('second:focus');
      });
      second.addEventListener('focusin', () => {
        events.push('second:focusin');
      });
      document.body.addEventListener('focusout', () => {
        events.push('body:focusout');
      });
      document.body.addEventListener('focusin', () => {
        events.push('body:focusin');
      });

      document.setActiveElement(first);
      events.length = 0;
      document.setActiveElement(second);

      expect(document.activeElement).toBe(second);
      expect(events).toEqual([
        'first:blur',
        'first:focusout',
        'body:focusout',
        'second:focus',
        'second:focusin',
        'body:focusin',
      ]);
    });
  });
});
