/** Describes a CSS easing function for animation/transition timing. */
export type EasingDescriptor =
  | {type: 'linear'}
  | {type: 'cubic-bezier'; x1: number; y1: number; x2: number; y2: number}
  | {type: 'steps'; count: number; position: StepPosition};

/** Step easing jump position. */
export type StepPosition = 'jump-start' | 'jump-end' | 'jump-both' | 'jump-none';
