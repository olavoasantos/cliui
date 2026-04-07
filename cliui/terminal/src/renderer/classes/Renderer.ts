import type {LayoutBox} from '../../layout/types';
import type {TerminalColorProfile, TerminalGraphicsProtocol} from '../../terminal/types';
import type {CaretOverlay} from '../../terminal/types';
import type {GraphicsProtocol} from '../types';
import {kittyGraphicsProtocol} from '../utilities/writeKittyGraphics';
import {itermGraphicsProtocol} from '../utilities/writeItermGraphics';
import {fallbackGraphicsProtocol} from '../utilities/writeImageFallback';
import {ANSIWriter} from './ANSIWriter';
import {CellBuffer} from './CellBuffer';
import {Differ} from './Differ';
import {Painter} from './Painter';

import type {BorderStyleRegistry} from './BorderStyleRegistry';

/**
 * Coordinates painting, diffing, and ANSI serialization for each frame.
 *
 * The renderer owns a pair of cell buffers sized to the current terminal
 * dimensions. Each render clears the scratch buffer, paints the incoming
 * layout boxes, diffs the result against the previous frame, serializes the
 * changed regions to ANSI, then swaps the buffers so the freshly rendered
 * frame becomes the baseline for the next render.
 */
export class Renderer {
  /** The current renderer width in terminal columns. */
  get cols(): number {
    return this.currentBuffer.cols;
  }

  /** The current renderer height in terminal rows. */
  get rows(): number {
    return this.currentBuffer.rows;
  }

  /** Returns the last rendered cell buffer (the frame currently visible). */
  getCellBuffer(): CellBuffer {
    return this.previousBuffer;
  }

  private currentBuffer: CellBuffer;
  private previousBuffer: CellBuffer;
  private painter: Painter;
  private differ: Differ;
  private ansiWriter: ANSIWriter;
  private synchronizedOutputEnabled = false;
  private colorProfile: TerminalColorProfile = 'truecolor';
  private graphicsCapability: TerminalGraphicsProtocol = 'none';
  private readonly graphicsProtocols: GraphicsProtocol[] = [];

  /** The border style registry shared with the style engine. */
  get borderStyles(): BorderStyleRegistry {
    return this.painter.borderStyles;
  }

  /**
   * Creates a renderer sized to the given terminal dimensions.
   *
   * @param cols - Initial terminal column count.
   * @param rows - Initial terminal row count.
   * @param painter - Paint implementation used for layout boxes.
   * @param differ - Diff implementation used between frames.
   * @param ansiWriter - ANSI serializer for changed regions.
   */
  constructor(
    cols: number,
    rows: number,
    painter = new Painter(),
    differ = new Differ(),
    ansiWriter = new ANSIWriter(),
  ) {
    this.currentBuffer = new CellBuffer(cols, rows);
    this.previousBuffer = new CellBuffer(cols, rows);
    this.painter = painter;
    this.differ = differ;
    this.ansiWriter = ansiWriter;

    // Register built-in graphics protocols in preference order
    this.graphicsProtocols.push(kittyGraphicsProtocol);
    this.graphicsProtocols.push(itermGraphicsProtocol);
    this.graphicsProtocols.push(fallbackGraphicsProtocol);
  }

  /**
   * Renders one frame from layout boxes and returns the ANSI output.
   *
   * @param boxes - Root layout boxes to paint for this frame.
   * @param caretOverlays - Optional caret overlays to apply after painting.
   * @returns ANSI escape sequences for the changed cells only.
   */
  render(boxes: LayoutBox | LayoutBox[], caretOverlays?: CaretOverlay[]): string {
    this.currentBuffer.clear();
    this.painter.paint(boxes, this.currentBuffer);

    if (caretOverlays) {
      this.applyCaretOverlays(caretOverlays);
    }

    const changedRegions = this.differ.diff(this.previousBuffer, this.currentBuffer);
    const output = this.ansiWriter.write(changedRegions);

    this.swapBuffers();

    return output;
  }

  /**
   * Enables or disables synchronized output wrapping for rendered frames.
   *
   * @param enabled - Whether frame output should be wrapped in mode 2026.
   */
  setSynchronizedOutputEnabled(enabled: boolean): void {
    if (this.synchronizedOutputEnabled === enabled) {
      return;
    }

    this.synchronizedOutputEnabled = enabled;
    this.ansiWriter.setSynchronizedOutputEnabled(enabled);
    this.invalidate();
  }

  /**
   * Sets the active color profile for ANSI color encoding.
   *
   * @param profile - The detected terminal color capability.
   */
  setColorProfile(profile: TerminalColorProfile): void {
    if (this.colorProfile === profile) {
      return;
    }

    this.colorProfile = profile;
    this.ansiWriter.setColorProfile(profile);
    this.invalidate();
  }

  /**
   * Sets the detected terminal graphics protocol capability.
   *
   * @param protocol - The best available graphics protocol.
   */
  setGraphicsCapability(protocol: TerminalGraphicsProtocol): void {
    this.graphicsCapability = protocol;
  }

  /**
   * Registers a graphics protocol implementation.
   *
   * Protocols are inserted before the fallback protocol so that
   * externally registered protocols (e.g., Sixel) take priority
   * over the text fallback but not over built-in protocols.
   *
   * @param protocol - The graphics protocol to register.
   */
  registerGraphicsProtocol(protocol: GraphicsProtocol): void {
    // Insert before fallback (last entry)
    const fallbackIndex = this.graphicsProtocols.findIndex((p) => p.name === 'fallback');

    if (fallbackIndex >= 0) {
      this.graphicsProtocols.splice(fallbackIndex, 0, protocol);
    } else {
      this.graphicsProtocols.push(protocol);
    }
  }

  /**
   * Resizes the renderer buffers to match new terminal dimensions.
   *
   * Both buffers are resized together so subsequent diffs operate on the same
   * geometry.
   *
   * @param cols - New terminal column count.
   * @param rows - New terminal row count.
   */
  resize(cols: number, rows: number): void {
    this.currentBuffer.resize(cols, rows);
    this.previousBuffer.resize(cols, rows);
    this.currentBuffer.clear();
    this.previousBuffer.clear();
    this.ansiWriter.reset();
  }

  private invalidate(): void {
    this.previousBuffer.clear();
    this.ansiWriter.reset();
  }

  private swapBuffers(): void {
    const previousBuffer = this.previousBuffer;

    this.previousBuffer = this.currentBuffer;
    this.currentBuffer = previousBuffer;
  }

  /**
   * Applies caret overlays to the current cell buffer by inverting the
   * foreground and background colors at the cursor position.
   */
  private applyCaretOverlays(overlays: CaretOverlay[]): void {
    for (const overlay of overlays) {
      if (overlay.cursorVisible) {
        const cell = this.currentBuffer.getRef(overlay.cursorX, overlay.cursorY);

        if (cell) {
          const prevFg = cell.fg;
          const prevBg = cell.bg;

          cell.fg = prevBg ?? {r: 255, g: 255, b: 255};
          cell.bg = prevFg ?? {r: 0, g: 0, b: 0};
        }
      }

      for (const range of overlay.selection) {
        for (let x = range.x; x < range.x + range.width; x++) {
          const cell = this.currentBuffer.getRef(x, range.y);

          if (cell) {
            const prevFg = cell.fg;
            const prevBg = cell.bg;

            cell.fg = prevBg ?? {r: 255, g: 255, b: 255};
            cell.bg = prevFg ?? {r: 0, g: 0, b: 0};
          }
        }
      }
    }
  }

  /**
   * Selects the best graphics protocol based on detected capability.
   *
   * Returns the first protocol whose name matches the detected capability,
   * falling through to the fallback protocol if no match is found.
   *
   * Currently unused — reserved for future `<img>` element support
   * when proper image lifecycle management is implemented.
   */
  selectGraphicsProtocol(): GraphicsProtocol {
    if (this.graphicsCapability !== 'none') {
      for (const protocol of this.graphicsProtocols) {
        if (protocol.name === this.graphicsCapability) {
          return protocol;
        }
      }
    }

    // Fall through to fallback
    return this.graphicsProtocols[this.graphicsProtocols.length - 1] ?? fallbackGraphicsProtocol;
  }
}
