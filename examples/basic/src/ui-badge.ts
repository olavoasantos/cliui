import {UiBadge} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiBadge.tagName, UiBadge);

const style = document.createElement('style');
style.textContent = `
  ui-badge { font-weight: bold; padding: 0 1; }
  ui-badge[tone='info'] { background-color: #3b82f6; color: #fff; }
  ui-badge[tone='success'] { background-color: #22c55e; color: #fff; }
  ui-badge[tone='warning'] { background-color: #eab308; color: #000; }
  ui-badge[tone='error'] { background-color: #ef4444; color: #fff; }
`;
document.head.appendChild(style);

const app = createShell(document, 'ui-badge', 'Inline status labels with tone-based coloring.');

/* ── All tones ─────────────────────────────────────────── */

const s1 = createSection(document, 'All tones');
const row = document.createElement('div');
row.className = 'row';
for (const [tone, text] of [
  ['default', 'DEFAULT'],
  ['info', 'INFO'],
  ['success', 'SUCCESS'],
  ['warning', 'WARNING'],
  ['error', 'ERROR'],
] as const) {
  const badge = document.createElement('ui-badge');
  badge.setAttribute('tone', tone);
  badge.textContent = text;
  row.appendChild(badge);
}
s1.appendChild(row);
app.appendChild(s1);

/* ── Numeric badges ────────────────────────────────────── */

const s2 = createSection(document, 'Numeric counters');
const row2 = document.createElement('div');
row2.className = 'row';
for (const [tone, count] of [
  ['info', '5'],
  ['error', '12'],
  ['warning', '!'],
  ['success', '✓'],
] as const) {
  const badge = document.createElement('ui-badge');
  badge.setAttribute('tone', tone);
  badge.textContent = count;
  row2.appendChild(badge);
}
s2.appendChild(row2);
app.appendChild(s2);

/* ── In context ────────────────────────────────────────── */

const s3 = createSection(document, 'In context (flex row)');
const contextRow = document.createElement('div');
contextRow.className = 'row';
const label1 = document.createElement('span');
label1.textContent = 'Build:';
const b1 = document.createElement('ui-badge');
b1.setAttribute('tone', 'success');
b1.textContent = 'PASSING';
const label2 = document.createElement('span');
label2.textContent = 'Coverage:';
const b2 = document.createElement('ui-badge');
b2.setAttribute('tone', 'warning');
b2.textContent = '78%';
const label3 = document.createElement('span');
label3.textContent = 'Alerts:';
const b3 = document.createElement('ui-badge');
b3.setAttribute('tone', 'error');
b3.textContent = '3';
contextRow.appendChild(label1);
contextRow.appendChild(b1);
contextRow.appendChild(label2);
contextRow.appendChild(b2);
contextRow.appendChild(label3);
contextRow.appendChild(b3);
s3.appendChild(contextRow);
app.appendChild(s3);

/* ── No tone (default styling) ─────────────────────────── */

const s4 = createSection(document, 'Default tone (no color)');
const defaultBadge = document.createElement('ui-badge');
defaultBadge.textContent = 'PLAIN';
s4.appendChild(defaultBadge);
app.appendChild(s4);

document.body.appendChild(app);
await terminal.run();
