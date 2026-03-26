import type {
  UiProgressSpringCoefficients,
  UiProgressVariantDefinition,
  UiProgressVariantName,
} from './types';

/** Tag name used to register the built-in progress component. */
export const UI_PROGRESS_TAG_NAME = 'ui-progress';

/** Default width, in characters, for the progress bar text rendering. */
export const DEFAULT_UI_PROGRESS_WIDTH = 10;

/** Default maximum value used when no explicit max is provided. */
export const DEFAULT_UI_PROGRESS_MAX = 100;

/** Default variant used when no explicit preset is provided. */
export const DEFAULT_UI_PROGRESS_VARIANT_NAME: UiProgressVariantName = 'blocks';

/** Minimum visible bar width allowed for attribute-driven sizing. */
export const MIN_UI_PROGRESS_WIDTH = 1;

/** Separator inserted between label, bar, and optional percentage text. */
export const UI_PROGRESS_PART_SEPARATOR = ' ';

/** Threshold below which the spring animation is considered settled. */
export const UI_PROGRESS_EQUILIBRIUM_DISTANCE = 0.001;

/** Threshold below which spring velocity is considered settled. */
export const UI_PROGRESS_EQUILIBRIUM_VELOCITY = 0.01;

/** Default spring frequency used for animated progress transitions. */
export const UI_PROGRESS_SPRING_FREQUENCY = 18;

/** Default spring damping ratio used for animated progress transitions. */
export const UI_PROGRESS_SPRING_DAMPING = 0.85;

/** Epsilon used by the spring coefficient calculation. */
export const UI_PROGRESS_SPRING_EPSILON = Number.EPSILON;

/** Observed custom element attributes for the built-in progress component. */
export const UI_PROGRESS_OBSERVED_ATTRIBUTES = [
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
export const UI_PROGRESS_VARIANTS: Record<UiProgressVariantName, UiProgressVariantDefinition> = {
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
export const UI_PROGRESS_STATIC_SPRING: UiProgressSpringCoefficients = {
  posPosCoefficient: 1,
  posVelCoefficient: 0,
  velPosCoefficient: 0,
  velVelCoefficient: 1,
};
