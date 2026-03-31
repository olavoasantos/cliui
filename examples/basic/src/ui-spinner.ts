import {UiSpinner} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiSpinner.tagName, UiSpinner);

const app = createShell(document, 'ui-spinner', 'Animated spinners with variants and labels.');

/* ── Default variant ───────────────────────────────────── */
const s1 = createSection(document, 'Default variant');
const sp1 = document.createElement('ui-spinner');
sp1.setAttribute('label', 'Loading...');
s1.appendChild(sp1);
app.appendChild(s1);

/* ── All variants ──────────────────────────────────────── */
const s2 = createSection(document, 'Variants');
for (const variant of ['dots', 'line', 'arc', 'bounce', 'bar']) {
  const sp = document.createElement('ui-spinner');
  sp.setAttribute('variant', variant);
  sp.setAttribute('label', variant);
  s2.appendChild(sp);
}
app.appendChild(s2);

/* ── Without label ─────────────────────────────────────── */
const s3 = createSection(document, 'No label');
const sp3 = document.createElement('ui-spinner');
s3.appendChild(sp3);
app.appendChild(s3);

/* ── Paused ────────────────────────────────────────────── */
const s4 = createSection(document, 'Paused');
const sp4 = document.createElement('ui-spinner');
sp4.setAttribute('paused', '');
sp4.setAttribute('label', 'Paused spinner');
s4.appendChild(sp4);
app.appendChild(s4);

document.body.appendChild(app);
await terminal.run();
