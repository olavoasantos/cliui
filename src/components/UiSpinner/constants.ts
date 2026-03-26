import type {UiSpinnerVariantDefinition, UiSpinnerVariantName} from './types';

/** Tag name used to register the built-in spinner component. */
export const UI_SPINNER_TAG_NAME = 'ui-spinner';

/** Default spinner variant used when no explicit variant attribute is provided. */
export const DEFAULT_UI_SPINNER_VARIANT_NAME: UiSpinnerVariantName = 'line';

/** Default spacing inserted between the spinner glyph and its label. */
export const UI_SPINNER_LABEL_SEPARATOR = ' ';

/** Observed custom element attributes for the built-in spinner. */
export const UI_SPINNER_OBSERVED_ATTRIBUTES = ['variant', 'interval', 'paused', 'label'];

/** Named frame sets and default intervals derived from the Bubbles spinner reference. */
export const UI_SPINNER_VARIANTS: Record<UiSpinnerVariantName, UiSpinnerVariantDefinition> = {
  line: {
    frames: ['|', '/', '-', '\\'],
    interval: 100,
  },
  dot: {
    frames: ['⣾ ', '⣽ ', '⣻ ', '⢿ ', '⡿ ', '⣟ ', '⣯ ', '⣷ '],
    interval: 100,
  },
  'mini-dot': {
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    interval: 83,
  },
  jump: {
    frames: ['⢄', '⢂', '⢁', '⡁', '⡈', '⡐', '⡠'],
    interval: 100,
  },
  pulse: {
    frames: ['█', '▓', '▒', '░'],
    interval: 125,
  },
  points: {
    frames: ['∙∙∙', '●∙∙', '∙●∙', '∙∙●'],
    interval: 143,
  },
  meter: {
    frames: ['▱▱▱', '▰▱▱', '▰▰▱', '▰▰▰', '▰▰▱', '▰▱▱', '▱▱▱'],
    interval: 143,
  },
  ellipsis: {
    frames: ['', '.', '..', '...'],
    interval: 333,
  },
};
