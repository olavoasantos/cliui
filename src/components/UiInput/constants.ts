/** Tag name used to register the built-in text input component. */
export const UI_INPUT_TAG_NAME = 'ui-input';

/** Character displayed at the cursor position when the input is focused. */
export const UI_INPUT_CURSOR_CHAR = '█';

/** Character displayed at the cursor position when the input is blurred. */
export const UI_INPUT_CURSOR_CHAR_BLURRED = '';

/** Default width in characters for the text input when no explicit width is set. */
export const DEFAULT_UI_INPUT_WIDTH = 20;

/** Minimum width in characters for the text input. */
export const MIN_UI_INPUT_WIDTH = 1;

/** Interval in milliseconds for cursor blink toggling. */
export const UI_INPUT_CURSOR_BLINK_INTERVAL = 530;

/** Observed custom element attributes for the built-in text input component. */
export const UI_INPUT_OBSERVED_ATTRIBUTES = [
  'value',
  'placeholder',
  'disabled',
  'readonly',
  'maxlength',
  'width',
];
