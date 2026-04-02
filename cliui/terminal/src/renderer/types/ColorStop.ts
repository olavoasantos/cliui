import type {RGBColor} from './index';

/** A color stop with a normalized position (0.0–1.0). */
export interface ColorStop {
  color: RGBColor;
  position: number;
}
