/**
 * User-agent stylesheet providing sensible terminal defaults for semantic
 * HTML elements.
 *
 * Injected by the {@link StyleEngine} as the first `<style>` element in
 * `<head>`, giving it the lowest cascade priority — any user stylesheet or
 * inline style overrides these rules.
 *
 * ## Design notes
 *
 * - `display: block` is sugar for `flex-direction: column` in this engine.
 * - `display: inline` is sugar for `flex-direction: row; flex-wrap: wrap`.
 * - Terminal text is always monospace, so font-family distinctions are not
 *   applicable; `code`/`kbd`/`samp`/`var` rely on color or dim instead.
 * - Border-width is always 1 cell, so `hr` uses `border-style` for its line.
 */
export const USER_AGENT_STYLESHEET = `
/* ── Block-level elements ─────────────────────────────── */

h1, h2, h3, h4, h5, h6 {
  display: block;
  font-weight: bold;
}

p, blockquote, pre, dl, dt, dd, hgroup, div {
  display: block;
}

ul, ol {
  display: block;
  padding-left: 2;
}

li {
  display: block;
}

blockquote {
  padding-left: 2;
}

pre {
  white-space: pre;
}

hr {
  display: block;
  height: 1;
}

/* ── Inline elements ──────────────────────────────────── */

span, a, strong, em, b, i, u, s,
code, kbd, samp, var, mark, q, cite,
abbr, time, br, wbr {
  display: inline;
}

/* ── Text styling ─────────────────────────────────────── */

strong, b {
  font-weight: bold;
}

em, i {
  font-style: italic;
}

u {
  text-decoration: underline;
}

s {
  text-decoration: line-through;
}

a {
  text-decoration: underline;
  color: #5f87ff;
}

mark {
  background-color: #ffff00;
  color: #000000;
}

code, kbd, samp, var {
  opacity: 0.8;
}

/* ── Dialog ───────────────────────────────────────────── */

dialog {
  display: none;
  position: absolute;
  border-style: single;
  padding: 1 2;
}

dialog[open] {
  display: block;
}
`;
