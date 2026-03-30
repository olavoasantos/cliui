import type {UiAlertVariant} from './types';

/** Tag name used to register the built-in alert component. */
export const UI_ALERT_TAG_NAME = 'ui-alert';

/** Observed custom element attributes for the built-in alert. */
export const UI_ALERT_OBSERVED_ATTRIBUTES = ['variant'];

/** Default variant used when no explicit variant attribute is provided. */
export const DEFAULT_UI_ALERT_VARIANT: UiAlertVariant = 'info';

/** Icon prefix for each variant. */
export const UI_ALERT_ICONS: Record<UiAlertVariant, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✗',
};
