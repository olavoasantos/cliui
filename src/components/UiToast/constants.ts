import type {UiToastVariant} from './types';

/** Tag name used to register the built-in toast component. */
export const UI_TOAST_TAG_NAME = 'ui-toast';

/** Observed custom element attributes for the built-in toast. */
export const UI_TOAST_OBSERVED_ATTRIBUTES = ['variant', 'duration'];

/** Default variant used when no explicit variant attribute is provided. */
export const DEFAULT_UI_TOAST_VARIANT: UiToastVariant = 'info';

/** Default duration in milliseconds before auto-removal. */
export const DEFAULT_UI_TOAST_DURATION = 3000;
