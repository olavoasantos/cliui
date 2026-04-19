import {describe, expect, it} from 'vitest';

import {NodeType} from '../../constants';
import {Window} from '../Window';

describe('Comment', () => {
  describe('properties', () => {
    it('has nodeType COMMENT_NODE', () => {
      const comment = new Window().document.createComment('hello');

      expect(comment.nodeType).toBe(NodeType.COMMENT_NODE);
    });

    it('has nodeName #comment', () => {
      const comment = new Window().document.createComment('hello');

      expect(comment.nodeName).toBe('#comment');
    });
  });

  describe('constructor', () => {
    it('creates a comment node with the given data', () => {
      const comment = new Window().document.createComment('hello');

      expect(comment.data).toBe('hello');
    });

    it('creates a comment node with empty data when omitted', () => {
      const comment = new Window().document.createComment(undefined);

      expect(comment.data).toBe('');
    });
  });
});
