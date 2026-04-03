import {appendUserAgentStyles} from '@cliui/terminal';
import {Breadcrumb} from './Breadcrumb/component';
import {Breadcrumbs} from './Breadcrumbs/component';
import {Dropdown} from './Dropdown/component';
import {Listbox} from './Listbox/component';
import {Navmenu} from './Navmenu/component';
import {NavmenuItem} from './NavmenuItem/component';
import {Paginator} from './Paginator/component';
import {Statusline} from './Statusline/component';
import {Tab} from './Tab/component';
import {Tabs} from './Tabs/component';
import {Toolbar} from './Toolbar/component';
import {Tree} from './Tree/component';
import {TreeItem} from './TreeItem/component';

/** Component constructor with styles metadata. */
interface StyledComponent {
  readonly styles: string;
  readonly tagName: string;
  new (...args: never[]): unknown;
}

import type {Window} from '@cliui/dom';

/** All tier 2 primitive component entries: [tagName, constructor, styles]. */
const PRIMITIVES: Array<[string, StyledComponent]> = [
  ['breadcrumb', Breadcrumb],
  ['breadcrumbs', Breadcrumbs],
  ['dropdown', Dropdown],
  ['listbox', Listbox],
  ['navmenu', Navmenu],
  ['navmenuitem', NavmenuItem],
  ['paginator', Paginator],
  ['statusline', Statusline],
  ['tab', Tab],
  ['tabs', Tabs],
  ['toolbar', Toolbar],
  ['tree', Tree],
  ['treeitem', TreeItem],
];

/**
 * Registers all tier 2 unstyled primitive components with a window.
 *
 * Components are registered with descriptive unprefixed tag names
 * (`<tabs>`, `<navmenu>`, `<tree>`, etc.) and their default styles
 * are injected at user-agent priority — minimal structural defaults
 * easily overridden by user stylesheets.
 *
 * Idempotent: calling multiple times is safe.
 *
 * @param window - The window to register primitives with.
 */
export function registerPrimitives(window: Window): void {
  const uaStyles: string[] = [];

  for (const [tag, Constructor] of PRIMITIVES) {
    if (!window.customElements.get(tag)) {
      window.customElements.define(tag, Constructor as never);
    }

    if (Constructor.styles) {
      uaStyles.push(Constructor.styles);
    }
  }

  if (uaStyles.length > 0) {
    appendUserAgentStyles(window.document, uaStyles.join('\n'));
  }
}
