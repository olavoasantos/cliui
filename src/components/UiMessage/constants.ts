import type {UiMessageVariant} from './types';

/** Tag name used to register the built-in message component. */
export const UI_MESSAGE_TAG_NAME = 'ui-message';

/** Observed custom element attributes for the built-in message. */
export const UI_MESSAGE_OBSERVED_ATTRIBUTES = ['variant'];

/** Default variant used when no explicit variant attribute is provided. */
export const DEFAULT_UI_MESSAGE_VARIANT: UiMessageVariant = 'info';

/** Icon prefix for each variant. */
export const UI_MESSAGE_ICONS: Record<UiMessageVariant, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✗',
};
