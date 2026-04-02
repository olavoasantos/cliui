import {UiLog, UiButton} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiLog.tagName, UiLog);
window.customElements.define(UiButton.tagName, UiButton);

const style = document.createElement('style');
style.textContent = `
  ui-log { border-style: single; border-color: #475569; padding: 0 1; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-log',
  'Log viewer that shows the last N lines. Append lines, clear.',
);

const status = createStatus(document, 'Lines: 0');
let lineNum = 0;

/* ── Windowed log (last 8 visible) ─────────────────────── */
const s1 = createSection(document, 'Visible window (last 8 lines)');
const log1 = document.createElement('ui-log') as InstanceType<typeof UiLog>;
log1.setAttribute('height', '8');
const btnRow1 = document.createElement('div');
btnRow1.className = 'row';
const addBtn = document.createElement('ui-button');
addBtn.setAttribute('variant', 'primary');
addBtn.setAttribute('tabindex', '0');
addBtn.textContent = 'Add line';
addBtn.addEventListener('click', () => {
  lineNum++;
  log1.append(`[${new Date().toISOString().slice(11, 19)}] Log entry #${lineNum}`);
  status.textContent = `Lines: ${log1.getLineCount()} (showing last 8)`;
});
const add10 = document.createElement('ui-button');
add10.setAttribute('variant', 'primary');
add10.setAttribute('tabindex', '0');
add10.textContent = 'Add 10';
add10.addEventListener('click', () => {
  for (let i = 0; i < 10; i++) {
    lineNum++;
    log1.append(`[${new Date().toISOString().slice(11, 19)}] Batch entry #${lineNum}`);
  }
  status.textContent = `Lines: ${log1.getLineCount()} (showing last 8)`;
});
const clearBtn = document.createElement('ui-button');
clearBtn.setAttribute('variant', 'secondary');
clearBtn.setAttribute('tabindex', '0');
clearBtn.textContent = 'Clear';
clearBtn.addEventListener('click', () => {
  log1.clear();
  lineNum = 0;
  status.textContent = 'Lines: 0 (cleared)';
});
btnRow1.appendChild(addBtn);
btnRow1.appendChild(add10);
btnRow1.appendChild(clearBtn);
s1.appendChild(btnRow1);
s1.appendChild(log1);
app.appendChild(s1);

/* ── Max lines (capped history) ────────────────────────── */
const s2 = createSection(document, 'Max 5 retained lines');
const hint2 = document.createElement('div');
hint2.className = 'hint';
hint2.textContent = 'Only 5 lines are kept in memory. Oldest are discarded.';
const log2 = document.createElement('ui-log') as InstanceType<typeof UiLog>;
log2.setAttribute('max-lines', '5');
let maxNum = 0;
const addMax = document.createElement('ui-button');
addMax.setAttribute('variant', 'primary');
addMax.setAttribute('tabindex', '0');
addMax.textContent = 'Add line';
addMax.addEventListener('click', () => {
  maxNum++;
  log2.append(`Capped line #${maxNum}`);
  status.textContent = `Capped: ${log2.getLineCount()} retained (${maxNum} total added)`;
});
s2.appendChild(hint2);
s2.appendChild(addMax);
s2.appendChild(log2);
app.appendChild(s2);

/* ── Unlimited (show all) ──────────────────────────────── */
const s3 = createSection(document, 'Unlimited (no height cap)');
const hint3 = document.createElement('div');
hint3.className = 'hint';
hint3.textContent = 'No height attribute — all lines shown, container grows.';
const log3 = document.createElement('ui-log') as InstanceType<typeof UiLog>;
let unlimNum = 0;
const addUnlim = document.createElement('ui-button');
addUnlim.setAttribute('variant', 'primary');
addUnlim.setAttribute('tabindex', '0');
addUnlim.textContent = 'Add line';
addUnlim.addEventListener('click', () => {
  unlimNum++;
  log3.append(`Line #${unlimNum}`);
  status.textContent = `Unlimited: ${log3.getLineCount()} lines`;
});
s3.appendChild(hint3);
s3.appendChild(addUnlim);
s3.appendChild(log3);
app.appendChild(s3);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
