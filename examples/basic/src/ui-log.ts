import {UiLog, UiButton} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection, createStatus} from './_helpers';

const {terminal, document, window} = createDemo();
window.customElements.define(UiLog.tagName, UiLog);
window.customElements.define(UiButton.tagName, UiButton);

const style = document.createElement('style');
style.textContent = `
  ui-log { border-style: single; border-color: #475569; padding: 0 1; height: 8; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-log',
  'Scrollable log viewer. Append lines, auto-scroll, clear.',
);

const status = createStatus(document, 'Lines: 0');
let lineNum = 0;

/* ── Unlimited log ─────────────────────────────────────── */
const s1 = createSection(document, 'Unlimited history');
const log1 = document.createElement('ui-log') as InstanceType<typeof UiLog>;
const btnRow1 = document.createElement('div');
btnRow1.className = 'row';
const addBtn = document.createElement('ui-button');
addBtn.setAttribute('variant', 'primary');
addBtn.setAttribute('tabindex', '0');
addBtn.textContent = 'Add line';
addBtn.addEventListener('click', () => {
  lineNum++;
  log1.append(`[${new Date().toISOString().slice(11, 19)}] Log entry #${lineNum}`);
  status.textContent = `Lines: ${log1.getLineCount()}`;
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
  status.textContent = `Lines: ${log1.getLineCount()}`;
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

/* ── Max lines ─────────────────────────────────────────── */
const s2 = createSection(document, 'Max 5 lines (oldest trimmed)');
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
  status.textContent = `Capped log: ${log2.getLineCount()} lines (added ${maxNum} total)`;
});
s2.appendChild(addMax);
s2.appendChild(log2);
app.appendChild(s2);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
