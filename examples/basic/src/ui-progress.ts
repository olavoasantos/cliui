import {UiProgress, UiButton} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiProgress.tagName, UiProgress);
window.customElements.define(UiButton.tagName, UiButton);

const app = createShell(
  document,
  'ui-progress',
  'Animated progress bar with spring physics. Click buttons to change value.',
);
const status = createStatus(document, 'Progress: 0%');

/* ── Animated progress ─────────────────────────────────── */
const s1 = createSection(document, 'Animated (spring physics)');
const hint1 = document.createElement('div');
hint1.className = 'hint';
hint1.textContent = 'Click buttons to jump to a value. Watch the bar animate with spring physics.';
const bar1 = document.createElement('ui-progress');
bar1.setAttribute('animated', '');
bar1.setAttribute('show-value', '');
bar1.setAttribute('value', '0');
bar1.setAttribute('max', '100');
bar1.setAttribute('width', '40');

const btnRow = document.createElement('div');
btnRow.className = 'row';
for (const pct of [0, 25, 50, 75, 100]) {
  const btn = document.createElement('ui-button');
  btn.setAttribute('variant', pct === 100 ? 'primary' : 'secondary');
  btn.setAttribute('tabindex', '0');
  btn.textContent = `${pct}%`;
  btn.addEventListener('click', () => {
    bar1.setAttribute('value', String(pct));
    status.textContent = `Target: ${pct}%`;
  });
  btnRow.appendChild(btn);
}
s1.appendChild(hint1);
s1.appendChild(bar1);
s1.appendChild(btnRow);
app.appendChild(s1);

/* ── Static values ─────────────────────────────────────── */
const s2 = createSection(document, 'Static (no animation)');
for (const v of [0, 25, 50, 75, 100]) {
  const row = document.createElement('div');
  row.className = 'row';
  const lbl = document.createElement('span');
  lbl.textContent = `${v}%:`;
  lbl.style.width = '5';
  const bar = document.createElement('ui-progress');
  bar.setAttribute('value', String(v));
  bar.setAttribute('max', '100');
  bar.setAttribute('width', '30');
  row.appendChild(lbl);
  row.appendChild(bar);
  s2.appendChild(row);
}
app.appendChild(s2);

/* ── With label ────────────────────────────────────────── */
const s3 = createSection(document, 'With label and percentage');
const bar3 = document.createElement('ui-progress');
bar3.setAttribute('value', '65');
bar3.setAttribute('max', '100');
bar3.setAttribute('width', '30');
bar3.setAttribute('label', 'Downloading');
bar3.setAttribute('show-value', '');
s3.appendChild(bar3);
app.appendChild(s3);

/* ── Incremental ───────────────────────────────────────── */
const s4 = createSection(document, 'Incremental (click to advance)');
const bar4 = document.createElement('ui-progress');
bar4.setAttribute('animated', '');
bar4.setAttribute('show-value', '');
bar4.setAttribute('value', '0');
bar4.setAttribute('max', '100');
bar4.setAttribute('width', '40');
let current = 0;
const incBtn = document.createElement('ui-button');
incBtn.setAttribute('variant', 'primary');
incBtn.setAttribute('tabindex', '0');
incBtn.textContent = '+10%';
incBtn.addEventListener('click', () => {
  current = Math.min(100, current + 10);
  bar4.setAttribute('value', String(current));
  status.textContent = `Incremental: ${current}%`;
});
const resetBtn = document.createElement('ui-button');
resetBtn.setAttribute('variant', 'secondary');
resetBtn.setAttribute('tabindex', '0');
resetBtn.textContent = 'Reset';
resetBtn.addEventListener('click', () => {
  current = 0;
  bar4.setAttribute('value', '0');
  status.textContent = 'Incremental: 0%';
});
const incRow = document.createElement('div');
incRow.className = 'row';
incRow.appendChild(incBtn);
incRow.appendChild(resetBtn);
s4.appendChild(bar4);
s4.appendChild(incRow);
app.appendChild(s4);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
