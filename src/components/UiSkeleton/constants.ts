/** Tag name used to register the built-in skeleton component. */
export const UI_SKELETON_TAG_NAME = 'ui-skeleton';

/** Observed custom element attributes for the built-in skeleton. */
export const UI_SKELETON_OBSERVED_ATTRIBUTES = ['width', 'height'];

/** Characters used for the pulsing animation. */
export const UI_SKELETON_FRAMES = ['░', '▒'] as const;

/** Default skeleton width in columns. */
export const DEFAULT_UI_SKELETON_WIDTH = 20;

/** Default skeleton height in rows. */
export const DEFAULT_UI_SKELETON_HEIGHT = 1;

/** Animation interval in milliseconds. */
export const UI_SKELETON_PULSE_INTERVAL = 600;
