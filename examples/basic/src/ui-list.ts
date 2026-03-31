import {UiList} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection, createStatus} from './_helpers';

const {terminal, document, window} = createDemo();
window.customElements.define(UiList.tagName, UiList);

const style = document.createElement('style');
style.textContent = `
  ui-list { border-style: single; border-color: #475569; padding: 0 1; width: 30; }
  ui-list:focus { border-color: #7c3aed; }
  ui-list div[highlighted] { background-color: #7c3aed; color: #fff; }
  ui-list div[selected] { font-weight: bold; }
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
const list1 = document.createElement('ui-list') as InstanceType<typeof UiList>;
list1.setAttribute('tabindex', '0');
for (const item of ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape']) {
  const div = document.createElement('div');
  div.setAttribute('value', item);
  div.textContent = item;
  list1.appendChild(div);
}
list1.addEventListener('select', () => {
  status.textContent = `Selected: ${(list1 as any).getSelectedValue()}`;
});
s1.appendChild(list1);
app.appendChild(s1);

/* ── Multi select ──────────────────────────────────────── */
const s2 = createSection(document, 'Multi selection');
const list2 = document.createElement('ui-list') as InstanceType<typeof UiList>;
list2.setAttribute('tabindex', '0');
list2.setAttribute('mode', 'multi');
for (const item of ['Read', 'Write', 'Execute', 'Delete']) {
  const div = document.createElement('div');
  div.setAttribute('value', item);
  div.textContent = item;
  list2.appendChild(div);
}
list2.addEventListener('select', () => {
  status.textContent = `Multi: ${(list2 as any).getSelectedValues?.() ?? (list2 as any).getSelectedValue()}`;
});
s2.appendChild(list2);
app.appendChild(s2);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
