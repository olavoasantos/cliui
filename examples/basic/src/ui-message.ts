import {UiMessage} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiMessage.tagName, UiMessage);

const style = document.createElement('style');
style.textContent = `
  ui-message[tone='info'] { border-color: #60a5fa; color: #60a5fa; }
  ui-message[tone='success'] { border-color: #4ade80; color: #4ade80; }
  ui-message[tone='warning'] { border-color: #facc15; color: #facc15; }
  ui-message[tone='error'] { border-color: #f87171; color: #f87171; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-message',
  'Non-interactive message blocks with icon prefix and tone-based coloring.',
);

/* ── All tones ─────────────────────────────────────────── */
const s1 = createSection(document, 'All tones');
for (const [tone, text] of [
  ['info', 'This is an informational message providing context.'],
  ['success', 'Operation completed successfully! All checks passed.'],
  ['warning', 'Warning: Disk usage has exceeded 80%. Consider cleanup.'],
  ['error', 'Error: Failed to connect to the database. Check credentials.'],
] as const) {
  const msg = document.createElement('ui-message');
  msg.setAttribute('tone', tone);
  msg.textContent = text;
  s1.appendChild(msg);
}
app.appendChild(s1);

/* ── Short messages ────────────────────────────────────── */
const s2 = createSection(document, 'Short messages');
for (const [tone, text] of [
  ['info', 'Tip: Use Ctrl+S to save.'],
  ['success', 'Saved!'],
  ['warning', 'Unsaved changes.'],
  ['error', 'Permission denied.'],
] as const) {
  const msg = document.createElement('ui-message');
  msg.setAttribute('tone', tone);
  msg.textContent = text;
  s2.appendChild(msg);
}
app.appendChild(s2);

/* ── Default (no tone) ─────────────────────────────────── */
const s3 = createSection(document, 'Default tone');
const msg = document.createElement('ui-message');
msg.textContent = 'A message with no explicit tone attribute.';
s3.appendChild(msg);
app.appendChild(s3);

document.body.appendChild(app);
await terminal.run();
