import {
  BEL,
  CSI,
  DISABLE_SYNCHRONIZED_OUTPUT,
  ENABLE_SYNCHRONIZED_OUTPUT,
  OSC,
} from '../constants/controlSequences';

import type {Cell, ChangedRegion, RGBColor, UnderlineStyle} from '../types';
import type {StyleState} from '../types/StyleState';
import type {TerminalColorProfile} from '../../terminal/types';

/** ANSI 16 palette colors (shared across all instances, never mutated). */
const ANSI16_COLORS: ReadonlyArray<{r: number; g: number; b: number}> = [
  {r: 0, g: 0, b: 0},
  {r: 128, g: 0, b: 0},
  {r: 0, g: 128, b: 0},
  {r: 128, g: 128, b: 0},
  {r: 0, g: 0, b: 128},
  {r: 128, g: 0, b: 128},
  {r: 0, g: 128, b: 128},
  {r: 192, g: 192, b: 192},
  {r: 128, g: 128, b: 128},
  {r: 255, g: 0, b: 0},
  {r: 0, g: 255, b: 0},
  {r: 255, g: 255, b: 0},
  {r: 0, g: 0, b: 255},
  {r: 255, g: 0, b: 255},
  {r: 0, g: 255, b: 255},
  {r: 255, g: 255, b: 255},
];

/** Foreground ANSI 16 code offsets. */
const ANSI16_FG_CODES: ReadonlyArray<number> = [
  30, 31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97,
];

/** Background ANSI 16 code offsets. */
const ANSI16_BG_CODES: ReadonlyArray<number> = [
  40, 41, 42, 43, 44, 45, 46, 47, 100, 101, 102, 103, 104, 105, 106, 107,
];

/**
 * Serializes changed cell regions into ANSI terminal escape sequences.
 *
 * The writer emits one cursor move per changed region, then streams cell
 * styling and character data while tracking the current style state so it can
 * avoid unnecessary full resets.
 */
export class ANSIWriter {
  private synchronizedOutputEnabled = false;
  private colorProfile: TerminalColorProfile = 'truecolor';

  /** Reusable style state mutated in place during write(). */
  private state: StyleState = this.createDefaultState();

  /**
   * Resets the internal SGR state tracker to defaults.
   *
   * Called when the terminal's actual SGR state is unknown or invalidated
   * (e.g., after a color profile change, resize, or full screen clear).
   */
  reset(): void {
    this.resetState(this.state);
  }

  /**
   * Enables or disables synchronized output wrapping.
   *
   * @param enabled - Whether frame output should be wrapped in mode 2026.
   */
  setSynchronizedOutputEnabled(enabled: boolean): void {
    this.synchronizedOutputEnabled = enabled;
  }

  /**
   * Sets the active terminal color profile used for SGR color encoding.
   *
   * @param profile - The detected terminal color capability.
   */
  setColorProfile(profile: TerminalColorProfile): void {
    this.colorProfile = profile;
  }

  /**
   * Converts changed regions into ANSI output.
   *
   * @param regions - Consecutive changed cell runs to serialize.
   * @returns ANSI escape sequences and character data for the changes.
   */
  write(regions: ChangedRegion[]): string {
    let output = '';
    const state = this.state;

    for (const region of regions) {
      output += `${CSI}${region.y + 1};${region.x + 1}H`;

      for (const cell of region.cells) {
        output += this.serializeHyperlink(state.hyperlink, cell.hyperlink);

        const sgr = this.buildSgrString(state, cell);

        if (sgr.length > 0) {
          output += `${CSI}${sgr}m`;
        }

        output += cell.char;
        this.updateState(state, cell);
      }
    }

    if (state.hyperlink !== null) {
      output += this.serializeHyperlink(state.hyperlink, null);
    }

    if (output.length === 0 || !this.synchronizedOutputEnabled) {
      return output;
    }

    return `${ENABLE_SYNCHRONIZED_OUTPUT}${output}${DISABLE_SYNCHRONIZED_OUTPUT}`;
  }

  /**
   * Builds an SGR parameter string directly without allocating an array.
   */
  private buildSgrString(previous: StyleState, current: Readonly<Cell>): string {
    let sgr = '';

    if (previous.bold !== current.bold || previous.faint !== current.faint) {
      if (previous.bold || previous.faint) {
        sgr += '22';
      }

      if (current.bold) {
        sgr += sgr.length > 0 ? ';1' : '1';
      }

      if (current.faint) {
        sgr += sgr.length > 0 ? ';2' : '2';
      }
    }

    if (previous.italic !== current.italic) {
      const code = current.italic ? '3' : '23';
      sgr += sgr.length > 0 ? `;${code}` : code;
    }

    if (previous.underline !== current.underline) {
      const code = current.underline === 'none' ? '24' : this.getUnderlineCode(current.underline);
      sgr += sgr.length > 0 ? `;${code}` : code;
    }

    const previousUnderlineColor = this.resolveColorForProfile(previous.underlineColor);
    const currentUnderlineColor = this.resolveColorForProfile(current.underlineColor);

    if (!this.areColorsEqual(previousUnderlineColor, currentUnderlineColor)) {
      const code =
        currentUnderlineColor === null ? '59' : this.getColorCode('58', currentUnderlineColor);
      sgr += sgr.length > 0 ? `;${code}` : code;
    }

    if (previous.strikethrough !== current.strikethrough) {
      const code = current.strikethrough ? '9' : '29';
      sgr += sgr.length > 0 ? `;${code}` : code;
    }

    const previousForeground = this.resolveColorForProfile(previous.fg);
    const currentForeground = this.resolveColorForProfile(current.fg);

    if (!this.areColorsEqual(previousForeground, currentForeground)) {
      const code = currentForeground === null ? '39' : this.getColorCode('38', currentForeground);
      sgr += sgr.length > 0 ? `;${code}` : code;
    }

    const previousBackground = this.resolveColorForProfile(previous.bg);
    const currentBackground = this.resolveColorForProfile(current.bg);

    if (!this.areColorsEqual(previousBackground, currentBackground)) {
      const code = currentBackground === null ? '49' : this.getColorCode('48', currentBackground);
      sgr += sgr.length > 0 ? `;${code}` : code;
    }

    return sgr;
  }

  private getUnderlineCode(style: UnderlineStyle): string {
    switch (style) {
      case 'double':
        return '4:2';
      case 'wavy':
        return '4:3';
      case 'dotted':
        return '4:4';
      case 'dashed':
        return '4:5';
      case 'solid':
      default:
        return '4:1';
    }
  }

  private getColorCode(prefix: '38' | '48' | '58', color: RGBColor): string {
    switch (this.colorProfile) {
      case 'none':
        return prefix === '58' ? '59' : prefix === '38' ? '39' : '49';
      case 'ansi16':
        return String(this.getAnsi16Code(prefix, color));
      case 'ansi256':
        return `${prefix};5;${this.getAnsi256Index(color)}`;
      case 'truecolor':
      default:
        return `${prefix};2;${color.r};${color.g};${color.b}`;
    }
  }

  private getAnsi256Index(color: RGBColor): number {
    const r = Math.round((color.r / 255) * 5);
    const g = Math.round((color.g / 255) * 5);
    const b = Math.round((color.b / 255) * 5);

    return 16 + 36 * r + 6 * g + b;
  }

  private getAnsi16Code(prefix: '38' | '48' | '58', color: RGBColor): number {
    if (prefix === '58') {
      return 59;
    }

    const codes = prefix === '38' ? ANSI16_FG_CODES : ANSI16_BG_CODES;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < ANSI16_COLORS.length; i += 1) {
      const candidate = ANSI16_COLORS[i]!;
      const distance =
        (color.r - candidate.r) ** 2 + (color.g - candidate.g) ** 2 + (color.b - candidate.b) ** 2;

      if (distance < closestDistance) {
        closestIndex = i;
        closestDistance = distance;
      }
    }

    return codes[closestIndex]!;
  }

  private resolveColorForProfile(color: RGBColor | null): RGBColor | null {
    return this.colorProfile === 'none' ? null : color;
  }

  private serializeHyperlink(previous: string | null, current: string | null): string {
    if (previous === current) {
      return '';
    }

    if (current === null) {
      return `${OSC}8;;${BEL}`;
    }

    return `${OSC}8;;${current}${BEL}`;
  }

  private createDefaultState(): StyleState {
    return {
      fg: null,
      bg: null,
      bold: false,
      italic: false,
      underline: 'none',
      underlineColor: null,
      strikethrough: false,
      faint: false,
      hyperlink: null,
    };
  }

  private resetState(state: StyleState): void {
    state.fg = null;
    state.bg = null;
    state.bold = false;
    state.italic = false;
    state.underline = 'none';
    state.underlineColor = null;
    state.strikethrough = false;
    state.faint = false;
    state.hyperlink = null;
  }

  private updateState(state: StyleState, cell: Readonly<Cell>): void {
    state.fg = cell.fg;
    state.bg = cell.bg;
    state.bold = cell.bold;
    state.italic = cell.italic;
    state.underline = cell.underline;
    state.underlineColor = cell.underlineColor;
    state.strikethrough = cell.strikethrough;
    state.faint = cell.faint;
    state.hyperlink = cell.hyperlink;
  }

  private areColorsEqual(left: RGBColor | null, right: RGBColor | null): boolean {
    if (left === null || right === null) {
      return left === right;
    }

    return left.r === right.r && left.g === right.g && left.b === right.b;
  }
}
