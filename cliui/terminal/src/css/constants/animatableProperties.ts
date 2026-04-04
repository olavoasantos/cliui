/** Interpolation method for an animatable CSS property. */
export type InterpolationType = 'color' | 'number-cell' | 'number-continuous' | 'discrete';

/**
 * Maps each animatable CSS property to its interpolation type.
 *
 * Properties not in this map are treated as discrete (non-animatable).
 */
export const ANIMATABLE_PROPERTIES: Record<string, InterpolationType> = {
  // Color
  color: 'color',
  'background-color': 'color',
  'border-color': 'color',
  'text-decoration-color': 'color',

  // Number (cell-based — rounded to integers)
  width: 'number-cell',
  height: 'number-cell',
  'min-width': 'number-cell',
  'min-height': 'number-cell',
  'max-width': 'number-cell',
  'max-height': 'number-cell',
  'padding-top': 'number-cell',
  'padding-right': 'number-cell',
  'padding-bottom': 'number-cell',
  'padding-left': 'number-cell',
  'margin-top': 'number-cell',
  'margin-right': 'number-cell',
  'margin-bottom': 'number-cell',
  'margin-left': 'number-cell',
  gap: 'number-cell',
  'row-gap': 'number-cell',
  'column-gap': 'number-cell',
  top: 'number-cell',
  left: 'number-cell',
  'flex-basis': 'number-cell',

  // Number (continuous — no rounding)
  opacity: 'number-continuous',
  'flex-grow': 'number-continuous',
  'flex-shrink': 'number-continuous',
  'z-index': 'number-continuous',

  // Discrete (snap at 50%)
  display: 'discrete',
  'flex-direction': 'discrete',
  'flex-wrap': 'discrete',
  'border-style': 'discrete',
  'font-weight': 'discrete',
  'font-style': 'discrete',
  'text-decoration': 'discrete',
  'text-align': 'discrete',
  'white-space': 'discrete',
  overflow: 'discrete',
  position: 'discrete',
  'justify-content': 'discrete',
  'align-items': 'discrete',
  'align-self': 'discrete',
  'box-sizing': 'discrete',
};
