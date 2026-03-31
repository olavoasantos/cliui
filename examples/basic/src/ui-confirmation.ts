import {UiConfirmation, UiButton} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiConfirmation.tagName, UiConfirmation);
window.customElements.define(UiButton.tagName, UiButton);

const app = createShell(
  document,
  'ui-confirmation',
  'Modal confirmation dialogs. Confirm/Cancel or Escape to dismiss.',
);

const status = createStatus(document, 'Status: idle');

/* ── Basic confirm ─────────────────────────────────────── */

const s1 = createSection(document, 'Basic confirmation');
const btn1 = document.createElement('ui-button');
btn1.setAttribute('variant', 'primary');
btn1.setAttribute('tabindex', '0');
btn1.textContent = 'Delete item';
const confirm1 = document.createElement('ui-confirmation') as InstanceType<typeof UiConfirmation>;
confirm1.setAttribute(
  'message',
  'Are you sure you want to delete this item? This cannot be undone.',
);
document.body.appendChild(confirm1);

btn1.addEventListener('click', async () => {
  status.textContent = 'Waiting for confirmation...';
  const ok = await confirm1.confirm();
  status.textContent = ok ? 'Confirmed — item deleted!' : 'Cancelled — item kept.';
});
s1.appendChild(btn1);
app.appendChild(s1);

/* ── Custom labels ─────────────────────────────────────── */

const s2 = createSection(document, 'Custom button labels');
const btn2 = document.createElement('ui-button');
btn2.setAttribute('variant', 'primary');
btn2.setAttribute('tabindex', '0');
btn2.textContent = 'Save changes';
const confirm2 = document.createElement('ui-confirmation') as InstanceType<typeof UiConfirmation>;
confirm2.setAttribute('message', 'You have unsaved changes. Save before leaving?');
confirm2.setAttribute('confirm-label', 'Save');
confirm2.setAttribute('cancel-label', 'Discard');
document.body.appendChild(confirm2);

btn2.addEventListener('click', async () => {
  status.textContent = 'Waiting...';
  const ok = await confirm2.confirm();
  status.textContent = ok ? 'Changes saved.' : 'Changes discarded.';
});
s2.appendChild(btn2);
app.appendChild(s2);

/* ── Multiple sequential ───────────────────────────────── */

const s3 = createSection(document, 'Sequential confirmations');
const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Opens two confirmations in sequence.';
const btn3 = document.createElement('ui-button');
btn3.setAttribute('variant', 'primary');
btn3.setAttribute('tabindex', '0');
btn3.textContent = 'Multi-step';
const confirm3 = document.createElement('ui-confirmation') as InstanceType<typeof UiConfirmation>;
document.body.appendChild(confirm3);

btn3.addEventListener('click', async () => {
  confirm3.setAttribute('message', 'Step 1: Proceed with migration?');
  const step1 = await confirm3.confirm();
  if (!step1) {
    status.textContent = 'Aborted at step 1.';
    return;
  }
  confirm3.setAttribute('message', 'Step 2: This will restart the server. Continue?');
  const step2 = await confirm3.confirm();
  status.textContent = step2 ? 'Migration complete!' : 'Aborted at step 2.';
});
s3.appendChild(hint);
s3.appendChild(btn3);
app.appendChild(s3);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
