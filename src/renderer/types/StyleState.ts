import type {RGBColor, UnderlineStyle} from '../types';

/** ANSI writer style state tracked across serialized cells. */
export interface StyleState {
  fg: RGBColor | null;
  bg: RGBColor | null;
  bold: boolean;
  italic: boolean;
  underline: UnderlineStyle;
  underlineColor: RGBColor | null;
  strikethrough: boolean;
  faint: boolean;
  hyperlink: string | null;
}
