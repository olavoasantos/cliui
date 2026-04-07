import type {Node as DomNode} from '@cliui/dom';
import type {NodeRegistry} from '../classes/NodeRegistry';
import type {CDPNode} from '../types';

/**
 * Serializes a DOM node into the CDP `DOM.Node` format.
 *
 * CDP requires `nodeName` in uppercase, `localName` in lowercase,
 * and attributes as a flat array of alternating key-value strings:
 * `["id", "app", "class", "container"]`.
 *
 * @param node     - The DOM node to serialize.
 * @param registry - The node registry for ID assignment.
 * @param depth    - How many levels of children to include. `0` means no children,
 *                   `-1` means the full subtree.
 * @returns The serialized CDP node representation.
 */
export function serializeCDPNode(
  node: DomNode,
  registry: NodeRegistry,
  depth: number = 0,
): CDPNode {
  const nodeId = registry.register(node);
  const nodeType = node.nodeType;
  const childNodes = (node as any).childNodes;
  const childNodeCount = childNodes ? childNodes.length : 0;

  const result: CDPNode = {
    nodeId,
    backendNodeId: nodeId,
    nodeType,
    nodeName: node.nodeName?.toUpperCase() ?? '',
    localName: nodeType === 1 ? (node.nodeName?.toLowerCase() ?? '') : '',
    nodeValue: node.nodeValue ?? '',
    childNodeCount,
  };

  // Flatten attributes for Element nodes (nodeType === 1)
  if (nodeType === 1) {
    const element = node as any;
    const attrs: string[] = [];
    const attrNames = element.getAttributeNames?.();
    if (attrNames) {
      for (const name of attrNames) {
        attrs.push(name, element.getAttribute(name) ?? '');
      }
    }
    result.attributes = attrs;
  }

  // Include children if depth allows
  if (childNodes && childNodeCount > 0 && depth !== 0) {
    const nextDepth = depth > 0 ? depth - 1 : depth;
    result.children = [];
    for (let i = 0; i < childNodes.length; i++) {
      result.children.push(serializeCDPNode(childNodes[i], registry, nextDepth));
    }
  }

  return result;
}
