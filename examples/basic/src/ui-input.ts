import {UiInput} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection, createStatus} from './_helpers';

const {terminal, document, window} = createDemo();
window.customElements.define(UiInput.tagName, UiInput);

const app = createShell(
  document,
  'ui-input',
  'Tab to focus. Type to enter text. Backspace to delete. Ctrl+Q quit.',
);
const status = createStatus(document, 'Value: (empty)');

/* ── Basic ─────────────────────────────────────────────── */
const s1 = createSection(document, 'Basic input');
const inp1 = document.createElement('ui-input') as InstanceType<typeof UiInput>;
inp1.setAttribute('tabindex', '0');
inp1.setAttribute('width', '30');
inp1.setAttribute('placeholder', 'Type something...');
inp1.addEventListener('input', () => {
  status.textContent = `Value: "${inp1.getAttribute('value') ?? ''}"`;
});
s1.appendChild(inp1);
app.appendChild(s1);

/* ── With default value ────────────────────────────────── */
const s2 = createSection(document, 'Pre-filled value');
const inp2 = document.createElement('ui-input');
inp2.setAttribute('tabindex', '0');
inp2.setAttribute('width', '30');
inp2.setAttribute('value', 'Hello, World!');
s2.appendChild(inp2);
app.appendChild(s2);

/* ── With max length ───────────────────────────────────── */
const s3 = createSection(document, 'Max length (10 chars)');
const inp3 = document.createElement('ui-input');
inp3.setAttribute('tabindex', '0');
inp3.setAttribute('width', '15');
inp3.setAttribute('maxlength', '10');
inp3.setAttribute('placeholder', 'Max 10...');
s3.appendChild(inp3);
app.appendChild(s3);

/* ── Various widths ────────────────────────────────────── */
const s4 = createSection(document, 'Various widths');
for (const w of [10, 20, 40, 60]) {
  const row = document.createElement('div');
  row.className = 'row';
  const lbl = document.createElement('span');
  lbl.className = 'label';
  lbl.textContent = `w=${w}:`;
  lbl.style.width = '6';
  const inp = document.createElement('ui-input');
  inp.setAttribute('tabindex', '0');
  inp.setAttribute('width', String(w));
  inp.setAttribute('placeholder', `Width ${w}`);
  row.appendChild(lbl);
  row.appendChild(inp);
  s4.appendChild(row);
}
app.appendChild(s4);

/* ── Disabled ──────────────────────────────────────────── */
const s5 = createSection(document, 'Disabled');
const inp5 = document.createElement('ui-input');
inp5.setAttribute('disabled', '');
inp5.setAttribute('width', '25');
inp5.setAttribute('value', 'Cannot edit');
s5.appendChild(inp5);
app.appendChild(s5);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
