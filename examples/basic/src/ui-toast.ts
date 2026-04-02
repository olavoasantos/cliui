import {UiToast, UiButton} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiToast.tagName, UiToast);
window.customElements.define(UiButton.tagName, UiButton);

const style = document.createElement('style');
style.textContent = `
  ui-toast { background-color: #1e293b; border-style: single; padding: 0 2; }
  ui-toast[tone='info'] { border-color: #60a5fa; color: #60a5fa; }
  ui-toast[tone='success'] { border-color: #4ade80; color: #4ade80; }
  ui-toast[tone='warning'] { border-color: #facc15; color: #facc15; }
  ui-toast[tone='error'] { border-color: #f87171; color: #f87171; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-toast',
  'Click buttons to spawn toasts. They auto-dismiss after their duration.',
);
const status = createStatus(document, 'Toasts: 0');

let count = 0;
const container = document.createElement('div');
container.style.position = 'relative';
container.style.display = 'block';

/* ── Tone buttons ──────────────────────────────────────── */
const s1 = createSection(document, 'Spawn toasts by tone');
const row = document.createElement('div');
row.className = 'row';
for (const [tone, duration] of [
  ['info', 3000],
  ['success', 2000],
  ['warning', 4000],
  ['error', 5000],
] as const) {
  const btn = document.createElement('ui-button');
  btn.setAttribute('variant', 'primary');
  btn.setAttribute('tabindex', '0');
  btn.textContent = `${tone} (${duration / 1000}s)`;
  btn.addEventListener('click', () => {
    count++;
    const toast = document.createElement('ui-toast') as InstanceType<typeof UiToast>;
    toast.setAttribute('tone', tone);
    toast.setAttribute('duration', String(duration));
    toast.style.top = String(count - 1);
    toast.textContent = `Toast #${count}: ${tone}`;
    container.appendChild(toast);
    status.textContent = `Toasts spawned: ${count}`;
  });
  row.appendChild(btn);
}
s1.appendChild(row);
s1.appendChild(container);
app.appendChild(s1);

/* ── Rapid fire ────────────────────────────────────────── */
const s2 = createSection(document, 'Rapid fire (5 at once)');
const rapidBtn = document.createElement('ui-button');
rapidBtn.setAttribute('variant', 'primary');
rapidBtn.setAttribute('tabindex', '0');
rapidBtn.textContent = 'Fire 5 toasts';
const rapidContainer = document.createElement('div');
rapidContainer.style.position = 'relative';
rapidContainer.style.display = 'block';
rapidBtn.addEventListener('click', () => {
  for (let i = 0; i < 5; i++) {
    count++;
    const toast = document.createElement('ui-toast') as InstanceType<typeof UiToast>;
    toast.setAttribute('tone', (['info', 'success', 'warning', 'error'] as const)[i % 4]!);
    toast.setAttribute('duration', String(1500 + i * 500));
    toast.style.top = String(i);
    toast.textContent = `Rapid #${count}`;
    rapidContainer.appendChild(toast);
  }
  status.textContent = `Toasts spawned: ${count}`;
});
s2.appendChild(rapidBtn);
s2.appendChild(rapidContainer);
app.appendChild(s2);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
