import {describe, expect, it} from 'vitest';
import {Window} from '../Window';
import {HTMLScriptElement} from '../HTMLScriptElement';

describe('HTMLScriptElement', () => {
  function createEnv() {
    const window = new Window();
    return {window, document: window.document};
  }

  describe('element creation', () => {
    it('creates an HTMLScriptElement via createElement', () => {
      const {document} = createEnv();
      const script = document.createElement('script');
      expect(script).toBeInstanceOf(HTMLScriptElement);
    });

    it('has correct tagName', () => {
      const {document} = createEnv();
      const script = document.createElement('script');
      expect(script.tagName).toBe('SCRIPT');
    });

    it('has correct localName', () => {
      const {document} = createEnv();
      const script = document.createElement('script');
      expect(script.localName).toBe('script');
    });
  });

  describe('src property', () => {
    it('defaults to empty string', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      expect(script.src).toBe('');
    });

    it('reflects the src attribute', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.setAttribute('src', './app.js');
      expect(script.src).toBe('./app.js');
    });

    it('sets the src attribute via property', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.src = './app.ts';
      expect(script.getAttribute('src')).toBe('./app.ts');
    });
  });

  describe('type property', () => {
    it('defaults to empty string', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      expect(script.type).toBe('');
    });

    it('reflects the type attribute', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.setAttribute('type', 'module');
      expect(script.type).toBe('module');
    });

    it('sets the type attribute via property', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.type = 'module';
      expect(script.getAttribute('type')).toBe('module');
    });

    it('supports text/javascript type', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.type = 'text/javascript';
      expect(script.type).toBe('text/javascript');
    });
  });

  describe('defer property', () => {
    it('defaults to false', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      expect(script.defer).toBe(false);
    });

    it('reflects the defer attribute presence', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.setAttribute('defer', '');
      expect(script.defer).toBe(true);
    });

    it('sets the defer attribute via property', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.defer = true;
      expect(script.hasAttribute('defer')).toBe(true);
    });

    it('removes the defer attribute when set to false', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.defer = true;
      script.defer = false;
      expect(script.hasAttribute('defer')).toBe(false);
    });
  });

  describe('async property', () => {
    it('defaults to false', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      expect(script.async).toBe(false);
    });

    it('reflects the async attribute presence', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.setAttribute('async', '');
      expect(script.async).toBe(true);
    });

    it('sets the async attribute via property', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.async = true;
      expect(script.hasAttribute('async')).toBe(true);
    });

    it('removes the async attribute when set to false', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.async = true;
      script.async = false;
      expect(script.hasAttribute('async')).toBe(false);
    });
  });

  describe('textContent for inline scripts', () => {
    it('holds inline script body', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.textContent = 'console.log("hello")';
      expect(script.textContent).toBe('console.log("hello")');
    });
  });

  describe('insertion detection', () => {
    it('can be appended to document body', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.src = './app.js';
      document.body.appendChild(script);

      expect(document.body.querySelector('script')).toBe(script);
    });

    it('can be appended to document head', () => {
      const {document} = createEnv();
      const script = document.createElement('script') as HTMLScriptElement;
      script.src = './app.js';
      document.head.appendChild(script);

      expect(document.head.querySelector('script')).toBe(script);
    });
  });
});
