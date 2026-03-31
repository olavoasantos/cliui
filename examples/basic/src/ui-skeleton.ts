import {UiSkeleton} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection} from './_helpers';

const {terminal, document, window} = createDemo();
window.customElements.define(UiSkeleton.tagName, UiSkeleton);

const app = createShell(
  document,
  'ui-skeleton',
  'Pulsing loading placeholders. Watch the animation cycle.',
);

/* ── Various sizes ─────────────────────────────────────── */
const s1 = createSection(document, 'Various sizes');
for (const [w, h, label] of [
  [20, 1, 'Single line'],
  [30, 3, 'Card placeholder'],
  [50, 1, 'Wide bar'],
  [15, 5, 'Tall block'],
] as const) {
  const lbl = document.createElement('div');
  lbl.className = 'label';
  lbl.textContent = `${label} (${w}×${h}):`;
  const skel = document.createElement('ui-skeleton');
  skel.setAttribute('width', String(w));
  skel.setAttribute('height', String(h));
  s1.appendChild(lbl);
  s1.appendChild(skel);
}
app.appendChild(s1);

/* ── Side by side ──────────────────────────────────────── */
const s2 = createSection(document, 'Side by side in a row');
const row = document.createElement('div');
row.className = 'row';
for (const w of [10, 15, 20]) {
  const skel = document.createElement('ui-skeleton');
  skel.setAttribute('width', String(w));
  skel.setAttribute('height', '2');
  row.appendChild(skel);
}
s2.appendChild(row);
app.appendChild(s2);

document.body.appendChild(app);
await terminal.run();
