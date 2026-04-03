import {registerHTMLElements} from './registerHTMLElements';
import {registerPrimitives} from './registerPrimitives';
import {registerStyledComponents} from './registerStyledComponents';

import type {Window} from '@cliui/dom';

/**
 * Registers all component tiers with a window.
 *
 * Convenience wrapper that calls {@link registerHTMLElements},
 * {@link registerPrimitives}, and {@link registerStyledComponents}.
 *
 * Idempotent: calling multiple times is safe.
 *
 * @param window - The window to register all components with.
 */
export function registerAll(window: Window): void {
  registerHTMLElements(window);
  registerPrimitives(window);
  registerStyledComponents(window);
}
