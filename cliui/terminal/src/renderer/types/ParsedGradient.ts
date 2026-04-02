import type {ColorStop} from './ColorStop';

/** Parsed result of a `linear-gradient()` CSS value. */
export interface ParsedGradient {
  /** CSS angle in degrees (default 180 = top to bottom). */
  angleDeg: number;
  /** Color stops with normalized positions (0.0–1.0). */
  stops: ColorStop[];
}
