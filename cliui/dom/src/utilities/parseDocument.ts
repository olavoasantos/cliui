import type {Document} from '../classes/Document';
import type {ParentNode} from '../classes/ParentNode';

/** Set of tag names representing the document skeleton. */
const STRUCTURAL_TAGS = new Set(['html', 'head', 'body']);

/**
 * HTML void elements - elements that cannot have child content.
 * These never push onto the parent stack regardless of self-closing syntax.
 */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
 * Regex to strip `<!DOCTYPE ...>` declarations.
 *
 * Matches case-insensitively and captures everything up to the closing `>`.
 */
const DOCTYPE_PATTERN = /<!doctype[^>]*>/gi;

const elementTokenizer =
  /(?:<([a-z][a-z0-9-:]*)((?:[\s]+[^<>'"=\s]+(?:=(['"])[^]*?\3|=[^>'"\s]*|))*)[\s]*(\/?)\s*>|<\/([a-z][a-z0-9-:]*)>|<!--(.*?)-->|([^&<>]+))/gi;

const attributeTokenizer = /\s([^<>'"=\n\s]+)(?:=(["'])([\s\S]*?)\2|=([^>'"\n\s]*)|)/g;

/**
 * Parses a full HTML document string and populates the given document's
 * existing `documentElement`, `head`, and `body` elements.
 *
 * Unlike {@link parseHtml}, which creates a `DocumentFragment` for innerHTML
 * use, this utility recognises the structural tags (`<html>`, `<head>`,
 * `<body>`) and routes their content into the document's pre-existing
 * skeleton. `<!DOCTYPE>` declarations are silently skipped.
 *
 * When structural tags are absent the input is treated as a bare fragment
 * and all content is appended to `document.body`.
 *
 * Attributes present on structural tags (e.g. `<body class="dark">`) are
 * applied to the corresponding existing elements.
 *
 * @param html - The full HTML document string to parse.
 * @param document - The target document whose skeleton will be populated.
 */
export function parseDocument(html: string, document: Document): void {
  const cleaned = html.replace(DOCTYPE_PATTERN, '');

  /**
   * Track where we are in the document structure.
   *
   * `context` indicates which structural section we're currently inside:
   * - `'none'`  - outside any structural tag (content goes to body)
   * - `'html'`  - inside `<html>` but outside `<head>` and `<body>`
   * - `'head'`  - inside `<head>`
   * - `'body'`  - inside `<body>`
   */
  let context: 'none' | 'html' | 'head' | 'body' = 'none';

  /** The current parent node for non-structural content. */
  let parent: ParentNode = document.body;

  /**
   * Stack of parent nodes. Each time we open a non-structural element we
   * push the current parent so closing tags can restore it.
   */
  const stack: ParentNode[] = [];

  let token: RegExpExecArray | null;
  elementTokenizer.lastIndex = 0;

  while ((token = elementTokenizer.exec(cleaned))) {
    const openTag = token[1];

    if (openTag) {
      const lowerTag = openTag.toLowerCase();
      const attributes = token[2]!;

      if (STRUCTURAL_TAGS.has(lowerTag)) {
        handleStructuralOpen(lowerTag, attributes, document);

        if (lowerTag === 'html') {
          context = 'html';
        } else if (lowerTag === 'head') {
          context = 'head';
          parent = document.head;
          // Reset the stack for head content
          stack.length = 0;
        } else if (lowerTag === 'body') {
          context = 'body';
          parent = document.body;
          stack.length = 0;
        }
      } else {
        // Non-structural element - create normally
        const node = document.createElement(openTag);
        applyAttributes(node, attributes);

        // Self-closing or void elements don't push onto the stack
        const selfClosing = token[4] === '/' || VOID_ELEMENTS.has(lowerTag);
        parent.append(node);

        if (!selfClosing) {
          stack.push(parent);
          parent = node;
        }
      }
    } else if (token[5]) {
      // Closing tag
      const lowerClose = token[5].toLowerCase();

      if (lowerClose === 'head') {
        // Leaving <head> - if we're inside <html>, stray content goes to body
        if (context === 'head') {
          context = 'html';
          parent = document.body;
          stack.length = 0;
        }
      } else if (lowerClose === 'body') {
        if (context === 'body') {
          context = 'html';
          parent = document.body;
          stack.length = 0;
        }
      } else if (lowerClose === 'html') {
        context = 'none';
        parent = document.body;
        stack.length = 0;
      } else {
        // Non-structural closing tag - pop the stack
        parent = stack.pop() ?? getDefaultParent(context, document);
      }
    } else if (token[6] != null) {
      // Comment
      parent.append(document.createComment(token[6]));
    } else if (token[7] != null) {
      // Text node - skip whitespace-only text between structural tags
      const text = token[7];

      if (context === 'html' && text.trim() === '') {
        continue;
      }

      parent.append(text);
    }
  }
}

/**
 * Returns the default parent node for the current structural context.
 */
function getDefaultParent(
  context: 'none' | 'html' | 'head' | 'body',
  document: Document,
): ParentNode {
  if (context === 'head') {
    return document.head;
  }

  return document.body;
}

/**
 * Applies attributes from a raw attribute string to an existing element.
 */
function applyAttributes(
  element: ParentNode & {setAttribute?(name: string, value: string): void},
  attributes: string,
): void {
  attributeTokenizer.lastIndex = 0;
  let attributeToken: RegExpExecArray | null;

  while ((attributeToken = attributeTokenizer.exec(attributes))) {
    if (element.setAttribute) {
      element.setAttribute(attributeToken[1]!, attributeToken[3] || attributeToken[4] || '');
    }
  }
}

/**
 * Handles an opening structural tag by applying its attributes to the
 * existing document element.
 */
function handleStructuralOpen(tag: string, attributes: string, document: Document): void {
  if (tag === 'html') {
    applyAttributes(document.documentElement, attributes);
  } else if (tag === 'head') {
    applyAttributes(document.head, attributes);
  } else if (tag === 'body') {
    applyAttributes(document.body, attributes);
  }
}
