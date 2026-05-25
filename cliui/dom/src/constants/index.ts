import type {
  EventPhase as EventPhaseType,
  NamespaceURI as NamespaceURIType,
  NodeType as NodeTypeType,
  SelectorCombinator as SelectorCombinatorType,
  SelectorMatcherType as SelectorMatcherTypeType,
} from '../types';

export const NAME = Symbol('name');
export const VALUE = Symbol('value');
export const NS = Symbol('ns');
export const OWNER_ELEMENT = Symbol('owner');
export const OWNER_DOCUMENT = Symbol('owner_document');
export const ATTRIBUTES = Symbol('attributes');
export const PREV = Symbol('prev');
export const NEXT = Symbol('next');
export const CHILD = Symbol('child');
export const PARENT = Symbol('parent');
export const DATA = Symbol('data');
export const USER_PROPERTIES = Symbol('user_properties');
export const LISTENERS = Symbol('listeners');
export const IS_TRUSTED = Symbol('isTrusted');
export const PATH = Symbol('path');
export const STOP_IMMEDIATE_PROPAGATION = Symbol('stop_immediate_propagation');
export const CONTENT = Symbol('content');
/**
 * Symbol key for the hooks bridge on a `Window` instance.
 *
 * Access via `window[HOOKS]` to install or chain lifecycle hooks.
 *
 * @see {@link Hooks} for the full hook interface.
 */
export const HOOKS = Symbol('hooks');
export const IS_CONNECTED = Symbol('is_connected');

/**
 * Numeric constants identifying the type of a DOM node.
 *
 * Mirrors the browser's `Node.ELEMENT_NODE`, `Node.TEXT_NODE`, etc.
 */
export const NodeType: Readonly<{
  NODE: NodeTypeType;
  ELEMENT_NODE: NodeTypeType;
  ATTRIBUTE_NODE: NodeTypeType;
  TEXT_NODE: NodeTypeType;
  CDATA_SECTION_NODE: NodeTypeType;
  ENTITY_REFERENCE_NODE: NodeTypeType;
  ENTITY_NODE: NodeTypeType;
  PROCESSING_INSTRUCTION_NODE: NodeTypeType;
  COMMENT_NODE: NodeTypeType;
  DOCUMENT_NODE: NodeTypeType;
  DOCUMENT_TYPE_NODE: NodeTypeType;
  DOCUMENT_FRAGMENT_NODE: NodeTypeType;
}> = {
  NODE: 0,
  ELEMENT_NODE: 1,
  ATTRIBUTE_NODE: 2,
  TEXT_NODE: 3,
  CDATA_SECTION_NODE: 4,
  ENTITY_REFERENCE_NODE: 5,
  ENTITY_NODE: 6,
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
};

/**
 * XML namespace URIs for element creation.
 *
 * `XHTML` is the default for HTML elements. `SVG` is used by `createElementNS`
 * for SVG elements.
 */
export const NamespaceURI: Readonly<{
  XHTML: NamespaceURIType;
  SVG: NamespaceURIType;
}> = {
  XHTML: 'http://www.w3.org/1999/xhtml',
  SVG: 'http://www.w3.org/2000/svg',
};

/**
 * Numeric constants identifying the current phase of event dispatch.
 *
 * Mirrors the browser's `Event.NONE`, `Event.CAPTURING_PHASE`, etc.
 */
export const EventPhase: Readonly<{
  NONE: EventPhaseType;
  CAPTURING_PHASE: EventPhaseType;
  AT_TARGET: EventPhaseType;
  BUBBLING_PHASE: EventPhaseType;
}> = {
  NONE: 0,
  CAPTURING_PHASE: 1,
  AT_TARGET: 2,
  BUBBLING_PHASE: 3,
};

/** Numeric constants identifying how selector parts relate to each other. */
export const SelectorCombinator: Readonly<{
  Descendant: SelectorCombinatorType;
  Child: SelectorCombinatorType;
  Sibling: SelectorCombinatorType;
  Adjacent: SelectorCombinatorType;
  Inner: SelectorCombinatorType;
}> = {
  Descendant: 0,
  Child: 1,
  Sibling: 2,
  Adjacent: 3,
  Inner: 4,
};

/** Numeric constants identifying the kind of matcher within a selector part. */
export const SelectorMatcherType: Readonly<{
  Unknown: SelectorMatcherTypeType;
  Element: SelectorMatcherTypeType;
  Id: SelectorMatcherTypeType;
  Class: SelectorMatcherTypeType;
  Attribute: SelectorMatcherTypeType;
  Pseudo: SelectorMatcherTypeType;
  Function: SelectorMatcherTypeType;
}> = {
  Unknown: 0,
  Element: 1,
  Id: 2,
  Class: 3,
  Attribute: 4,
  Pseudo: 5,
  Function: 6,
};

export const STYLE = Symbol('style');
export const CLASS_LIST = Symbol('class_list');

export const CAPTURE_MARKER = '@';
