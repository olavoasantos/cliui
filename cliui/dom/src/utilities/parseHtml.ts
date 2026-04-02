import type {Node} from '../classes/Node';
import type {ParentNode} from '../classes/ParentNode';

const elementTokenizer =
  /(?:<([a-z][a-z0-9-:]*)((?:[\s]+[^<>'"=\s]+(?:=(['"])[^]*?\3|=[^>'"\s]*|))*)[\s]*(\/?)\s*>|<\/([a-z][a-z0-9-:]*)>|<!--(.*?)-->|([^&<>]+))/gi;

const attributeTokenizer = /\s([^<>'"=\n\s]+)(?:=(["'])([\s\S]*?)\2|=([^>'"\n\s]*)|)/g;

/** Parses an HTML string into a document fragment relative to a context node. */
export function parseHtml(html: string, contextNode: Node) {
  const document = contextNode.ownerDocument;
  const root = document.createDocumentFragment();
  const stack: Node[] = [root];
  let parent: ParentNode = root;
  let token: RegExpExecArray | null;
  elementTokenizer.lastIndex = 0;

  while ((token = elementTokenizer.exec(html))) {
    const tag = token[1];
    if (tag) {
      const node = document.createElement(tag);
      const attributes = token[2]!;
      attributeTokenizer.lastIndex = 0;
      let attributeToken: RegExpExecArray | null;
      while ((attributeToken = attributeTokenizer.exec(attributes))) {
        node.setAttribute(attributeToken[1]!, attributeToken[3] || attributeToken[4] || '');
      }
      parent.append(node);
      stack.push(parent);
      parent = node;
    } else if (token[5]) {
      parent = (stack.pop() as ParentNode) || root;
    } else if (token[6] != null) {
      parent.append(document.createComment(token[6]));
    } else {
      parent.append(token[7]!);
    }
  }

  return root;
}
