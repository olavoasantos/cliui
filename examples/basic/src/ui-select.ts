import {UiSelect, UiOption, UiOptgroup} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiSelect.tagName, UiSelect);
window.customElements.define(UiOption.tagName, UiOption);
window.customElements.define(UiOptgroup.tagName, UiOptgroup);

const app = createShell(
  document,
  'ui-select + ui-optgroup',
  'Enter/Space opens. Arrows navigate. Enter selects. Escape closes. Type-ahead search.',
);
const status = createStatus(document, 'Selected: (none)');

/* ── Basic select ──────────────────────────────────────── */
const s1 = createSection(document, 'Basic select');
const sel1 = document.createElement('ui-select') as InstanceType<typeof UiSelect>;
sel1.setAttribute('tabindex', '0');
sel1.setAttribute('value', 'blue');
for (const c of ['Red', 'Green', 'Blue', 'Purple', 'Orange']) {
  const opt = document.createElement('ui-option');
  opt.setAttribute('value', c.toLowerCase());
  opt.textContent = c;
  sel1.appendChild(opt);
}
sel1.addEventListener('input', () => {
  status.textContent = `Color: ${sel1.getAttribute('value')}`;
});
s1.appendChild(sel1);
app.appendChild(s1);

/* ── With disabled options ─────────────────────────────── */
const s2 = createSection(document, 'Disabled options');
const sel2 = document.createElement('ui-select') as InstanceType<typeof UiSelect>;
sel2.setAttribute('tabindex', '0');
sel2.setAttribute('value', 'medium');
for (const [v, l, d] of [
  ['small', 'Small', false],
  ['medium', 'Medium', false],
  ['large', 'Large', false],
  ['xl', 'XL (out of stock)', true],
] as const) {
  const opt = document.createElement('ui-option');
  opt.setAttribute('value', v);
  opt.textContent = l;
  if (d) opt.setAttribute('disabled', '');
  sel2.appendChild(opt);
}
sel2.addEventListener('input', () => {
  status.textContent = `Size: ${sel2.getAttribute('value')}`;
});
s2.appendChild(sel2);
app.appendChild(s2);

/* ── Optgroups ─────────────────────────────────────────── */
const s3 = createSection(document, 'With optgroups');
const sel3 = document.createElement('ui-select') as InstanceType<typeof UiSelect>;
sel3.setAttribute('tabindex', '0');
sel3.setAttribute('value', 'apple');
const fruits = document.createElement('ui-optgroup');
fruits.setAttribute('label', 'Fruits');
for (const f of ['Apple', 'Banana', 'Cherry']) {
  const opt = document.createElement('ui-option');
  opt.setAttribute('value', f.toLowerCase());
  opt.textContent = f;
  fruits.appendChild(opt);
}
const vegs = document.createElement('ui-optgroup');
vegs.setAttribute('label', 'Vegetables');
for (const v of ['Carrot', 'Broccoli', 'Spinach']) {
  const opt = document.createElement('ui-option');
  opt.setAttribute('value', v.toLowerCase());
  opt.textContent = v;
  vegs.appendChild(opt);
}
sel3.appendChild(fruits);
sel3.appendChild(vegs);
sel3.addEventListener('input', () => {
  status.textContent = `Food: ${sel3.getAttribute('value')}`;
});
s3.appendChild(sel3);
app.appendChild(s3);

/* ── Many options (type-ahead test) ────────────────────── */
const s4 = createSection(document, 'Type-ahead (many options)');
const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Open and start typing to jump to matching options.';
const sel4 = document.createElement('ui-select') as InstanceType<typeof UiSelect>;
sel4.setAttribute('tabindex', '0');
for (const country of [
  'Argentina',
  'Australia',
  'Brazil',
  'Canada',
  'China',
  'Denmark',
  'Egypt',
  'France',
  'Germany',
  'India',
  'Japan',
  'Mexico',
  'Norway',
  'Poland',
  'Spain',
  'Sweden',
  'Turkey',
  'Ukraine',
  'Vietnam',
]) {
  const opt = document.createElement('ui-option');
  opt.setAttribute('value', country.toLowerCase());
  opt.textContent = country;
  sel4.appendChild(opt);
}
sel4.addEventListener('input', () => {
  status.textContent = `Country: ${sel4.getAttribute('value')}`;
});
s4.appendChild(hint);
s4.appendChild(sel4);
app.appendChild(s4);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
