import {NAME, NodeType} from '../constants';
import {CharacterData} from './CharacterData';

/**
 * Represents a text node.
 */
export class Text extends CharacterData {
  override nodeType = NodeType.TEXT_NODE;
  [NAME] = '#text';
}
