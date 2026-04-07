import {beforeEach, describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {parseDocument} from '../parseDocument';

import type {Document} from '../../classes/Document';
import type {Element} from '../../classes/Element';

describe('parseDocument', () => {
  let document: Document;

  beforeEach(() => {
    document = new Window().document;
  });

  describe('full document structure', () => {
    it('parses a complete HTML document with all structural tags', () => {
      parseDocument(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Test</title>
          </head>
          <body>
            <div>Hello</div>
          </body>
        </html>`,
        document,
      );

      expect(document.head.querySelector('title')).not.toBeNull();
      expect(document.head.querySelector('title')!.textContent).toBe('Test');
      expect(document.body.querySelector('div')).not.toBeNull();
      expect(document.body.querySelector('div')!.textContent).toBe('Hello');
    });

    it('skips DOCTYPE without creating a DOM node', () => {
      const childCountBefore = document.childNodes.length;
      parseDocument('<!DOCTYPE html><html><head></head><body></body></html>', document);
      // Document should still have only documentElement as child
      expect(document.childNodes.length).toBe(childCountBefore);
    });

    it('handles DOCTYPE with extra attributes', () => {
      parseDocument(
        '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><body><p>ok</p></body></html>',
        document,
      );
      expect(document.body.querySelector('p')!.textContent).toBe('ok');
    });
  });

  describe('attributes on structural elements', () => {
    it('applies attributes to <html>', () => {
      parseDocument('<html lang="en" data-theme="dark"><body></body></html>', document);
      expect(document.documentElement.getAttribute('lang')).toBe('en');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('applies attributes to <head>', () => {
      parseDocument('<html><head data-custom="value"></head><body></body></html>', document);
      expect(document.head.getAttribute('data-custom')).toBe('value');
    });

    it('applies class attribute to <body>', () => {
      parseDocument('<html><head></head><body class="dark"></body></html>', document);
      expect(document.body.getAttribute('class')).toBe('dark');
    });

    it('applies id attribute to <body>', () => {
      parseDocument('<html><head></head><body id="root"></body></html>', document);
      expect(document.body.getAttribute('id')).toBe('root');
    });

    it('applies multiple attributes to <body>', () => {
      parseDocument(
        '<html><head></head><body class="app" data-mode="dev" tabindex="0"></body></html>',
        document,
      );
      expect(document.body.getAttribute('class')).toBe('app');
      expect(document.body.getAttribute('data-mode')).toBe('dev');
      expect(document.body.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('head content', () => {
    it('appends style elements to head', () => {
      parseDocument(
        `<html>
          <head>
            <style>.app { color: red; }</style>
          </head>
          <body></body>
        </html>`,
        document,
      );

      const style = document.head.querySelector('style');
      expect(style).not.toBeNull();
      expect(style!.textContent).toBe('.app { color: red; }');
    });

    it('appends multiple elements to head', () => {
      parseDocument(
        `<html>
          <head>
            <title>Page</title>
            <style>body { margin: 0; }</style>
          </head>
          <body></body>
        </html>`,
        document,
      );

      expect(document.head.querySelector('title')).not.toBeNull();
      expect(document.head.querySelector('style')).not.toBeNull();
    });

    it('supports meta-like elements in head', () => {
      parseDocument('<html><head><meta charset="utf-8" /></head><body></body></html>', document);

      const meta = document.head.querySelector('meta');
      expect(meta).not.toBeNull();
      expect(meta!.getAttribute('charset')).toBe('utf-8');
    });
  });

  describe('body content', () => {
    it('appends elements to body', () => {
      parseDocument(
        `<html>
          <head></head>
          <body>
            <div class="container">
              <span>Hello</span>
            </div>
          </body>
        </html>`,
        document,
      );

      const container = document.body.querySelector('.container');
      expect(container).not.toBeNull();
      expect(container!.querySelector('span')!.textContent).toBe('Hello');
    });

    it('preserves nested structure', () => {
      parseDocument(
        '<html><head></head><body><div><ul><li>A</li><li>B</li></ul></div></body></html>',
        document,
      );

      const items = document.body.querySelectorAll('li');
      expect(items).toHaveLength(2);
      expect(items[0]!.textContent).toBe('A');
      expect(items[1]!.textContent).toBe('B');
    });

    it('handles text nodes in body', () => {
      parseDocument('<html><head></head><body>Plain text</body></html>', document);
      expect(document.body.textContent).toContain('Plain text');
    });
  });

  describe('comments', () => {
    it('preserves comments in head', () => {
      parseDocument('<html><head><!-- head comment --></head><body></body></html>', document);

      const hasComment = Array.from(document.head.childNodes).some(
        (node) => node.nodeType === 8 && node.textContent === ' head comment ',
      );
      expect(hasComment).toBe(true);
    });

    it('preserves comments in body', () => {
      parseDocument(
        '<html><head></head><body><!-- body comment --><div>content</div></body></html>',
        document,
      );

      const hasComment = Array.from(document.body.childNodes).some(
        (node) => node.nodeType === 8 && node.textContent === ' body comment ',
      );
      expect(hasComment).toBe(true);
    });
  });

  describe('missing structural tags', () => {
    it('appends bare fragment to body when no structural tags present', () => {
      parseDocument('<div>Hello</div><span>World</span>', document);

      expect(document.body.querySelector('div')!.textContent).toBe('Hello');
      expect(document.body.querySelector('span')!.textContent).toBe('World');
    });

    it('handles content without html/head/body tags', () => {
      parseDocument('<p>Just a paragraph</p>', document);
      expect(document.body.querySelector('p')!.textContent).toBe('Just a paragraph');
    });

    it('handles plain text without any tags', () => {
      parseDocument('Hello, World!', document);
      expect(document.body.textContent).toContain('Hello, World!');
    });

    it('handles content with only html and body (no head)', () => {
      parseDocument('<html><body><div>content</div></body></html>', document);
      expect(document.body.querySelector('div')!.textContent).toBe('content');
    });

    it('handles content with only body (no html or head)', () => {
      parseDocument('<body><div>content</div></body>', document);
      expect(document.body.querySelector('div')!.textContent).toBe('content');
    });
  });

  describe('stray content', () => {
    it('appends content outside head/body but inside html to body', () => {
      parseDocument(
        '<html><head></head><div>stray</div><body><p>in body</p></body></html>',
        document,
      );

      // The stray div should end up in body
      expect(document.body.querySelector('div')!.textContent).toBe('stray');
      expect(document.body.querySelector('p')!.textContent).toBe('in body');
    });

    it('appends content between head and body to body', () => {
      parseDocument(
        '<html><head><title>T</title></head><span>between</span><body><div>in body</div></body></html>',
        document,
      );

      expect(document.body.querySelector('span')!.textContent).toBe('between');
      expect(document.body.querySelector('div')!.textContent).toBe('in body');
    });
  });

  describe('does not duplicate structural elements', () => {
    it('does not create additional html elements', () => {
      parseDocument('<html><head></head><body></body></html>', document);
      // Document should have exactly one child: documentElement
      const htmlElements = Array.from(document.childNodes).filter(
        (n) => (n as Element).localName === 'html',
      );
      expect(htmlElements).toHaveLength(1);
    });

    it('does not create additional head elements', () => {
      parseDocument('<html><head></head><body></body></html>', document);
      const headElements = document.documentElement.querySelectorAll('head');
      expect(headElements).toHaveLength(1);
    });

    it('does not create additional body elements', () => {
      parseDocument('<html><head></head><body></body></html>', document);
      const bodyElements = document.documentElement.querySelectorAll('body');
      expect(bodyElements).toHaveLength(1);
    });
  });

  describe('complex documents', () => {
    it('parses the milestone example document', () => {
      parseDocument(
        `<!DOCTYPE html>
        <html>
          <head>
            <link rel="stylesheet" href="./styles.css" />
            <style>
              .status { color: #93c5fd; }
            </style>
          </head>
          <body>
            <div class="app">
              <div class="header">My Terminal App</div>
              <div class="status" id="status">Loading...</div>
            </div>
            <script type="module" src="./app.ts"></script>
          </body>
        </html>`,
        document,
      );

      // Head elements
      const link = document.head.querySelector('link') as Element;
      expect(link).not.toBeNull();
      expect(link.getAttribute('rel')).toBe('stylesheet');
      expect(link.getAttribute('href')).toBe('./styles.css');

      const style = document.head.querySelector('style');
      expect(style).not.toBeNull();
      expect(style!.textContent).toContain('.status');

      // Body elements
      const app = document.body.querySelector('.app');
      expect(app).not.toBeNull();

      const header = document.body.querySelector('.header');
      expect(header).not.toBeNull();
      expect(header!.textContent).toBe('My Terminal App');

      const status = document.body.querySelector('#status');
      expect(status).not.toBeNull();
      expect(status!.textContent).toBe('Loading...');

      const script = document.body.querySelector('script') as Element;
      expect(script).not.toBeNull();
      expect(script.getAttribute('type')).toBe('module');
      expect(script.getAttribute('src')).toBe('./app.ts');
    });

    it('handles multiple style blocks', () => {
      parseDocument(
        `<html>
          <head>
            <style>.a { color: red; }</style>
            <style>.b { color: blue; }</style>
          </head>
          <body>
            <style>.c { color: green; }</style>
          </body>
        </html>`,
        document,
      );

      const headStyles = document.head.querySelectorAll('style');
      expect(headStyles).toHaveLength(2);

      const bodyStyles = document.body.querySelectorAll('style');
      expect(bodyStyles).toHaveLength(1);
    });

    it('handles script elements with content', () => {
      parseDocument(
        '<html><head></head><body><script>console.log("hello")</script></body></html>',
        document,
      );

      const script = document.body.querySelector('script');
      expect(script).not.toBeNull();
      expect(script!.textContent).toBe('console.log("hello")');
    });

    it('handles deeply nested structures', () => {
      parseDocument(
        `<html>
          <head></head>
          <body>
            <div>
              <div>
                <div>
                  <span>deep</span>
                </div>
              </div>
            </div>
          </body>
        </html>`,
        document,
      );

      const span = document.body.querySelector('span');
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe('deep');
    });
  });

  describe('whitespace handling', () => {
    it('strips whitespace-only text nodes between elements', () => {
      parseDocument(
        `<html>
          <head></head>
          <body>
            <div>
              <div>A</div>
              <div>B</div>
            </div>
          </body>
        </html>`,
        document,
      );

      const wrapper = document.body.querySelector('div')!;
      // Should have exactly 2 element children, no whitespace text nodes
      expect(wrapper.childNodes).toHaveLength(2);
      expect(wrapper.childNodes[0]!.textContent).toBe('A');
      expect(wrapper.childNodes[1]!.textContent).toBe('B');
    });

    it('preserves non-whitespace text content', () => {
      parseDocument(
        `<html>
          <head></head>
          <body>
            <div>Hello World</div>
          </body>
        </html>`,
        document,
      );

      expect(document.body.querySelector('div')!.textContent).toBe('Hello World');
    });

    it('preserves text with internal whitespace', () => {
      parseDocument(
        '<html><head></head><body><div>Multiple   spaces   here</div></body></html>',
        document,
      );

      expect(document.body.querySelector('div')!.textContent).toBe('Multiple   spaces   here');
    });
  });

  describe('void elements', () => {
    it('handles self-closing link elements correctly', () => {
      parseDocument(
        '<html><head><link rel="stylesheet" href="./styles.css" /><style>.a { color: red; }</style></head><body></body></html>',
        document,
      );

      const link = document.head.querySelector('link');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('rel')).toBe('stylesheet');

      // The style element should be a sibling of link, not a child
      const style = document.head.querySelector('style');
      expect(style).not.toBeNull();
      expect(style!.textContent).toBe('.a { color: red; }');
    });

    it('handles meta elements as void', () => {
      parseDocument(
        '<html><head><meta charset="utf-8"><title>Test</title></head><body></body></html>',
        document,
      );

      const meta = document.head.querySelector('meta');
      expect(meta).not.toBeNull();
      const title = document.head.querySelector('title');
      expect(title).not.toBeNull();
      expect(title!.textContent).toBe('Test');
    });

    it('handles img elements as void', () => {
      parseDocument(
        '<html><head></head><body><img src="test.png" alt="test"><span>after</span></body></html>',
        document,
      );

      const img = document.body.querySelector('img');
      expect(img).not.toBeNull();
      // span should be a sibling of img, not a child
      const span = document.body.querySelector('span');
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe('after');
    });

    it('handles br elements as void', () => {
      parseDocument('<html><head></head><body><p>before<br>after</p></body></html>', document);

      const p = document.body.querySelector('p');
      expect(p).not.toBeNull();
      expect(p!.querySelector('br')).not.toBeNull();
      expect(p!.textContent).toContain('after');
    });

    it('handles input elements as void', () => {
      parseDocument(
        '<html><head></head><body><input type="text"><span>next</span></body></html>',
        document,
      );

      const input = document.body.querySelector('input');
      expect(input).not.toBeNull();
      const span = document.body.querySelector('span');
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe('next');
    });
  });

  describe('existing parseHtml is not affected', () => {
    it('parseDocument is a separate utility', async () => {
      // Import both to verify they coexist
      const {parseHtml} = await import('../parseHtml');

      // parseHtml still works for fragments
      const container = document.createElement('div');
      const fragment = parseHtml('<span>test</span>', container);
      expect(fragment.childNodes).toHaveLength(1);

      // parseDocument populates the document
      parseDocument('<html><head></head><body><p>doc</p></body></html>', document);
      expect(document.body.querySelector('p')!.textContent).toBe('doc');
    });
  });
});
