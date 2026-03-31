import type {UiBadgeTone} from './types';

/** Tag name used to register the built-in badge component. */
export const UI_BADGE_TAG_NAME = 'ui-badge';

/** Observed custom element attributes for the built-in badge. */
export const UI_BADGE_OBSERVED_ATTRIBUTES = ['tone'];

/** Default tone used when no explicit tone attribute is provided. */
export const DEFAULT_UI_BADGE_TONE: UiBadgeTone = 'default';
