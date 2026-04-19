import {describe, expect, it} from 'vitest';

import {NodeType} from '../../constants';
import {Window} from '../Window';

describe('Text', () => {
  describe('properties', () => {
    it('has nodeType TEXT_NODE', () => {
      const text = new Window().document.createTextNode('hello');

      expect(text.nodeType).toBe(NodeType.TEXT_NODE);
    });

    it('has nodeName #text', () => {
      const text = new Window().document.createTextNode('hello');

      expect(text.nodeName).toBe('#text');
    });
  });

  describe('constructor', () => {
    it('creates a text node with the given data', () => {
      const text = new Window().document.createTextNode('hello');

      expect(text.data).toBe('hello');
    });

    it('creates a text node with empty data when omitted', () => {
      const text = new Window().document.createTextNode(undefined);

      expect(text.data).toBe('');
    });
  });
});
