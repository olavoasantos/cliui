/** Tag name used to register the built-in textarea component. */
export const UI_TEXTAREA_TAG_NAME = 'ui-textarea';

/** Default number of visible rows when no explicit rows attribute is set. */
export const DEFAULT_UI_TEXTAREA_ROWS = 4;

/** Default number of visible columns when no explicit cols attribute is set. */
export const DEFAULT_UI_TEXTAREA_COLS = 40;

/** Minimum number of visible rows. */
export const MIN_UI_TEXTAREA_ROWS = 1;

/** Minimum number of visible columns. */
export const MIN_UI_TEXTAREA_COLS = 1;

/** Observed custom element attributes for the built-in textarea component. */
export const UI_TEXTAREA_OBSERVED_ATTRIBUTES = [
  'value',
  'placeholder',
  'disabled',
  'readonly',
  'rows',
  'cols',
];
