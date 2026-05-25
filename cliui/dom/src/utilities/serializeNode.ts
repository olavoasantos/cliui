import {ATTRIBUTES, CHILD, DATA, NAME, NEXT, NodeType, VALUE} from '../constants';
import {serializeChildren} from './serializeChildren';

import type {Comment} from '../classes/Comment';
import type {Element} from '../classes/Element';
import type {Node} from '../classes/Node';
import type {Text} from '../classes/Text';

/**
 * Serializes a node to an HTML string.
 *
 * Handles element, text, and comment nodes. Element attributes are
 * entity-encoded; text content is escaped for safe embedding in HTML.
 *
 * @param node - The node to serialize.
 * @returns The HTML string representation of the node.
 */
export function serializeNode(node: Node) {
  switch (node.nodeType) {
    case NodeType.ELEMENT_NODE: {
      const element = node as Element;
      let output = `<${element[NAME]}`;
      let attribute = element[ATTRIBUTES]?.[CHILD];
      while (attribute) {
        output += ` ${attribute[NAME]}`;
        let value = attribute[VALUE];
        if (value !== '') {
          value = String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
          output += `="${value}"`;
        }
        attribute = attribute[NEXT];
      }
      output += '>';
      output += serializeChildren(element);
      output += `</${element[NAME]}>`;
      return output;
    }
    case NodeType.TEXT_NODE: {
      const text = node as Text;
      return text[DATA]
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
    case NodeType.COMMENT_NODE: {
      const text = node as Comment;
      return `<!--${text[DATA]}-->`;
    }
    default:
      return '';
  }
}
