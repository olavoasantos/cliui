import {describe, it, expect} from 'vitest';
import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('NamedNodeMap', () => {
  it('starts empty', () => {
    const {document} = createEnv();
    const el = document.createElement('div');
    expect(el.attributes.length).toBe(0);
  });

  describe('setNamedItem / getNamedItem', () => {
    it('sets and gets an attribute', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'test');

      const attr = el.attributes.getNamedItem('id');
      expect(attr).not.toBe(null);
      expect(attr!.name).toBe('id');
      expect(attr!.value).toBe('test');
    });

    it('replaces an existing attribute with same name', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'first');
      el.setAttribute('id', 'second');

      expect(el.attributes.length).toBe(1);
      expect(el.getAttribute('id')).toBe('second');
    });

    it('returns the old attribute when replacing', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'first');

      const oldAttr = el.attributes.getNamedItem('id');
      el.setAttribute('id', 'second');

      expect(oldAttr!.value).toBe('first');
    });
  });

  describe('removeNamedItem', () => {
    it('removes an attribute', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'test');

      el.removeAttribute('id');
      expect(el.attributes.length).toBe(0);
      expect(el.getAttribute('id')).toBe(null);
    });

    it('returns null when removing non-existent attribute', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      const result = el.attributes.removeNamedItem('nonexistent');
      expect(result).toBe(null);
    });
  });

  describe('item', () => {
    it('returns attribute by index', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'test');
      el.setAttribute('class', 'container');

      expect(el.attributes.item(0)!.name).toBe('id');
      expect(el.attributes.item(1)!.name).toBe('class');
    });

    it('returns null for out of bounds index', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.attributes.item(0)).toBe(null);
    });
  });

  describe('length', () => {
    it('reflects the number of attributes', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.attributes.length).toBe(0);

      el.setAttribute('id', 'a');
      expect(el.attributes.length).toBe(1);

      el.setAttribute('class', 'b');
      expect(el.attributes.length).toBe(2);

      el.removeAttribute('id');
      expect(el.attributes.length).toBe(1);
    });
  });

  describe('iteration', () => {
    it('supports for...of iteration', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'test');
      el.setAttribute('class', 'container');

      const names: string[] = [];
      for (const attr of el.attributes) {
        names.push(attr.name);
      }

      expect(names).toEqual(['id', 'class']);
    });
  });

  describe('hasAttribute / hasAttributeNS', () => {
    it('returns true when attribute exists', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'test');
      expect(el.hasAttribute('id')).toBe(true);
    });

    it('returns false when attribute does not exist', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      expect(el.hasAttribute('id')).toBe(false);
    });
  });

  describe('getAttributeNames', () => {
    it('returns all attribute names', () => {
      const {document} = createEnv();
      const el = document.createElement('div');
      el.setAttribute('id', 'test');
      el.setAttribute('class', 'box');
      el.setAttribute('data-value', '42');

      expect(el.getAttributeNames()).toEqual(['id', 'class', 'data-value']);
    });
  });
});
