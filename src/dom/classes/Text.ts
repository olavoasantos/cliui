import {NAME, NodeType} from '../constants/index';
import {CharacterData} from './CharacterData';

export class Text extends CharacterData {
  override nodeType = NodeType.TEXT_NODE;
  [NAME] = '#text';
}
