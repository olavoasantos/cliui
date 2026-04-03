import {Button} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(Button.tagName, Button);

const app = createShell(
  document,
  'button',
  'Tab to cycle buttons. Enter activates (flash). Space activates on release. Ctrl+Q quit.',
);

const status = createStatus(document, 'Status: idle');

/* ── Variants ──────────────────────────────────────────── */

const s1 = createSection(document, 'Variants');
const row1 = document.createElement('div');
row1.className = 'row';
for (const variant of ['primary', 'secondary'] as const) {
  const btn = document.createElement('button') as InstanceType<typeof Button>;
  btn.setAttribute('variant', variant);
  btn.setAttribute('tabindex', '0');
  btn.textContent = variant.charAt(0).toUpperCase() + variant.slice(1);
  btn.addEventListener('click', () => {
    status.textContent = `Clicked: ${variant}`;
  });
  row1.appendChild(btn);
}
s1.appendChild(row1);
app.appendChild(s1);

/* ── Tones ─────────────────────────────────────────────── */

const s2 = createSection(document, 'Tones');
const style = document.createElement('style');
style.textContent = `
  button[tone="dangerous"] { background-color: #dc2626; color: #fff; }
  button[tone="dangerous"]:focus { background-color: #b91c1c; }
`;
document.head.appendChild(style);

const row2 = document.createElement('div');
row2.className = 'row';
for (const tone of ['default', 'dangerous'] as const) {
  const btn = document.createElement('button');
  btn.setAttribute('variant', 'primary');
  btn.setAttribute('tone', tone);
  btn.setAttribute('tabindex', '0');
  btn.textContent = tone.charAt(0).toUpperCase() + tone.slice(1);
  btn.addEventListener('click', () => {
    status.textContent = `Clicked: ${tone} tone`;
  });
  row2.appendChild(btn);
}
s2.appendChild(row2);
app.appendChild(s2);

/* ── Disabled ──────────────────────────────────────────── */

const s3 = createSection(document, 'Disabled');
const disabledBtn = document.createElement('button');
disabledBtn.setAttribute('variant', 'primary');
disabledBtn.setAttribute('disabled', '');
disabledBtn.textContent = 'Disabled';
disabledBtn.addEventListener('click', () => {
  status.textContent = 'BUG: disabled button clicked!';
});
s3.appendChild(disabledBtn);
app.appendChild(s3);

/* ── Keyboard: Enter flash vs Space hold ───────────────── */

const s4 = createSection(document, 'Keyboard activation');
const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent =
  'Focus the button, try Enter (brief flash) vs Space (hold pressed, release fires).';
const kbBtn = document.createElement('button');
kbBtn.setAttribute('variant', 'primary');
kbBtn.setAttribute('tabindex', '0');
kbBtn.textContent = 'Press me';
kbBtn.addEventListener('click', () => {
  status.textContent = 'Keyboard activation!';
});
s4.appendChild(hint);
s4.appendChild(kbBtn);
app.appendChild(s4);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
