import {UiList} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiList.tagName, UiList);

const style = document.createElement('style');
style.textContent = `
  ui-list { border-style: single; border-color: #475569; padding: 0 1; width: 30; }
  ui-list:focus { border-color: #7c3aed; }
  ui-list div[highlighted] { background-color: #7c3aed; color: #fff; }
  ui-list div[selected] { color: #4ade80; font-weight: bold; }
  ui-list div[selected][highlighted] { background-color: #7c3aed; color: #4ade80; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-list',
  'Arrow Up/Down to navigate. Enter or click to select. Ctrl+Q quit.',
);
const status = createStatus(document, 'Selected: (none)');

/* ── Single select ─────────────────────────────────────── */
const s1 = createSection(document, 'Single selection');
const hint1 = document.createElement('div');
hint1.className = 'hint';
hint1.textContent = 'Arrow keys move highlight. Enter or click selects one item.';
const list1 = document.createElement('ui-list') as InstanceType<typeof UiList>;
list1.setAttribute('tabindex', '0');
for (const item of ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape']) {
  const div = document.createElement('div');
  div.setAttribute('value', item);
  div.textContent = item;
  list1.appendChild(div);
}
list1.addEventListener('select', () => {
  status.textContent = `Single: ${list1.getSelectedValue()}`;
});
s1.appendChild(hint1);
s1.appendChild(list1);
app.appendChild(s1);

/* ── Multi select ──────────────────────────────────────── */
const s2 = createSection(document, 'Multi selection');
const hint2 = document.createElement('div');
hint2.className = 'hint';
hint2.textContent =
  'Enter/Space toggles. Shift+Arrow extends range. Ctrl/Cmd+Click toggles one. Shift+Click selects range. Ctrl+A selects all.';
const list2 = document.createElement('ui-list') as InstanceType<typeof UiList>;
list2.setAttribute('tabindex', '0');
list2.setAttribute('mode', 'multi');
for (const item of ['Read', 'Write', 'Execute', 'Delete', 'Admin']) {
  const div = document.createElement('div');
  div.setAttribute('value', item);
  div.textContent = item;
  list2.appendChild(div);
}
list2.addEventListener('select', () => {
  const vals = list2.getSelectedValues();
  status.textContent = vals.length > 0 ? `Multi: [${vals.join(', ')}]` : 'Multi: (none)';
});
s2.appendChild(hint2);
s2.appendChild(list2);
app.appendChild(s2);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
