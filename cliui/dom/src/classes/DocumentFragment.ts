import {NAME, OWNER_DOCUMENT, NodeType} from '../constants';
import type {Document} from './Document';
import {ParentNode} from './ParentNode';

/**
 * A lightweight document subtree used for batch DOM operations.
 *
 * When a fragment is passed to `appendChild` or `insertBefore`, its children are moved
 * into the target — the fragment itself is not inserted.
 */
export class DocumentFragment extends ParentNode {
  override nodeType = NodeType.DOCUMENT_FRAGMENT_NODE;
  [NAME] = '#document-fragment';
  [OWNER_DOCUMENT] = undefined as unknown as Document;
}
