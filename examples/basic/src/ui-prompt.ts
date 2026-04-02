import {UiPrompt, UiButton, UiInput} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiPrompt.tagName, UiPrompt);
window.customElements.define(UiButton.tagName, UiButton);
window.customElements.define(UiInput.tagName, UiInput);

const app = createShell(
  document,
  'ui-prompt',
  'Modal text input dialog. Enter confirms, Escape cancels.',
);
const status = createStatus(document, 'Status: idle');

/* ── Basic prompt ──────────────────────────────────────── */
const s1 = createSection(document, 'Basic prompt');
const btn1 = document.createElement('ui-button');
btn1.setAttribute('variant', 'primary');
btn1.setAttribute('tabindex', '0');
btn1.textContent = 'Ask name';
const prompt1 = document.createElement('ui-prompt') as InstanceType<typeof UiPrompt>;
prompt1.setAttribute('message', 'What is your name?');
document.body.appendChild(prompt1);
btn1.addEventListener('click', async () => {
  status.textContent = 'Waiting for input...';
  const value = await prompt1.prompt();
  status.textContent = value !== null ? `Hello, ${value}!` : 'Cancelled.';
});
s1.appendChild(btn1);
app.appendChild(s1);

/* ── With inline message ───────────────────────────────── */
const s2 = createSection(document, 'Prompt with dynamic message');
const btn2 = document.createElement('ui-button');
btn2.setAttribute('variant', 'primary');
btn2.setAttribute('tabindex', '0');
btn2.textContent = 'Rename file';
const prompt2 = document.createElement('ui-prompt') as InstanceType<typeof UiPrompt>;
prompt2.setAttribute('confirm-label', 'Rename');
prompt2.setAttribute('cancel-label', 'Keep');
document.body.appendChild(prompt2);
btn2.addEventListener('click', async () => {
  const name = await prompt2.prompt('Enter new filename:');
  status.textContent = name !== null ? `Renamed to: ${name}` : 'Rename cancelled.';
});
s2.appendChild(btn2);
app.appendChild(s2);

/* ── Sequential prompts ────────────────────────────────── */
const s3 = createSection(document, 'Sequential prompts');
const btn3 = document.createElement('ui-button');
btn3.setAttribute('variant', 'primary');
btn3.setAttribute('tabindex', '0');
btn3.textContent = 'Setup wizard';
const prompt3 = document.createElement('ui-prompt') as InstanceType<typeof UiPrompt>;
document.body.appendChild(prompt3);
btn3.addEventListener('click', async () => {
  const host = await prompt3.prompt('Database host:');
  if (host === null) {
    status.textContent = 'Setup cancelled.';
    return;
  }
  const port = await prompt3.prompt('Database port:');
  if (port === null) {
    status.textContent = 'Setup cancelled.';
    return;
  }
  status.textContent = `Connecting to ${host}:${port}...`;
});
s3.appendChild(btn3);
app.appendChild(s3);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
