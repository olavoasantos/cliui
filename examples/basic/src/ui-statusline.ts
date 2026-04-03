import {Statusline} from '@cliui/elements';
import {createDemo, createShell, createSection} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(Statusline.tagName, Statusline);

const style = document.createElement('style');
style.textContent = `
  statusline { background-color: #1e293b; color: #e5e7eb; padding: 0 1; gap: 1; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'statusline',
  'Status bar anchored at the bottom of the viewport. Scroll down to see it fixed.',
);

/* ── Info ──────────────────────────────────────────────── */
const s1 = createSection(document, 'Note');
const note = document.createElement('div');
note.textContent =
  'The status bar is at the absolute bottom of the viewport. You may need to scroll or resize to see it below the app content.';
s1.appendChild(note);
app.appendChild(s1);

document.body.appendChild(app);

/* ── The statusline ────────────────────────────────────── */
const bar = document.createElement('statusline');

const left = document.createElement('span');
left.style.display = 'inline';
left.textContent = ' NORMAL ';
left.style.backgroundColor = '#7c3aed';
left.style.color = '#fff';
left.style.fontWeight = 'bold';

const file = document.createElement('span');
file.style.display = 'inline';
file.style.flexGrow = '1';
file.textContent = ' src/components/index.ts';

const pos = document.createElement('span');
pos.style.display = 'inline';
pos.textContent = 'Ln 42, Col 8';

const sep = document.createElement('span');
sep.style.display = 'inline';
sep.textContent = ' │ ';

const enc = document.createElement('span');
enc.style.display = 'inline';
enc.textContent = 'UTF-8';

bar.appendChild(left);
bar.appendChild(file);
bar.appendChild(pos);
bar.appendChild(sep);
bar.appendChild(enc);
document.body.appendChild(bar);

await terminal.run();
