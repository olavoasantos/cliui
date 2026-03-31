import {UiBreadcrumbs, UiBreadcrumb} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection} from './_helpers';

const {terminal, document, window} = createDemo();
window.customElements.define(UiBreadcrumbs.tagName, UiBreadcrumbs);
window.customElements.define(UiBreadcrumb.tagName, UiBreadcrumb);

const app = createShell(
  document,
  'ui-breadcrumbs',
  'Navigation breadcrumbs with configurable separator.',
);

/* ── Default separator ─────────────────────────────────── */

const s1 = createSection(document, 'Default separator (›)');
const crumbs1 = document.createElement('ui-breadcrumbs');
for (const text of ['Home', 'Projects', 'terminal-dom', 'src']) {
  const seg = document.createElement('ui-breadcrumb');
  seg.textContent = text;
  crumbs1.appendChild(seg);
}
s1.appendChild(crumbs1);
app.appendChild(s1);

/* ── Custom separator ──────────────────────────────────── */

const s2 = createSection(document, 'Custom separator (/)');
const crumbs2 = document.createElement('ui-breadcrumbs');
crumbs2.setAttribute('separator', '/');
for (const text of ['usr', 'local', 'bin', 'node']) {
  const seg = document.createElement('ui-breadcrumb');
  seg.textContent = text;
  crumbs2.appendChild(seg);
}
s2.appendChild(crumbs2);
app.appendChild(s2);

/* ── Arrow separator ───────────────────────────────────── */

const s3 = createSection(document, 'Arrow separator (→)');
const crumbs3 = document.createElement('ui-breadcrumbs');
crumbs3.setAttribute('separator', '→');
for (const text of ['Start', 'Processing', 'Complete']) {
  const seg = document.createElement('ui-breadcrumb');
  seg.textContent = text;
  crumbs3.appendChild(seg);
}
s3.appendChild(crumbs3);
app.appendChild(s3);

/* ── Single segment ────────────────────────────────────── */

const s4 = createSection(document, 'Single segment (no separator)');
const crumbs4 = document.createElement('ui-breadcrumbs');
const seg = document.createElement('ui-breadcrumb');
seg.textContent = 'Dashboard';
crumbs4.appendChild(seg);
s4.appendChild(crumbs4);
app.appendChild(s4);

document.body.appendChild(app);
await terminal.run();
