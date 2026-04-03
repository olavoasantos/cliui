import {UiBadge} from './UiBadge/component';
import {UiCard} from './UiCard/component';
import {UiCodeblock} from './UiCodeblock/component';
import {UiConfirmation} from './UiConfirmation/component';
import {UiDiff} from './UiDiff/component';
import {UiLog} from './UiLog/component';
import {UiMessage} from './UiMessage/component';
import {UiPrompt} from './UiPrompt/component';
import {UiSidebar} from './UiSidebar/component';
import {UiSkeleton} from './UiSkeleton/component';
import {UiSpinner} from './UiSpinner/component';
import {UiToast} from './UiToast/component';

/** Component constructor with styles metadata. */
interface StyledComponent {
  readonly tagName: string;
  new (...args: never[]): unknown;
}

import type {Window} from '@cliui/dom';

/** All tier 3 styled component entries: [tagName, constructor]. */
const STYLED_COMPONENTS: Array<[string, StyledComponent]> = [
  [UiBadge.tagName, UiBadge],
  [UiCard.tagName, UiCard],
  [UiCodeblock.tagName, UiCodeblock],
  [UiConfirmation.tagName, UiConfirmation],
  [UiDiff.tagName, UiDiff],
  [UiLog.tagName, UiLog],
  [UiMessage.tagName, UiMessage],
  [UiPrompt.tagName, UiPrompt],
  [UiSidebar.tagName, UiSidebar],
  [UiSkeleton.tagName, UiSkeleton],
  [UiSpinner.tagName, UiSpinner],
  [UiToast.tagName, UiToast],
];

/**
 * Registers all tier 3 styled components with a window.
 *
 * Components keep the `ui-*` prefix (`<ui-card>`, `<ui-badge>`, etc.)
 * and their styles remain in the author cascade — they are opinionated
 * and injected via `ensureCustomElementStyles()` on connect.
 *
 * Idempotent: calling multiple times is safe.
 *
 * @param window - The window to register styled components with.
 */
export function registerStyledComponents(window: Window): void {
  for (const [tag, Constructor] of STYLED_COMPONENTS) {
    if (!window.customElements.get(tag)) {
      window.customElements.define(tag, Constructor as never);
    }
  }
}
