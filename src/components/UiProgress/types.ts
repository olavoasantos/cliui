/** Supported visual presets for the built-in progress component. */
export type UiProgressVariantName = 'blocks' | 'ascii';

/** Visual preset definition for the built-in progress component. */
export interface UiProgressVariantDefinition {
  /** Character repeated across the filled portion of the bar. */
  fillChar: string;

  /** Character repeated across the unfilled portion of the bar. */
  emptyChar: string;
}

/** Precomputed spring coefficients for a damped progress animation step. */
export interface UiProgressSpringCoefficients {
  /** Position contribution from the previous position. */
  posPosCoefficient: number;

  /** Position contribution from the previous velocity. */
  posVelCoefficient: number;

  /** Velocity contribution from the previous position. */
  velPosCoefficient: number;

  /** Velocity contribution from the previous velocity. */
  velVelCoefficient: number;
}
