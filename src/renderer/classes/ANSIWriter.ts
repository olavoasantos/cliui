import {BEL, CSI, OSC} from '../constants/controlSequences';

import type {Cell, ChangedRegion, RGBColor, UnderlineStyle} from '../types';
import type {StyleState} from '../types/StyleState';

/**
 * Serializes changed cell regions into ANSI terminal escape sequences.
 *
 * The writer emits one cursor move per changed region, then streams cell
 * styling and character data while tracking the current style state so it can
 * avoid unnecessary full resets.
 */
export class ANSIWriter {
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

    return output;
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

    if (!this.areColorsEqual(previous.underlineColor, current.underlineColor)) {
      if (current.underlineColor === null) {
        codes.push('59');
      } else {
        codes.push(this.getColorCode('58', current.underlineColor));
      }
    }

    if (previous.strikethrough !== current.strikethrough) {
      codes.push(current.strikethrough ? '9' : '29');
    }

    if (!this.areColorsEqual(previous.fg, current.fg)) {
      if (current.fg === null) {
        codes.push('39');
      } else {
        codes.push(this.getColorCode('38', current.fg));
      }
    }

    if (!this.areColorsEqual(previous.bg, current.bg)) {
      if (current.bg === null) {
        codes.push('49');
      } else {
        codes.push(this.getColorCode('48', current.bg));
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
    return `${prefix};2;${color.r};${color.g};${color.b}`;
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
