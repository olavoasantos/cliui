import type {CSSDeclaration} from './index';

/** A single keyframe stop within a `@keyframes` rule. */
export interface KeyframeBlock {
  /** Stop positions as percentages (0–100). `from` = 0, `to` = 100. */
  offsets: number[];
  /** Declarations at this stop. */
  declarations: CSSDeclaration[];
}

/** A parsed `@keyframes` rule. */
export interface KeyframeRule {
  /** The animation name. */
  name: string;
  /** Sorted keyframe blocks. */
  blocks: KeyframeBlock[];
}
