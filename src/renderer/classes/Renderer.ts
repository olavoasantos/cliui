import type {LayoutBox} from '../../layout/types';
import type {TerminalColorProfile} from '../../terminal/types';
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

  private currentBuffer: CellBuffer;
  private previousBuffer: CellBuffer;
  private painter: Painter;
  private differ: Differ;
  private ansiWriter: ANSIWriter;
  private synchronizedOutputEnabled = false;
  private colorProfile: TerminalColorProfile = 'truecolor';

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
  }

  /**
   * Renders one frame from layout boxes and returns the ANSI output.
   *
   * @param boxes - Root layout boxes to paint for this frame.
   * @returns ANSI escape sequences for the changed cells only.
   */
  render(boxes: LayoutBox | LayoutBox[]): string {
    this.currentBuffer.clear();
    this.painter.paint(boxes, this.currentBuffer);

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
  }

  private invalidate(): void {
    this.previousBuffer.clear();
  }

  private swapBuffers(): void {
    const previousBuffer = this.previousBuffer;

    this.previousBuffer = this.currentBuffer;
    this.currentBuffer = previousBuffer;
  }
}
