import type {
  ProgressSpringCoefficients,
  ProgressVariantDefinition,
  ProgressVariantName,
} from './types';

/** Tag name used to register the built-in progress component. */
export const PROGRESS_TAG_NAME = 'progress';

/** Default width, in characters, for the progress bar text rendering. */
export const DEFAULT_PROGRESS_WIDTH = 10;

/** Default maximum value used when no explicit max is provided. */
export const DEFAULT_PROGRESS_MAX = 100;

/** Default variant used when no explicit preset is provided. */
export const DEFAULT_PROGRESS_VARIANT_NAME: ProgressVariantName = 'blocks';

/** Minimum visible bar width allowed for attribute-driven sizing. */
export const MIN_PROGRESS_WIDTH = 1;

/** Separator inserted between label, bar, and optional percentage text. */
export const PROGRESS_PART_SEPARATOR = ' ';

/** Threshold below which the spring animation is considered settled. */
export const PROGRESS_EQUILIBRIUM_DISTANCE = 0.001;

/** Threshold below which spring velocity is considered settled. */
export const PROGRESS_EQUILIBRIUM_VELOCITY = 0.01;

/** Default spring frequency used for animated progress transitions. */
export const PROGRESS_SPRING_FREQUENCY = 18;

/** Default spring damping ratio used for animated progress transitions. */
export const PROGRESS_SPRING_DAMPING = 0.85;

/** Epsilon used by the spring coefficient calculation. */
export const PROGRESS_SPRING_EPSILON = Number.EPSILON;

/** Observed custom element attributes for the built-in progress component. */
export const PROGRESS_OBSERVED_ATTRIBUTES = [
  'value',
  'max',
  'animated',
  'label',
  'show-value',
  'width',
  'fill-char',
  'empty-char',
  'variant',
];

/** Named visual presets for the built-in progress component. */
export const PROGRESS_VARIANTS: Record<ProgressVariantName, ProgressVariantDefinition> = {
  blocks: {
    fillChar: '▓',
    emptyChar: '░',
  },
  ascii: {
    fillChar: '#',
    emptyChar: '-',
  },
};

/** Identity spring coefficients used when there is no active motion. */
export const PROGRESS_STATIC_SPRING: ProgressSpringCoefficients = {
  posPosCoefficient: 1,
  posVelCoefficient: 0,
  velPosCoefficient: 0,
  velVelCoefficient: 1,
};
