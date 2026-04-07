import {describe, expect, it} from 'vitest';
import {Window} from '../Window';
import {HTMLLinkElement} from '../HTMLLinkElement';

describe('HTMLLinkElement', () => {
  function createEnv() {
    const window = new Window();
    return {window, document: window.document};
  }

  describe('element creation', () => {
    it('creates an HTMLLinkElement via createElement', () => {
      const {document} = createEnv();
      const link = document.createElement('link');
      expect(link).toBeInstanceOf(HTMLLinkElement);
    });

    it('has correct tagName', () => {
      const {document} = createEnv();
      const link = document.createElement('link');
      expect(link.tagName).toBe('LINK');
    });

    it('has correct localName', () => {
      const {document} = createEnv();
      const link = document.createElement('link');
      expect(link.localName).toBe('link');
    });
  });

  describe('rel property', () => {
    it('defaults to empty string', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      expect(link.rel).toBe('');
    });

    it('reflects the rel attribute', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      link.setAttribute('rel', 'stylesheet');
      expect(link.rel).toBe('stylesheet');
    });

    it('sets the rel attribute via property', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      link.rel = 'stylesheet';
      expect(link.getAttribute('rel')).toBe('stylesheet');
    });
  });

  describe('href property', () => {
    it('defaults to empty string', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      expect(link.href).toBe('');
    });

    it('reflects the href attribute', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      link.setAttribute('href', './styles.css');
      expect(link.href).toBe('./styles.css');
    });

    it('sets the href attribute via property', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      link.href = './styles.css';
      expect(link.getAttribute('href')).toBe('./styles.css');
    });
  });

  describe('type property', () => {
    it('defaults to empty string', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      expect(link.type).toBe('');
    });

    it('reflects the type attribute', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      link.setAttribute('type', 'text/css');
      expect(link.type).toBe('text/css');
    });

    it('sets the type attribute via property', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      link.type = 'text/css';
      expect(link.getAttribute('type')).toBe('text/css');
    });
  });

  describe('sheet property', () => {
    it('defaults to null', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      expect(link.sheet).toBeNull();
    });

    it('can be set to stylesheet text', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      link.sheet = '.app { color: red; }';
      expect(link.sheet).toBe('.app { color: red; }');
    });

    it('can be reset to null', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      link.sheet = '.app { color: red; }';
      link.sheet = null;
      expect(link.sheet).toBeNull();
    });
  });

  describe('insertion detection', () => {
    it('can be appended to document head', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      link.rel = 'stylesheet';
      link.href = './styles.css';
      document.head.appendChild(link);

      expect(document.head.querySelector('link')).toBe(link);
    });

    it('can be appended to document body', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      link.rel = 'stylesheet';
      link.href = './styles.css';
      document.body.appendChild(link);

      expect(document.body.querySelector('link')).toBe(link);
    });
  });

  describe('non-stylesheet rel values', () => {
    it('supports arbitrary rel values', () => {
      const {document} = createEnv();
      const link = document.createElement('link') as HTMLLinkElement;
      link.rel = 'icon';
      link.href = './favicon.ico';
      expect(link.rel).toBe('icon');
      expect(link.href).toBe('./favicon.ico');
    });
  });
});
