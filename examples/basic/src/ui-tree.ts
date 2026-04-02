import {UiTree, UiTreeItem} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiTree.tagName, UiTree);
window.customElements.define(UiTreeItem.tagName, UiTreeItem);

const style = document.createElement('style');
style.textContent = `
  ui-tree { border-style: single; border-color: #475569; padding: 0 1; width: 40; }
  ui-tree:focus { border-color: #7c3aed; }
  ui-tree div[highlighted] { background-color: #7c3aed; color: #fff; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-tree',
  'Arrow Up/Down navigates. Right expands, Left collapses. Enter selects.',
);
const status = createStatus(document, 'Selected: (none)');

/* ── File tree ─────────────────────────────────────────── */
const s1 = createSection(document, 'File tree');
const tree1 = document.createElement('ui-tree') as InstanceType<typeof UiTree>;
tree1.setAttribute('tabindex', '0');

const src = document.createElement('ui-tree-item');
src.setAttribute('expandable', '');
src.setAttribute('value', 'src');
src.textContent = 'src';

const components = document.createElement('ui-tree-item');
components.setAttribute('expandable', '');
components.setAttribute('value', 'components');
components.textContent = 'components';

for (const name of ['UiButton', 'UiInput', 'UiSelect']) {
  const item = document.createElement('ui-tree-item');
  item.setAttribute('value', name);
  item.textContent = name;
  components.appendChild(item);
}

const utils = document.createElement('ui-tree-item');
utils.setAttribute('expandable', '');
utils.setAttribute('value', 'utils');
utils.textContent = 'utils';

for (const name of ['format.ts', 'parse.ts']) {
  const item = document.createElement('ui-tree-item');
  item.setAttribute('value', name);
  item.textContent = name;
  utils.appendChild(item);
}

const indexTs = document.createElement('ui-tree-item');
indexTs.setAttribute('value', 'index.ts');
indexTs.textContent = 'index.ts';

src.appendChild(components);
src.appendChild(utils);
src.appendChild(indexTs);

const pkg = document.createElement('ui-tree-item');
pkg.setAttribute('value', 'package.json');
pkg.textContent = 'package.json';

const readme = document.createElement('ui-tree-item');
readme.setAttribute('value', 'README.md');
readme.textContent = 'README.md';

tree1.appendChild(src);
tree1.appendChild(pkg);
tree1.appendChild(readme);

tree1.addEventListener('select', () => {
  status.textContent = `Selected: ${(tree1 as UiTree).getHighlightedValue() ?? '(none)'}`;
});

s1.appendChild(tree1);
app.appendChild(s1);

/* ── Flat list (no nesting) ────────────────────────────── */
const s2 = createSection(document, 'Flat (no nesting)');
const tree2 = document.createElement('ui-tree') as InstanceType<typeof UiTree>;
tree2.setAttribute('tabindex', '0');
for (const name of ['Alpha', 'Bravo', 'Charlie', 'Delta']) {
  const item = document.createElement('ui-tree-item');
  item.setAttribute('value', name);
  item.textContent = name;
  tree2.appendChild(item);
}
tree2.addEventListener('select', () => {
  status.textContent = `Flat: ${(tree2 as UiTree).getHighlightedValue() ?? '(none)'}`;
});
s2.appendChild(tree2);
app.appendChild(s2);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
