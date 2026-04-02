import type {UiButtonTone, UiButtonVariant} from './types';

/** Tag name used to register the built-in button component. */
export const UI_BUTTON_TAG_NAME = 'ui-button';

/** Observed custom element attributes for the built-in button. */
export const UI_BUTTON_OBSERVED_ATTRIBUTES = ['disabled', 'variant', 'tone'];

/** Default variant used when no explicit variant attribute is provided. */
export const DEFAULT_UI_BUTTON_VARIANT: UiButtonVariant = 'primary';

/** Default tone used when no explicit tone attribute is provided. */
export const DEFAULT_UI_BUTTON_TONE: UiButtonTone = 'default';

/** Number of terminal frames the pressed flash persists after Enter activation. */
export const UI_BUTTON_FLASH_FRAMES = 3;
