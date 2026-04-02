import type {UiMessageTone} from './types';

/** Tag name used to register the built-in message component. */
export const UI_MESSAGE_TAG_NAME = 'ui-message';

/** Observed custom element attributes for the built-in message. */
export const UI_MESSAGE_OBSERVED_ATTRIBUTES = ['tone'];

/** Default tone used when no explicit tone attribute is provided. */
export const DEFAULT_UI_MESSAGE_TONE: UiMessageTone = 'info';

/** Icon prefix for each tone. */
export const UI_MESSAGE_ICONS: Record<UiMessageTone, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✗',
};
