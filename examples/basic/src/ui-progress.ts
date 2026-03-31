import {UiProgress} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiProgress.tagName, UiProgress);

const app = createShell(document, 'ui-progress', 'Progress bar with animated fill.');
const status = createStatus(document, 'Progress: 0%');

/* ── Static values ─────────────────────────────────────── */
const s1 = createSection(document, 'Static progress values');
for (const v of [0, 25, 50, 75, 100]) {
  const row = document.createElement('div');
  row.className = 'row';
  const lbl = document.createElement('span');
  lbl.textContent = `${v}%:`;
  lbl.style.width = '5';
  const bar = document.createElement('ui-progress');
  bar.setAttribute('value', String(v));
  bar.setAttribute('max', '100');
  row.appendChild(lbl);
  row.appendChild(bar);
  s1.appendChild(row);
}
app.appendChild(s1);

/* ── Indeterminate ─────────────────────────────────────── */
const s2 = createSection(document, 'Indeterminate (no value)');
const indeterminate = document.createElement('ui-progress');
s2.appendChild(indeterminate);
app.appendChild(s2);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
