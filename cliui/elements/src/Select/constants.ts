/** Tag name used to register the built-in select component. */
export const SELECT_TAG_NAME = 'select';

/** Observed custom element attributes for the built-in select. */
export const SELECT_OBSERVED_ATTRIBUTES = [
  'value',
  'disabled',
  'open',
  'width',
  'max-visible-options',
];

/** Character used as the dropdown indicator when collapsed. */
export const SELECT_INDICATOR_DOWN = '▾';

/** Character used as the dropdown indicator when expanded. */
export const SELECT_INDICATOR_UP = '▴';

/** Z-index for the dropdown listbox overlay. */
export const SELECT_LISTBOX_Z_INDEX = 10;

/** Default width in characters when no explicit width is set. */
export const DEFAULT_SELECT_WIDTH = 20;

/** Default maximum visible options before the listbox scrolls. */
export const DEFAULT_MAX_VISIBLE_OPTIONS = 8;

/** Minimum width in characters. */
export const MIN_SELECT_WIDTH = 5;
