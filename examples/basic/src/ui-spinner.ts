import {UiSpinner} from '@cliui/elements';
import {createDemo, createShell, createSection} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiSpinner.tagName, UiSpinner);

const app = createShell(document, 'ui-spinner', 'Animated spinners with variants and labels.');

/* ── All variants ──────────────────────────────────────── */
const s1 = createSection(document, 'All variants');
for (const variant of ['line', 'dot', 'mini-dot', 'jump', 'pulse', 'points', 'meter', 'ellipsis']) {
  const sp = document.createElement('ui-spinner');
  sp.setAttribute('variant', variant);
  sp.setAttribute('label', variant);
  s1.appendChild(sp);
}
app.appendChild(s1);

/* ── With labels ───────────────────────────────────────── */
const s2 = createSection(document, 'With labels');
const sp1 = document.createElement('ui-spinner');
sp1.setAttribute('variant', 'dot');
sp1.setAttribute('label', 'Loading...');
const sp2 = document.createElement('ui-spinner');
sp2.setAttribute('variant', 'points');
sp2.setAttribute('label', 'Processing');
const sp3 = document.createElement('ui-spinner');
sp3.setAttribute('variant', 'meter');
sp3.setAttribute('label', 'Uploading');
s2.appendChild(sp1);
s2.appendChild(sp2);
s2.appendChild(sp3);
app.appendChild(s2);

/* ── Without label ─────────────────────────────────────── */
const s3 = createSection(document, 'No label (spinner only)');
const row = document.createElement('div');
row.className = 'row';
for (const variant of ['line', 'dot', 'pulse', 'points']) {
  const sp = document.createElement('ui-spinner');
  sp.setAttribute('variant', variant);
  row.appendChild(sp);
}
s3.appendChild(row);
app.appendChild(s3);

/* ── Paused ────────────────────────────────────────────── */
const s4 = createSection(document, 'Paused');
const sp4 = document.createElement('ui-spinner');
sp4.setAttribute('variant', 'dot');
sp4.setAttribute('paused', '');
sp4.setAttribute('label', 'Paused spinner');
s4.appendChild(sp4);
app.appendChild(s4);

/* ── Custom interval ───────────────────────────────────── */
const s5 = createSection(document, 'Custom interval (500ms, slow)');
const sp5 = document.createElement('ui-spinner');
sp5.setAttribute('variant', 'line');
sp5.setAttribute('interval', '500');
sp5.setAttribute('label', 'Slow');
s5.appendChild(sp5);
app.appendChild(s5);

document.body.appendChild(app);
await terminal.run();
