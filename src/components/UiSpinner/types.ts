/** Supported built-in spinner variant names. */
export type UiSpinnerVariantName =
  | 'line'
  | 'dot'
  | 'mini-dot'
  | 'jump'
  | 'pulse'
  | 'points'
  | 'meter'
  | 'ellipsis';

/** Frame-set definition for a spinner variant. */
export interface UiSpinnerVariantDefinition {
  /** Ordered frame strings cycled by the spinner. */
  frames: string[];

  /** Default animation interval in milliseconds. */
  interval: number;
}
