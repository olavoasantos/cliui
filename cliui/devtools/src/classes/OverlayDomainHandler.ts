import type {CDPTransport} from './CDPTransport';
import type {NodeRegistry} from './NodeRegistry';
import type {Element} from '@cliui/dom';

/**
 * A resolved RGBA color for overlay rendering.
 */
interface OverlayColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Layout box information needed for overlay rendering.
 */
interface BoxMetrics {
  /** Margin edge coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Content area coordinates. */
  contentX: number;
  contentY: number;
  contentWidth: number;
  contentHeight: number;
}

/**
 * A function that looks up layout box metrics for a DOM element.
 */
type LayoutLookup = (element: Element) => BoxMetrics | null;

/**
 * A function that highlights cells in the terminal cell buffer.
 *
 * Accepts a rectangular region and a highlight color.  The implementation
 * applies the color as a background overlay on the affected cells during
 * the next render frame.
 */
type CellHighlighter = (
  x: number,
  y: number,
  width: number,
  height: number,
  color: OverlayColor,
) => void;

/**
 * CDP Overlay domain handler for element highlighting.
 *
 * When a developer hovers over an element in DevTools' Elements panel,
 * Chrome sends `Overlay.highlightNode`.  This handler uses the layout
 * engine's box positions to render box-model highlights in the terminal.
 *
 * The overlay is painted as a post-processing pass — it does not modify
 * the DOM or style engine state.
 */
export class OverlayDomainHandler {
  private readonly transport: CDPTransport;
  private readonly registry: NodeRegistry;
  private readonly layoutLookup: LayoutLookup;
  private readonly cellHighlighter: CellHighlighter;

  /** The currently highlighted node ID, or `null` if none. */
  private highlightedNodeId: number | null = null;

  /** Whether inspect mode is active. */
  private inspectModeEnabled = false;

  /** Callback for when inspect mode identifies a node. */
  private onInspectNode: ((nodeId: number) => void) | null = null;

  /** Callback to clear the current highlight from the cell buffer. */
  private clearHighlightCallback: (() => void) | null = null;

  constructor(
    transport: CDPTransport,
    registry: NodeRegistry,
    layoutLookup: LayoutLookup,
    cellHighlighter: CellHighlighter,
  ) {
    this.transport = transport;
    this.registry = registry;
    this.layoutLookup = layoutLookup;
    this.cellHighlighter = cellHighlighter;
  }

  /** Registers all Overlay domain method handlers with the transport. */
  register(): void {
    this.transport.registerMethod('Overlay.enable', () => this.enable());
    this.transport.registerMethod('Overlay.disable', () => this.disable());
    this.transport.registerMethod('Overlay.highlightNode', (params) =>
      this.highlightNode(params),
    );
    this.transport.registerMethod('Overlay.hideHighlight', () => this.hideHighlight());
    this.transport.registerMethod('Overlay.setInspectMode', (params) =>
      this.setInspectMode(params),
    );
  }

  /**
   * Registers a callback for when inspect mode selects a node.
   */
  onNodeInspected(callback: (nodeId: number) => void): void {
    this.onInspectNode = callback;
  }

  /**
   * Called by the terminal when mouse moves during inspect mode.
   * Hit-tests the coordinates against layout boxes and highlights the result.
   */
  inspectAtCoordinates(element: Element | null): void {
    if (!this.inspectModeEnabled || !element) return;

    const nodeId = this.registry.getId(element);
    if (nodeId === undefined) return;

    this.highlightElement(element, nodeId, DEFAULT_HIGHLIGHT_CONFIG);

    this.transport.broadcastEvent({
      method: 'Overlay.nodeHighlightRequested',
      params: {nodeId},
    });
  }

  /** Returns whether inspect mode is currently active. */
  get isInspectMode(): boolean {
    return this.inspectModeEnabled;
  }

  /** Returns the ID of the currently highlighted node, or `null`. */
  get currentHighlight(): number | null {
    return this.highlightedNodeId;
  }

  // ── Domain methods ─────────────────────────────────────────────────

  private enable(): Record<string, unknown> {
    return {};
  }

  private disable(): Record<string, unknown> {
    this.hideHighlight();
    this.inspectModeEnabled = false;
    return {};
  }

  /**
   * `Overlay.highlightNode` — highlights a node's box model in the terminal.
   */
  private highlightNode(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number | undefined;
    const highlightConfig = params['highlightConfig'] as Record<string, unknown> | undefined;

    if (nodeId === undefined) return {};

    const node = this.registry.getNode(nodeId) as Element | undefined;
    if (!node || node.nodeType !== 1) return {};

    const config = parseHighlightConfig(highlightConfig);
    this.highlightElement(node, nodeId, config);

    return {};
  }

  /**
   * `Overlay.hideHighlight` — removes the current overlay.
   */
  private hideHighlight(): Record<string, unknown> {
    if (this.clearHighlightCallback) {
      this.clearHighlightCallback();
      this.clearHighlightCallback = null;
    }
    this.highlightedNodeId = null;
    return {};
  }

  /**
   * `Overlay.setInspectMode` — enables/disables terminal inspect mode.
   */
  private setInspectMode(params: Record<string, unknown>): Record<string, unknown> {
    const mode = params['mode'] as string;
    this.inspectModeEnabled = mode === 'searchForNode' || mode === 'searchForUAShadowDOM';
    return {};
  }

  // ── Private helpers ────────────────────────────────────────────────

  /**
   * Renders box-model highlight for an element.
   */
  private highlightElement(
    element: Element,
    nodeId: number,
    config: HighlightConfig,
  ): void {
    // Clear previous highlight
    if (this.clearHighlightCallback) {
      this.clearHighlightCallback();
    }

    const box = this.layoutLookup(element);
    if (!box) return;

    this.highlightedNodeId = nodeId;

    // Paint regions from outermost (margin) to innermost (content)
    // Margin region = full box
    if (config.margin.a > 0) {
      this.cellHighlighter(box.x, box.y, box.width, box.height, config.margin);
    }

    // Border region = box minus margin (approximate: use content area offset)
    const borderX = box.contentX > box.x ? box.x + 1 : box.x;
    const borderY = box.contentY > box.y ? box.y + 1 : box.y;
    const borderW = box.width - (borderX - box.x) * 2;
    const borderH = box.height - (borderY - box.y) * 2;
    if (config.border.a > 0 && borderW > 0 && borderH > 0) {
      this.cellHighlighter(borderX, borderY, borderW, borderH, config.border);
    }

    // Padding region = area between border and content
    const padX = box.contentX > borderX ? borderX + 1 : borderX;
    const padY = box.contentY > borderY ? borderY + 1 : borderY;
    const padW = box.contentWidth + (box.contentX - padX) * 2;
    const padH = box.contentHeight + (box.contentY - padY) * 2;
    if (config.padding.a > 0 && padW > 0 && padH > 0) {
      this.cellHighlighter(padX, padY, Math.max(0, padW), Math.max(0, padH), config.padding);
    }

    // Content region
    if (config.content.a > 0 && box.contentWidth > 0 && box.contentHeight > 0) {
      this.cellHighlighter(
        box.contentX,
        box.contentY,
        box.contentWidth,
        box.contentHeight,
        config.content,
      );
    }

    // Store cleanup callback
    this.clearHighlightCallback = () => {
      // Re-render will clear the overlay since it's a post-processing pass
      this.highlightedNodeId = null;
    };
  }
}

// ── Configuration types and helpers ──────────────────────────────────

interface HighlightConfig {
  content: OverlayColor;
  padding: OverlayColor;
  border: OverlayColor;
  margin: OverlayColor;
}

const DEFAULT_HIGHLIGHT_CONFIG: HighlightConfig = {
  content: {r: 111, g: 168, b: 220, a: 0.66},
  padding: {r: 147, g: 196, b: 125, a: 0.55},
  border: {r: 255, g: 229, b: 153, a: 0.66},
  margin: {r: 246, g: 178, b: 107, a: 0.66},
};

function parseOverlayColor(obj: Record<string, unknown> | undefined): OverlayColor {
  if (!obj) return {r: 0, g: 0, b: 0, a: 0};
  return {
    r: (obj['r'] as number) ?? 0,
    g: (obj['g'] as number) ?? 0,
    b: (obj['b'] as number) ?? 0,
    a: (obj['a'] as number) ?? 0,
  };
}

function parseHighlightConfig(obj: Record<string, unknown> | undefined): HighlightConfig {
  if (!obj) return DEFAULT_HIGHLIGHT_CONFIG;
  return {
    content: parseOverlayColor(obj['contentColor'] as Record<string, unknown> | undefined),
    padding: parseOverlayColor(obj['paddingColor'] as Record<string, unknown> | undefined),
    border: parseOverlayColor(obj['borderColor'] as Record<string, unknown> | undefined),
    margin: parseOverlayColor(obj['marginColor'] as Record<string, unknown> | undefined),
  };
}
