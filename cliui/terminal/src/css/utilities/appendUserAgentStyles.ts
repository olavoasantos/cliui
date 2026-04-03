import type {Document} from '@cliui/dom';

const UA_MARKER = 'data-ua-stylesheet';

/**
 * Appends CSS text to the document's user-agent stylesheet.
 *
 * The user-agent stylesheet is the `<style data-ua-stylesheet>` element
 * injected by the {@link StyleEngine} as the first `<style>` in `<head>`.
 * Styles placed here have the lowest cascade priority — any user `<style>`
 * block or inline style overrides them at equal specificity.
 *
 * This is the mechanism for tier 1 (HTML elements) and tier 2 (unstyled
 * primitives) component defaults. Tier 3 (styled `ui-*` components) use
 * the author cascade via `ensureCustomElementStyles()` instead.
 *
 * @param document - The owning document whose UA stylesheet is extended.
 * @param css - CSS text to append.
 */
export function appendUserAgentStyles(document: Document, css: string): void {
  const ua = document.head.querySelector(`[${UA_MARKER}]`);

  if (ua === null) {
    return;
  }

  ua.textContent = (ua.textContent ?? '') + '\n' + css;
}
