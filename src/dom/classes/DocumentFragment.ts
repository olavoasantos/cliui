import {NAME, OWNER_DOCUMENT, NodeType} from '../constants/index';
import type {Document} from './Document';
import {ParentNode} from './ParentNode';

export class DocumentFragment extends ParentNode {
  override nodeType = NodeType.DOCUMENT_FRAGMENT_NODE;
  [NAME] = '#document-fragment';
  [OWNER_DOCUMENT] = undefined as unknown as Document;
}
