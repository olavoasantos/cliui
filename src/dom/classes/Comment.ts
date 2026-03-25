import {NAME, NodeType} from '../constants';
import {CharacterData} from './CharacterData';

export class Comment extends CharacterData {
  override nodeType = NodeType.COMMENT_NODE;
  [NAME] = '#comment';
}
