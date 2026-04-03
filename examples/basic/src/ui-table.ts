import {Table, Thead, Tbody, Tfoot, Tr, Th, Td} from '@cliui/elements';
import {createDemo, createShell, createSection} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(Table.tagName, Table);
window.customElements.define(Thead.tagName, Thead);
window.customElements.define(Tbody.tagName, Tbody);
window.customElements.define(Tfoot.tagName, Tfoot);
window.customElements.define(Tr.tagName, Tr);
window.customElements.define(Th.tagName, Th);
window.customElements.define(Td.tagName, Td);

const style = document.createElement('style');
style.textContent = `
  table { padding: 0 1; }
  th { color: #c4b5fd; }
  td { color: #e5e7eb; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'table',
  'HTML-inspired table structure with thead, tbody, tfoot.',
);

/* ── Full table ────────────────────────────────────────── */
const s1 = createSection(document, 'Full table with header, body, footer');
const table = document.createElement('table');
const thead = document.createElement('thead');
const headRow = document.createElement('tr');
for (const h of ['Name', 'Role', 'Status']) {
  const th = document.createElement('th');
  th.textContent = h;
  headRow.appendChild(th);
}
thead.appendChild(headRow);

const tbody = document.createElement('tbody');
for (const [name, role, stat] of [
  ['Alice', 'Engineer', 'Active'],
  ['Bob', 'Designer', 'Active'],
  ['Charlie', 'Manager', 'Away'],
  ['Diana', 'QA Lead', 'Active'],
]) {
  const tr = document.createElement('tr');
  for (const cell of [name, role, stat]) {
    const td = document.createElement('td');
    td.textContent = cell!;
    tr.appendChild(td);
  }
  tbody.appendChild(tr);
}

const tfoot = document.createElement('tfoot');
const footRow = document.createElement('tr');
const total = document.createElement('td');
total.textContent = 'Total';
const count = document.createElement('td');
count.textContent = '4 members';
const blank = document.createElement('td');
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
const table2 = document.createElement('table');
const tbody2 = document.createElement('tbody');
for (const [key, val] of [
  ['CPU', '42%'],
  ['Memory', '3.2 GB'],
  ['Disk', '67%'],
]) {
  const tr = document.createElement('tr');
  const k = document.createElement('td');
  k.textContent = key!;
  k.style.fontWeight = 'bold';
  const v = document.createElement('td');
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
