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
    let state = this.createDefaultState();

    for (const region of regions) {
      output += `${CSI}${region.y + 1};${region.x + 1}H`;

      for (const cell of region.cells) {
        output += this.serializeHyperlink(state.hyperlink, cell.hyperlink);

        const sgrCodes = this.getSgrCodes(state, cell);

        if (sgrCodes.length > 0) {
          output += `${CSI}${sgrCodes.join(';')}m`;
        }

        output += cell.char;
        state = this.createStateFromCell(cell);
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

  private getSgrCodes(previous: StyleState, current: Cell): string[] {
    const codes: string[] = [];

    if (previous.bold !== current.bold || previous.faint !== current.faint) {
      if (previous.bold || previous.faint) {
        codes.push('22');
      }

      if (current.bold) {
        codes.push('1');
      }

      if (current.faint) {
        codes.push('2');
      }
    }

    if (previous.italic !== current.italic) {
      codes.push(current.italic ? '3' : '23');
    }

    if (previous.underline !== current.underline) {
      if (current.underline === 'none') {
        codes.push('24');
      } else {
        codes.push(this.getUnderlineCode(current.underline));
      }
    }

    const previousUnderlineColor = this.resolveColorForProfile(previous.underlineColor);
    const currentUnderlineColor = this.resolveColorForProfile(current.underlineColor);

    if (!this.areColorsEqual(previousUnderlineColor, currentUnderlineColor)) {
      if (currentUnderlineColor === null) {
        codes.push('59');
      } else {
        codes.push(this.getColorCode('58', currentUnderlineColor));
      }
    }

    if (previous.strikethrough !== current.strikethrough) {
      codes.push(current.strikethrough ? '9' : '29');
    }

    const previousForeground = this.resolveColorForProfile(previous.fg);
    const currentForeground = this.resolveColorForProfile(current.fg);

    if (!this.areColorsEqual(previousForeground, currentForeground)) {
      if (currentForeground === null) {
        codes.push('39');
      } else {
        codes.push(this.getColorCode('38', currentForeground));
      }
    }

    const previousBackground = this.resolveColorForProfile(previous.bg);
    const currentBackground = this.resolveColorForProfile(current.bg);

    if (!this.areColorsEqual(previousBackground, currentBackground)) {
      if (currentBackground === null) {
        codes.push('49');
      } else {
        codes.push(this.getColorCode('48', currentBackground));
      }
    }

    return codes;
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
    const channels = [color.r, color.g, color.b].map((channel) => Math.round((channel / 255) * 5));

    return 16 + 36 * channels[0]! + 6 * channels[1]! + channels[2]!;
  }

  private getAnsi16Code(prefix: '38' | '48' | '58', color: RGBColor): number {
    if (prefix === '58') {
      return 59;
    }

    const palette = [
      {code: prefix === '38' ? 30 : 40, color: {r: 0, g: 0, b: 0}},
      {code: prefix === '38' ? 31 : 41, color: {r: 128, g: 0, b: 0}},
      {code: prefix === '38' ? 32 : 42, color: {r: 0, g: 128, b: 0}},
      {code: prefix === '38' ? 33 : 43, color: {r: 128, g: 128, b: 0}},
      {code: prefix === '38' ? 34 : 44, color: {r: 0, g: 0, b: 128}},
      {code: prefix === '38' ? 35 : 45, color: {r: 128, g: 0, b: 128}},
      {code: prefix === '38' ? 36 : 46, color: {r: 0, g: 128, b: 128}},
      {code: prefix === '38' ? 37 : 47, color: {r: 192, g: 192, b: 192}},
      {code: prefix === '38' ? 90 : 100, color: {r: 128, g: 128, b: 128}},
      {code: prefix === '38' ? 91 : 101, color: {r: 255, g: 0, b: 0}},
      {code: prefix === '38' ? 92 : 102, color: {r: 0, g: 255, b: 0}},
      {code: prefix === '38' ? 93 : 103, color: {r: 255, g: 255, b: 0}},
      {code: prefix === '38' ? 94 : 104, color: {r: 0, g: 0, b: 255}},
      {code: prefix === '38' ? 95 : 105, color: {r: 255, g: 0, b: 255}},
      {code: prefix === '38' ? 96 : 106, color: {r: 0, g: 255, b: 255}},
      {code: prefix === '38' ? 97 : 107, color: {r: 255, g: 255, b: 255}},
    ];

    let closest = palette[0]!;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of palette) {
      const distance = this.getColorDistance(color, candidate.color);

      if (distance < closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }
    }

    return closest.code;
  }

  private getColorDistance(left: RGBColor, right: RGBColor): number {
    return (left.r - right.r) ** 2 + (left.g - right.g) ** 2 + (left.b - right.b) ** 2;
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

  private createStateFromCell(cell: Cell): StyleState {
    return {
      fg: cell.fg === null ? null : {...cell.fg},
      bg: cell.bg === null ? null : {...cell.bg},
      bold: cell.bold,
      italic: cell.italic,
      underline: cell.underline,
      underlineColor: cell.underlineColor === null ? null : {...cell.underlineColor},
      strikethrough: cell.strikethrough,
      faint: cell.faint,
      hyperlink: cell.hyperlink,
    };
  }

  private areColorsEqual(left: RGBColor | null, right: RGBColor | null): boolean {
    if (left === null || right === null) {
      return left === right;
    }

    return left.r === right.r && left.g === right.g && left.b === right.b;
  }
}
