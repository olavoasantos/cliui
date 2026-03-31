import {UiLabel, UiInput} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection, createStatus} from './_helpers';

const {terminal, document, window} = createDemo();
window.customElements.define(UiLabel.tagName, UiLabel);
window.customElements.define(UiInput.tagName, UiInput);

const app = createShell(document, 'ui-label', 'Click labels to focus their associated inputs.');
const status = createStatus(document, 'Focus: none');

/* ── Basic label → input ───────────────────────────────── */
const s1 = createSection(document, 'Label focuses input on click');
const lbl1 = document.createElement('ui-label');
lbl1.setAttribute('for', 'name-input');
lbl1.textContent = 'Name:';
const inp1 = document.createElement('ui-input');
inp1.setAttribute('id', 'name-input');
inp1.setAttribute('tabindex', '0');
inp1.setAttribute('width', '25');
inp1.setAttribute('placeholder', 'Click label above');
inp1.addEventListener('focus', () => {
  status.textContent = 'Focus: name-input';
});
s1.appendChild(lbl1);
s1.appendChild(inp1);
app.appendChild(s1);

/* ── Multiple labels ───────────────────────────────────── */
const s2 = createSection(document, 'Multiple label-input pairs');
for (const [label, id] of [
  ['Email:', 'email-input'],
  ['Phone:', 'phone-input'],
  ['Address:', 'addr-input'],
]) {
  const lbl = document.createElement('ui-label');
  lbl.setAttribute('for', id!);
  lbl.textContent = label!;
  const inp = document.createElement('ui-input');
  inp.setAttribute('id', id!);
  inp.setAttribute('tabindex', '0');
  inp.setAttribute('width', '25');
  inp.addEventListener('focus', () => {
    status.textContent = `Focus: ${id}`;
  });
  s2.appendChild(lbl);
  s2.appendChild(inp);
}
app.appendChild(s2);

/* ── Disabled label ────────────────────────────────────── */
const s3 = createSection(document, 'Disabled label (no focus forward)');
const lbl3 = document.createElement('ui-label');
lbl3.setAttribute('for', 'disabled-target');
lbl3.setAttribute('disabled', '');
lbl3.textContent = 'Disabled label:';
const inp3 = document.createElement('ui-input');
inp3.setAttribute('id', 'disabled-target');
inp3.setAttribute('tabindex', '0');
inp3.setAttribute('width', '25');
inp3.addEventListener('focus', () => {
  status.textContent = 'BUG: disabled label forwarded focus!';
});
s3.appendChild(lbl3);
s3.appendChild(inp3);
app.appendChild(s3);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
