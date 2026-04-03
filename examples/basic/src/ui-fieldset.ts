import {Fieldset, Form, Button, Input, Label} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(Fieldset.tagName, Fieldset);
window.customElements.define(Form.tagName, Form);
window.customElements.define(Button.tagName, Button);
window.customElements.define(Input.tagName, Input);
window.customElements.define(Label.tagName, Label);

const style = document.createElement('style');
style.textContent = `
  fieldset { border-color: #475569; }
  fieldset .fieldset-legend { color: #fbbf24; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'fieldset + form',
  'Form submit via Enter in input or Submit button. Reset clears all fields.',
);

const status = createStatus(document, 'Form: idle');

/* ── Fieldset standalone ───────────────────────────────── */

const s1 = createSection(document, 'Fieldset with legend');
const fs1 = document.createElement('fieldset');
fs1.setAttribute('legend', 'Personal Information');
const name1 = document.createElement('div');
name1.textContent = 'Name: Alice Johnson';
const email1 = document.createElement('div');
email1.textContent = 'Email: alice@example.com';
fs1.appendChild(name1);
fs1.appendChild(email1);
s1.appendChild(fs1);
app.appendChild(s1);

/* ── Fieldset without legend ───────────────────────────── */

const s2 = createSection(document, 'Fieldset without legend');
const fs2 = document.createElement('fieldset');
const item = document.createElement('div');
item.textContent = 'Just a bordered container, no title.';
fs2.appendChild(item);
s2.appendChild(fs2);
app.appendChild(s2);

/* ── Form with fieldsets ───────────────────────────────── */

const s3 = createSection(document, 'Form with submit + reset');
const form = document.createElement('form') as InstanceType<typeof Form>;

const fs3 = document.createElement('fieldset');
fs3.setAttribute('legend', 'Account');
const lbl1 = document.createElement('label');
lbl1.setAttribute('for', 'f-name');
lbl1.textContent = 'Name:';
const inp1 = document.createElement('input');
inp1.setAttribute('id', 'f-name');
inp1.setAttribute('tabindex', '0');
inp1.setAttribute('width', '25');
inp1.setAttribute('placeholder', 'Your name');
fs3.appendChild(lbl1);
fs3.appendChild(inp1);

const fs4 = document.createElement('fieldset');
fs4.setAttribute('legend', 'Preferences');
const lbl2 = document.createElement('label');
lbl2.setAttribute('for', 'f-color');
lbl2.textContent = 'Favorite color:';
const inp2 = document.createElement('input');
inp2.setAttribute('id', 'f-color');
inp2.setAttribute('tabindex', '0');
inp2.setAttribute('width', '25');
inp2.setAttribute('placeholder', 'e.g. blue');
fs4.appendChild(lbl2);
fs4.appendChild(inp2);

const btnRow = document.createElement('div');
btnRow.className = 'row';
const submitBtn = document.createElement('button');
submitBtn.setAttribute('type', 'submit');
submitBtn.setAttribute('variant', 'primary');
submitBtn.setAttribute('tabindex', '0');
submitBtn.textContent = 'Submit';
const resetBtn = document.createElement('button');
resetBtn.setAttribute('variant', 'secondary');
resetBtn.setAttribute('tabindex', '0');
resetBtn.textContent = 'Reset';
btnRow.appendChild(submitBtn);
btnRow.appendChild(resetBtn);

form.appendChild(fs3);
form.appendChild(fs4);
form.appendChild(btnRow);

form.addEventListener('submit', () => {
  const name = inp1.getAttribute('value') ?? '';
  const color = inp2.getAttribute('value') ?? '';
  status.textContent = `Submitted: name="${name}" color="${color}"`;
});
resetBtn.addEventListener('click', () => {
  (form as InstanceType<typeof Form>).reset();
  status.textContent = 'Form: reset';
});

s3.appendChild(form);
app.appendChild(s3);

/* ── Disabled form ─────────────────────────────────────── */

const s5 = createSection(document, 'Disabled form (submit blocked)');
const disabledForm = document.createElement('form') as InstanceType<typeof Form>;
disabledForm.setAttribute('disabled', '');
const disabledInput = document.createElement('input');
disabledInput.setAttribute('tabindex', '0');
disabledInput.setAttribute('width', '20');
const disabledSubmit = document.createElement('button');
disabledSubmit.setAttribute('type', 'submit');
disabledSubmit.setAttribute('variant', 'primary');
disabledSubmit.setAttribute('tabindex', '0');
disabledSubmit.textContent = 'Submit';
disabledForm.appendChild(disabledInput);
disabledForm.appendChild(disabledSubmit);
disabledForm.addEventListener('submit', () => {
  status.textContent = 'BUG: disabled form submitted!';
});
s5.appendChild(disabledForm);
app.appendChild(s5);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
