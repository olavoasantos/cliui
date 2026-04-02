import {UiToolbar, UiButton} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiToolbar.tagName, UiToolbar);
window.customElements.define(UiButton.tagName, UiButton);

const style = document.createElement('style');
style.textContent = `
  ui-toolbar { border-style: single; border-color: #475569; padding: 0 1; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-toolbar',
  'Horizontal layout for action buttons. Tab between items.',
);
const status = createStatus(document, 'Action: (none)');

/* ── Basic toolbar ─────────────────────────────────────── */
const s1 = createSection(document, 'Basic toolbar');
const tb1 = document.createElement('ui-toolbar');
for (const [label, action] of [
  ['New', 'new'],
  ['Open', 'open'],
  ['Save', 'save'],
  ['Close', 'close'],
]) {
  const btn = document.createElement('ui-button');
  btn.setAttribute('variant', 'secondary');
  btn.setAttribute('tabindex', '0');
  btn.textContent = label!;
  btn.addEventListener('click', () => {
    status.textContent = `Action: ${action}`;
  });
  tb1.appendChild(btn);
}
s1.appendChild(tb1);
app.appendChild(s1);

/* ── Mixed controls ────────────────────────────────────── */
const s2 = createSection(document, 'Mixed controls');
const tb2 = document.createElement('ui-toolbar');
const run = document.createElement('ui-button');
run.setAttribute('variant', 'primary');
run.setAttribute('tabindex', '0');
run.textContent = '▶ Run';
run.addEventListener('click', () => {
  status.textContent = 'Action: run';
});
const stop = document.createElement('ui-button');
stop.setAttribute('variant', 'secondary');
stop.setAttribute('tabindex', '0');
stop.textContent = '■ Stop';
stop.addEventListener('click', () => {
  status.textContent = 'Action: stop';
});
const sep = document.createElement('span');
sep.textContent = '│';
const debug = document.createElement('ui-button');
debug.setAttribute('variant', 'secondary');
debug.setAttribute('tabindex', '0');
debug.textContent = '🔍 Debug';
debug.addEventListener('click', () => {
  status.textContent = 'Action: debug';
});
tb2.appendChild(run);
tb2.appendChild(stop);
tb2.appendChild(sep);
tb2.appendChild(debug);
s2.appendChild(tb2);
app.appendChild(s2);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
