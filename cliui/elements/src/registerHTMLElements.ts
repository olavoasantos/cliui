import {appendUserAgentStyles} from '@cliui/terminal';
import {Button} from './Button/component';
import {Details} from './Details/component';
import {Fieldset} from './Fieldset/component';
import {Form} from './Form/component';
import {Input} from './Input/component';
import {Label} from './Label/component';
import {Meter} from './Meter/component';
import {Optgroup} from './Optgroup/component';
import {Option} from './Option/component';
import {Progress} from './Progress/component';
import {Select} from './Select/component';
import {Table} from './Table/component';
import {Tbody} from './Tbody/component';
import {Td} from './Td/component';
import {Textarea} from './Textarea/component';
import {Tfoot} from './Tfoot/component';
import {Th} from './Th/component';
import {Thead} from './Thead/component';
import {Tr} from './Tr/component';

import type {Window} from '@cliui/dom';

/** Component constructor with styles metadata. */
interface StyledComponent {
  readonly styles: string;
  readonly tagName: string;
  new (...args: never[]): unknown;
}

/** All tier 1 HTML element component entries: [tagName, constructor]. */
const HTML_ELEMENTS: Array<[string, StyledComponent]> = [
  ['button', Button],
  ['details', Details],
  ['fieldset', Fieldset],
  ['form', Form],
  ['input', Input],
  ['label', Label],
  ['meter', Meter],
  ['optgroup', Optgroup],
  ['option', Option],
  ['progress', Progress],
  ['select', Select],
  ['table', Table],
  ['tbody', Tbody],
  ['td', Td],
  ['textarea', Textarea],
  ['tfoot', Tfoot],
  ['th', Th],
  ['thead', Thead],
  ['tr', Tr],
];

/**
 * Registers all tier 1 HTML element components with a window.
 *
 * Components are registered with standard HTML tag names (`<button>`,
 * `<input>`, `<table>`, etc.) and their default styles are injected
 * at user-agent priority — any user `<style>` overrides them.
 *
 * Idempotent: calling multiple times is safe.
 *
 * @param window - The window to register elements with.
 */
export function registerHTMLElements(window: Window): void {
  const uaStyles: string[] = [];

  for (const [tag, Constructor] of HTML_ELEMENTS) {
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
