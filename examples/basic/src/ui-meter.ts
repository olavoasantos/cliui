import {UiMeter} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiMeter.tagName, UiMeter);

const app = createShell(document, 'ui-meter', 'Scalar gauge displaying a value within a range.');
const status = createStatus(document, 'Value: 0.5');

/* ── Default range (0–1) ───────────────────────────────── */
const s1 = createSection(document, 'Default range 0–1');
for (const v of [0, 0.25, 0.5, 0.75, 1]) {
  const row = document.createElement('div');
  row.className = 'row';
  const lbl = document.createElement('span');
  lbl.textContent = `${v}:`;
  lbl.style.width = '5';
  const meter = document.createElement('ui-meter');
  meter.setAttribute('value', String(v));
  meter.setAttribute('width', '20');
  row.appendChild(lbl);
  row.appendChild(meter);
  s1.appendChild(row);
}
app.appendChild(s1);

/* ── Custom range ──────────────────────────────────────── */
const s2 = createSection(document, 'Custom range 0–100');
for (const v of [0, 25, 50, 80, 100]) {
  const row = document.createElement('div');
  row.className = 'row';
  const lbl = document.createElement('span');
  lbl.textContent = `${v}%:`;
  lbl.style.width = '5';
  const meter = document.createElement('ui-meter');
  meter.setAttribute('min', '0');
  meter.setAttribute('max', '100');
  meter.setAttribute('value', String(v));
  meter.setAttribute('width', '30');
  row.appendChild(lbl);
  row.appendChild(meter);
  s2.appendChild(row);
}
app.appendChild(s2);

/* ── Various widths ────────────────────────────────────── */
const s3 = createSection(document, 'Various widths at 60%');
for (const w of [10, 20, 40, 60]) {
  const row = document.createElement('div');
  row.className = 'row';
  const lbl = document.createElement('span');
  lbl.textContent = `w=${w}:`;
  lbl.style.width = '6';
  const meter = document.createElement('ui-meter');
  meter.setAttribute('value', '0.6');
  meter.setAttribute('width', String(w));
  row.appendChild(lbl);
  row.appendChild(meter);
  s3.appendChild(row);
}
app.appendChild(s3);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
