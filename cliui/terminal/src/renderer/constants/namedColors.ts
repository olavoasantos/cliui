import type {RGBColor} from '../types';

export const NAMED_COLORS: Record<string, RGBColor> = {
  black: {r: 0, g: 0, b: 0},
  white: {r: 255, g: 255, b: 255},
  red: {r: 255, g: 0, b: 0},
  green: {r: 0, g: 128, b: 0},
  blue: {r: 0, g: 0, b: 255},
  yellow: {r: 255, g: 255, b: 0},
  magenta: {r: 255, g: 0, b: 255},
  cyan: {r: 0, g: 255, b: 255},
  gray: {r: 128, g: 128, b: 128},
  grey: {r: 128, g: 128, b: 128},
  purple: {r: 128, g: 0, b: 128},
};
