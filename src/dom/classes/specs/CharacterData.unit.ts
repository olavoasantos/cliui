import {describe, it, expect} from 'vitest';
import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('CharacterData', () => {
  describe('Text', () => {
    it('has correct nodeType', () => {
      const {document} = createEnv();
      const text = document.createTextNode('hello');
      expect(text.nodeType).toBe(3);
    });

    it('has correct nodeName', () => {
      const {document} = createEnv();
      const text = document.createTextNode('hello');
      expect(text.nodeName).toBe('#TEXT');
    });

    it('stores initial data', () => {
      const {document} = createEnv();
      const text = document.createTextNode('hello');
      expect(text.data).toBe('hello');
    });

    it('updates data', () => {
      const {document} = createEnv();
      const text = document.createTextNode('hello');
      text.data = 'world';
      expect(text.data).toBe('world');
    });

    it('keeps the same value on no-op text updates', () => {
      const {document} = createEnv();
      const text = document.createTextNode('hello');
      text.data = 'hello';
      expect(text.data).toBe('hello');
    });

    it('coerces null data to empty string', () => {
      const {document} = createEnv();
      const text = document.createTextNode(null);
      expect(text.data).toBe('');
    });

    it('coerces undefined data to empty string', () => {
      const {document} = createEnv();
      const text = document.createTextNode(undefined);
      expect(text.data).toBe('');
    });

    it('coerces number data to string', () => {
      const {document} = createEnv();
      const text = document.createTextNode(42 as unknown as string);
      expect(text.data).toBe('42');
    });

    it('nodeValue returns data', () => {
      const {document} = createEnv();
      const text = document.createTextNode('hello');
      expect(text.nodeValue).toBe('hello');
    });

    it('textContent returns data', () => {
      const {document} = createEnv();
      const text = document.createTextNode('hello');
      expect(text.textContent).toBe('hello');
    });
  });

  describe('Comment', () => {
    it('has correct nodeType', () => {
      const {document} = createEnv();
      const comment = document.createComment('test');
      expect(comment.nodeType).toBe(8);
    });

    it('has correct nodeName', () => {
      const {document} = createEnv();
      const comment = document.createComment('test');
      expect(comment.nodeName).toBe('#COMMENT');
    });

    it('stores initial data', () => {
      const {document} = createEnv();
      const comment = document.createComment('my comment');
      expect(comment.data).toBe('my comment');
    });

    it('updates data', () => {
      const {document} = createEnv();
      const comment = document.createComment('old');
      comment.data = 'new';
      expect(comment.data).toBe('new');
    });
  });
});
