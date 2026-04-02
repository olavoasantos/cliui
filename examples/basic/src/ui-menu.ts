import {UiMenu, UiMenuItem, UiDropdown, UiButton} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiMenu.tagName, UiMenu);
window.customElements.define(UiMenuItem.tagName, UiMenuItem);
window.customElements.define(UiDropdown.tagName, UiDropdown);
window.customElements.define(UiButton.tagName, UiButton);

const style = document.createElement('style');
style.textContent = `
  ui-menu { background-color: #1e293b; border-color: #475569; width: 25; }
  ui-menu-item { color: #e5e7eb; }
  ui-menu-item[highlighted] { background-color: #7c3aed; color: #fff; }
  ui-menu-item[disabled] { color: #64748b; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-menu + ui-dropdown',
  'Enter/click opens dropdown. Arrows navigate. Enter selects. Escape closes.',
);
const status = createStatus(document, 'Selected: (none)');

/* ── Basic dropdown ────────────────────────────────────── */
const s1 = createSection(document, 'Basic dropdown');
const dd1 = document.createElement('ui-dropdown') as InstanceType<typeof UiDropdown>;
dd1.setAttribute('tabindex', '0');
dd1.textContent = '▼ File';
const menu1 = document.createElement('ui-menu') as InstanceType<typeof UiMenu>;
for (const [value, label] of [
  ['new', 'New'],
  ['open', 'Open'],
  ['save', 'Save'],
  ['close', 'Close'],
]) {
  const item = document.createElement('ui-menu-item');
  item.setAttribute('value', value!);
  item.textContent = label!;
  menu1.appendChild(item);
}
dd1.appendChild(menu1);
menu1.addEventListener('select', () => {
  status.textContent = `Selected: ${(menu1 as any).getHighlightedValue()}`;
});
s1.appendChild(dd1);
app.appendChild(s1);

/* ── With disabled items ───────────────────────────────── */
const s2 = createSection(document, 'Disabled items');
const dd2 = document.createElement('ui-dropdown') as InstanceType<typeof UiDropdown>;
dd2.setAttribute('tabindex', '0');
dd2.textContent = '▼ Edit';
const menu2 = document.createElement('ui-menu') as InstanceType<typeof UiMenu>;
for (const [value, label, disabled] of [
  ['undo', 'Undo', false],
  ['redo', 'Redo', true],
  ['cut', 'Cut', false],
  ['copy', 'Copy', false],
  ['paste', 'Paste', true],
] as const) {
  const item = document.createElement('ui-menu-item');
  item.setAttribute('value', value);
  item.textContent = label;
  if (disabled) item.setAttribute('disabled', '');
  menu2.appendChild(item);
}
dd2.appendChild(menu2);
menu2.addEventListener('select', () => {
  status.textContent = `Edit: ${(menu2 as any).getHighlightedValue()}`;
});
s2.appendChild(dd2);
app.appendChild(s2);

/* ── Multiple dropdowns side by side ───────────────────── */
const s3 = createSection(document, 'Multiple dropdowns');
const row = document.createElement('div');
row.className = 'row';
for (const [label, items] of [
  ['▼ View', ['Zoom In', 'Zoom Out', 'Reset']],
  ['▼ Help', ['About', 'Documentation', 'Changelog']],
] as const) {
  const dd = document.createElement('ui-dropdown') as InstanceType<typeof UiDropdown>;
  dd.setAttribute('tabindex', '0');
  dd.textContent = label;
  const menu = document.createElement('ui-menu') as InstanceType<typeof UiMenu>;
  for (const text of items) {
    const item = document.createElement('ui-menu-item');
    item.setAttribute('value', text.toLowerCase().replace(' ', '-'));
    item.textContent = text;
    menu.appendChild(item);
  }
  dd.appendChild(menu);
  menu.addEventListener('select', () => {
    status.textContent = `${label}: ${(menu as any).getHighlightedValue()}`;
  });
  row.appendChild(dd);
}
s3.appendChild(row);
app.appendChild(s3);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
