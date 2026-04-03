import type {ButtonTone, ButtonVariant} from './types';

/** Tag name used to register the built-in button component. */
export const BUTTON_TAG_NAME = 'button';

/** Observed custom element attributes for the built-in button. */
export const BUTTON_OBSERVED_ATTRIBUTES = ['disabled', 'variant', 'tone', 'type'];

/** Default variant used when no explicit variant attribute is provided. */
export const DEFAULT_BUTTON_VARIANT: ButtonVariant = 'primary';

/** Default tone used when no explicit tone attribute is provided. */
export const DEFAULT_BUTTON_TONE: ButtonTone = 'default';

/** Number of terminal frames the pressed flash persists after Enter activation. */
export const BUTTON_FLASH_FRAMES = 3;
