import {UiTable, UiThead, UiTbody, UiTfoot, UiTr, UiTh, UiTd} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiTable.tagName, UiTable);
window.customElements.define(UiThead.tagName, UiThead);
window.customElements.define(UiTbody.tagName, UiTbody);
window.customElements.define(UiTfoot.tagName, UiTfoot);
window.customElements.define(UiTr.tagName, UiTr);
window.customElements.define(UiTh.tagName, UiTh);
window.customElements.define(UiTd.tagName, UiTd);

const style = document.createElement('style');
style.textContent = `
  ui-table { padding: 0 1; }
  ui-th { color: #c4b5fd; }
  ui-td { color: #e5e7eb; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-table',
  'HTML-inspired table structure with thead, tbody, tfoot.',
);

/* ── Full table ────────────────────────────────────────── */
const s1 = createSection(document, 'Full table with header, body, footer');
const table = document.createElement('ui-table');
const thead = document.createElement('ui-thead');
const headRow = document.createElement('ui-tr');
for (const h of ['Name', 'Role', 'Status']) {
  const th = document.createElement('ui-th');
  th.textContent = h;
  headRow.appendChild(th);
}
thead.appendChild(headRow);

const tbody = document.createElement('ui-tbody');
for (const [name, role, stat] of [
  ['Alice', 'Engineer', 'Active'],
  ['Bob', 'Designer', 'Active'],
  ['Charlie', 'Manager', 'Away'],
  ['Diana', 'QA Lead', 'Active'],
]) {
  const tr = document.createElement('ui-tr');
  for (const cell of [name, role, stat]) {
    const td = document.createElement('ui-td');
    td.textContent = cell!;
    tr.appendChild(td);
  }
  tbody.appendChild(tr);
}

const tfoot = document.createElement('ui-tfoot');
const footRow = document.createElement('ui-tr');
const total = document.createElement('ui-td');
total.textContent = 'Total';
const count = document.createElement('ui-td');
count.textContent = '4 members';
const blank = document.createElement('ui-td');
footRow.appendChild(total);
footRow.appendChild(count);
footRow.appendChild(blank);
tfoot.appendChild(footRow);

table.appendChild(thead);
table.appendChild(tbody);
table.appendChild(tfoot);
s1.appendChild(table);
app.appendChild(s1);

/* ── Body only ─────────────────────────────────────────── */
const s2 = createSection(document, 'Body only (no header/footer)');
const table2 = document.createElement('ui-table');
const tbody2 = document.createElement('ui-tbody');
for (const [key, val] of [
  ['CPU', '42%'],
  ['Memory', '3.2 GB'],
  ['Disk', '67%'],
]) {
  const tr = document.createElement('ui-tr');
  const k = document.createElement('ui-td');
  k.textContent = key!;
  k.style.fontWeight = 'bold';
  const v = document.createElement('ui-td');
  v.textContent = val!;
  tr.appendChild(k);
  tr.appendChild(v);
  tbody2.appendChild(tr);
}
table2.appendChild(tbody2);
s2.appendChild(table2);
app.appendChild(s2);

document.body.appendChild(app);
await terminal.run();
