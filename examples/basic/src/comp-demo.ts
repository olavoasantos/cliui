import {Terminal} from '@cliui/terminal';
import {
  UiBadge,
  Button,
  Dropdown,
  Fieldset,
  Form,
  Input,
  Label,
  Listbox,
  Navmenu,
  NavmenuItem,
  UiMessage,
  Optgroup,
  Option,
  Select,
  Tab,
  Tabs,
  UiToast,
} from '@cliui/elements';

process.stdin.setRawMode?.(true);
process.stdin.resume();

const terminal = new Terminal({
  altScreen: true,
  mouse: true,
  fps: 30,
  output: process.stdout,
  input: process.stdin,
});

const {document, window} = terminal;

window.customElements.define(UiBadge.tagName, UiBadge);
window.customElements.define(Button.tagName, Button);
window.customElements.define(Dropdown.tagName, Dropdown);
window.customElements.define(Fieldset.tagName, Fieldset);
window.customElements.define(Form.tagName, Form);
window.customElements.define(Input.tagName, Input);
window.customElements.define(Label.tagName, Label);
window.customElements.define(Listbox.tagName, Listbox);
window.customElements.define(Navmenu.tagName, Navmenu);
window.customElements.define(NavmenuItem.tagName, NavmenuItem);
window.customElements.define(UiMessage.tagName, UiMessage);
window.customElements.define(Optgroup.tagName, Optgroup);
window.customElements.define(Option.tagName, Option);
window.customElements.define(Select.tagName, Select);
window.customElements.define(Tab.tagName, Tab);
window.customElements.define(Tabs.tagName, Tabs);
window.customElements.define(UiToast.tagName, UiToast);

const style = document.createElement('style');
style.textContent = `
  .app {
    padding: 1 2;
    color: #e5e7eb;
    background-color: #0f172a;
    display: flex;
    flex-direction: column;
    gap: 1;
  }
  .section {
    border-style: rounded;
    border-color: #475569;
    padding: 1 2;
    display: flex;
    flex-direction: column;
    gap: 1;
  }
  .section-title { color: #c4b5fd; font-weight: bold; }
  .row { display: flex; flex-direction: row; gap: 2; }
  .hint { color: #64748b; }
  .status { color: #86efac; }

  button[variant="primary"] {
    color: #ffffff; background-color: #7c3aed; padding: 0 2;
  }
  button[variant="primary"]:focus { background-color: #6d28d9; }
  button[variant="secondary"] {
    color: #e5e7eb; background-color: #334155; padding: 0 2;
  }
  button[variant="secondary"]:focus { background-color: #475569; }

  input {
    color: #e5e7eb; background-color: #1e293b;
  }
  input:focus { background-color: #334155; }

  select {
    color: #e5e7eb; background-color: #1e293b;
    text-decoration: none; width: 25;
  }
  select:focus { background-color: #334155; }
  select .select-listbox { background-color: #1e293b; }
  option { display: block; color: #e5e7eb; }
  option[highlighted] { background-color: #7c3aed; color: #ffffff; }
  option[selected] { font-weight: bold; }
  option[disabled] { color: #64748b; }
  .optgroup-label { color: #c4b5fd; }

  fieldset { border-color: #475569; }
  fieldset .fieldset-legend { color: #fbbf24; }

  tabs:focus .tabs-bar div[data-active] { color: #c4b5fd; }

  listbox {
    border-style: single; border-color: #475569;
    padding: 0 1; width: 30;
  }
  listbox:focus { border-color: #7c3aed; }
  listbox div[highlighted] { background-color: #7c3aed; color: #ffffff; }
  listbox div[selected] { font-weight: bold; }

  navmenu { background-color: #1e293b; border-color: #475569; width: 20; }
  navmenuitem[highlighted] { background-color: #7c3aed; color: #ffffff; }

  ui-message[tone='info'] { border-color: #60a5fa; color: #60a5fa; }
  ui-message[tone='success'] { border-color: #4ade80; color: #4ade80; }
  ui-message[tone='warning'] { border-color: #facc15; color: #facc15; }
  ui-message[tone='error'] { border-color: #f87171; color: #f87171; }

  ui-badge { font-weight: bold; padding: 0 1; }
  ui-badge[tone='info'] { background-color: #3b82f6; color: #ffffff; }
  ui-badge[tone='success'] { background-color: #22c55e; color: #ffffff; }
  ui-badge[tone='warning'] { background-color: #eab308; color: #000000; }
  ui-badge[tone='error'] { background-color: #ef4444; color: #ffffff; }

  ui-toast { background-color: #1e293b; border-style: single; border-color: #475569; }

  dialog {
    background-color: #1e293b; border-color: #7c3aed;
    color: #e5e7eb; width: 50;
  }
  dialog[modal] { border-color: #f59e0b; }
`;
document.head.appendChild(style);

const app = document.createElement('div');
app.className = 'app';

const title = document.createElement('h1');
title.textContent = 'Component Roster Demo';
const hint = document.createElement('p');
hint.textContent =
  'Tab to cycle. Arrow keys navigate. Enter/Space activate. Click items. Ctrl+Q quit.';
hint.className = 'hint';

/* ── Helper ────────────────────────────────────────────── */

function section(titleText: string): {container: typeof app; titleEl: typeof title} {
  const container = document.createElement('div');
  container.className = 'section';
  const titleEl = document.createElement('div');
  titleEl.className = 'section-title';
  titleEl.textContent = titleText;
  container.appendChild(titleEl);
  return {container, titleEl};
}

/* ── UA Stylesheet ────────────────────────────────────── */

const s1 = section('User-Agent Stylesheet');
const headings = document.createElement('div');
const h2 = document.createElement('h2');
h2.textContent = 'Heading 2 (bold block)';
const h3 = document.createElement('h3');
h3.textContent = 'Heading 3 (bold block)';
headings.appendChild(h2);
headings.appendChild(h3);
s1.container.appendChild(headings);

for (const [tag, text] of [
  ['strong', 'Bold text (strong)'],
  ['em', 'Italic text (em)'],
  ['u', 'Underlined text (u)'],
  ['s', 'Strikethrough text (s)'],
  ['code', 'Inline code: const x = 42'],
  ['mark', 'Highlighted text (mark)'],
] as const) {
  const el = document.createElement(tag);
  el.textContent = text;
  s1.container.appendChild(el);
}

const elPre = document.createElement('pre');
elPre.textContent = '  Preformatted (pre)\n  preserves   spaces';
s1.container.appendChild(elPre);

const elUl = document.createElement('ul');
for (const text of ['List item 1 (indented)', 'List item 2']) {
  const li = document.createElement('li');
  li.textContent = text;
  elUl.appendChild(li);
}
s1.container.appendChild(elUl);

/* ── Anchor ───────────────────────────────────────────── */

const s2 = section('<a> Hyperlink (OSC 8)');
for (const [href, text] of [
  ['https://github.com', 'GitHub — https://github.com'],
  ['https://example.com', 'Example.com — https://example.com'],
]) {
  const link = document.createElement('a');
  link.setAttribute('href', href!);
  link.textContent = text!;
  s2.container.appendChild(link);
}

/* ── br ───────────────────────────────────────────────── */

const s3 = section('<br>');
const brDemo = document.createElement('p');
brDemo.appendChild(document.createTextNode('First line'));
brDemo.appendChild(document.createElement('br'));
brDemo.appendChild(document.createTextNode('Second line (after <br>)'));
brDemo.appendChild(document.createElement('br'));
brDemo.appendChild(document.createElement('br'));
brDemo.appendChild(document.createTextNode('Fourth line (two <br>)'));
s3.container.appendChild(brDemo);

/* ── hr ───────────────────────────────────────────────── */

const s4 = section('<hr>');
const aboveHr = document.createElement('p');
aboveHr.textContent = 'Content above the rule';
s4.container.appendChild(aboveHr);
s4.container.appendChild(document.createElement('hr'));
const belowHr = document.createElement('p');
belowHr.textContent = 'Content below the rule';
s4.container.appendChild(belowHr);

/* ── Label ────────────────────────────────────────────── */

const s5 = section('<label>');
const s5Hint = document.createElement('div');
s5Hint.className = 'hint';
s5Hint.textContent = 'Click the label to focus the input.';
const label = document.createElement('label');
label.setAttribute('for', 'label-target');
label.textContent = '→ Click me to focus input ←';
const labelTarget = document.createElement('div');
labelTarget.setAttribute('id', 'label-target');
labelTarget.setAttribute('tabindex', '0');
labelTarget.textContent = '[focusable target]';
labelTarget.style.borderStyle = 'single';
labelTarget.style.borderColor = '#475569';
labelTarget.style.padding = '0 1';
const labelStatus = document.createElement('div');
labelStatus.className = 'status';
labelStatus.textContent = 'Focus: none';
labelTarget.addEventListener('focus', () => {
  labelStatus.textContent = 'Focus: target received focus!';
});
s5.container.appendChild(s5Hint);
s5.container.appendChild(label);
s5.container.appendChild(labelTarget);
s5.container.appendChild(labelStatus);

/* ── Fieldset & Form ──────────────────────────────────── */

const s6 = section('<fieldset> + <form>');
const s6Hint = document.createElement('div');
s6Hint.className = 'hint';
s6Hint.textContent = 'Enter in input or click Submit to dispatch submit. Reset clears values.';

const form = document.createElement('form') as InstanceType<typeof Form>;

const fieldset1 = document.createElement('fieldset');
fieldset1.setAttribute('legend', 'Account');
const nameLabel = document.createElement('label');
nameLabel.setAttribute('for', 'form-name');
nameLabel.textContent = 'Name:';
const nameInput = document.createElement('input') as InstanceType<typeof Input>;
nameInput.setAttribute('id', 'form-name');
nameInput.setAttribute('tabindex', '0');
nameInput.setAttribute('width', '20');
nameInput.setAttribute('placeholder', 'Your name');
fieldset1.appendChild(nameLabel);
fieldset1.appendChild(nameInput);

const fieldset2 = document.createElement('fieldset');
fieldset2.setAttribute('legend', 'Preferences');
const colorLabel = document.createElement('label');
colorLabel.setAttribute('for', 'form-color');
colorLabel.textContent = 'Color:';
const colorInput = document.createElement('input') as InstanceType<typeof Input>;
colorInput.setAttribute('id', 'form-color');
colorInput.setAttribute('tabindex', '0');
colorInput.setAttribute('width', '20');
colorInput.setAttribute('placeholder', 'Favorite color');
fieldset2.appendChild(colorLabel);
fieldset2.appendChild(colorInput);

const formBtnRow = document.createElement('div');
formBtnRow.className = 'row';
const submitBtn = document.createElement('button');
submitBtn.setAttribute('type', 'submit');
submitBtn.setAttribute('variant', 'primary');
submitBtn.setAttribute('tabindex', '0');
submitBtn.textContent = 'Submit';
const resetBtn = document.createElement('button');
resetBtn.setAttribute('variant', 'secondary');
resetBtn.setAttribute('tabindex', '0');
resetBtn.textContent = 'Reset';
formBtnRow.appendChild(submitBtn);
formBtnRow.appendChild(resetBtn);

form.appendChild(fieldset1);
form.appendChild(fieldset2);
form.appendChild(formBtnRow);

const formStatus = document.createElement('div');
formStatus.className = 'status';
formStatus.textContent = 'Form: idle';
form.addEventListener('submit', () => {
  const name = nameInput.getAttribute('value') ?? '';
  const color = colorInput.getAttribute('value') ?? '';
  formStatus.textContent = `Form: submitted name="${name}" color="${color}"`;
});
resetBtn.addEventListener('click', () => {
  (form as Form).reset();
  formStatus.textContent = 'Form: reset';
});

s6.container.appendChild(s6Hint);
s6.container.appendChild(form);
s6.container.appendChild(formStatus);

/* ── Optgroup ─────────────────────────────────────────── */

const s7 = section('<optgroup>');
const s7Hint = document.createElement('div');
s7Hint.className = 'hint';
s7Hint.textContent = 'Select with grouped options. Group headers are not selectable.';

const groupedSelect = document.createElement('select') as InstanceType<typeof Select>;
groupedSelect.setAttribute('tabindex', '0');
groupedSelect.setAttribute('value', 'apple');

const fruitsGroup = document.createElement('optgroup');
fruitsGroup.setAttribute('label', 'Fruits');
for (const fruit of ['Apple', 'Banana', 'Cherry']) {
  const opt = document.createElement('option');
  opt.setAttribute('value', fruit.toLowerCase());
  opt.textContent = fruit;
  fruitsGroup.appendChild(opt);
}

const vegsGroup = document.createElement('optgroup');
vegsGroup.setAttribute('label', 'Vegetables');
for (const veg of ['Carrot', 'Broccoli', 'Spinach']) {
  const opt = document.createElement('option');
  opt.setAttribute('value', veg.toLowerCase());
  opt.textContent = veg;
  vegsGroup.appendChild(opt);
}

groupedSelect.appendChild(fruitsGroup);
groupedSelect.appendChild(vegsGroup);

const optgroupStatus = document.createElement('div');
optgroupStatus.className = 'status';
optgroupStatus.textContent = 'Selected: apple';
groupedSelect.addEventListener('input', () => {
  optgroupStatus.textContent = `Selected: ${groupedSelect.getAttribute('value')}`;
});

s7.container.appendChild(s7Hint);
s7.container.appendChild(groupedSelect);
s7.container.appendChild(optgroupStatus);

/* ── Message ──────────────────────────────────────────── */

const s10 = section('<ui-message>');
for (const [tone, text] of [
  ['info', 'Info: This is an informational message.'],
  ['success', 'Success: Operation completed.'],
  ['warning', 'Warning: Disk usage above 80%.'],
  ['error', 'Error: Connection refused.'],
] as const) {
  const msg = document.createElement('ui-message');
  msg.setAttribute('tone', tone);
  msg.textContent = text;
  s10.container.appendChild(msg);
}

/* ── Badge ────────────────────────────────────────────── */

const s11 = section('<ui-badge>');
const badgeRow = document.createElement('div');
badgeRow.className = 'row';
for (const [tone, text] of [
  ['info', 'INFO'],
  ['success', 'ACTIVE'],
  ['warning', 'BETA'],
  ['error', 'CRITICAL'],
] as const) {
  const badge = document.createElement('ui-badge');
  badge.setAttribute('tone', tone);
  badge.textContent = text;
  badgeRow.appendChild(badge);
}
s11.container.appendChild(badgeRow);

const badgeInline = document.createElement('div');
badgeInline.className = 'row';
const statusLabel = document.createElement('span');
statusLabel.textContent = 'Server status:';
const statusBadge = document.createElement('ui-badge');
statusBadge.setAttribute('tone', 'success');
statusBadge.textContent = 'ONLINE';
const alertLabel = document.createElement('span');
alertLabel.textContent = 'Alerts:';
const alertBadge = document.createElement('ui-badge');
alertBadge.setAttribute('tone', 'error');
alertBadge.textContent = '3';
badgeInline.appendChild(statusLabel);
badgeInline.appendChild(statusBadge);
badgeInline.appendChild(alertLabel);
badgeInline.appendChild(alertBadge);
s11.container.appendChild(badgeInline);

/* ── Toast ────────────────────────────────────────────── */

const s12 = section('<ui-toast>');
const s12Hint = document.createElement('div');
s12Hint.className = 'hint';
s12Hint.textContent = 'Click a button to spawn a toast. It auto-removes after its duration.';

const toastBtnRow = document.createElement('div');
toastBtnRow.className = 'row';
const toastContainer = document.createElement('div');
toastContainer.style.position = 'relative';
toastContainer.style.display = 'block';

let toastCount = 0;

for (const [tone, label, duration] of [
  ['info', 'Info (3s)', '3000'],
  ['success', 'Success (2s)', '2000'],
  ['warning', 'Warning (4s)', '4000'],
  ['error', 'Error (5s)', '5000'],
] as const) {
  const btn = document.createElement('button');
  btn.setAttribute('variant', 'primary');
  btn.setAttribute('tabindex', '0');
  btn.textContent = label;
  btn.addEventListener('click', () => {
    toastCount++;
    const toast = document.createElement('ui-toast') as InstanceType<typeof UiToast>;
    toast.setAttribute('tone', tone);
    toast.setAttribute('duration', duration);
    toast.style.top = String(toastCount - 1);
    toast.textContent = `Toast #${toastCount}: ${tone} (${Number(duration) / 1000}s)`;
    toastContainer.appendChild(toast);
  });
  toastBtnRow.appendChild(btn);
}

s12.container.appendChild(s12Hint);
s12.container.appendChild(toastBtnRow);
s12.container.appendChild(toastContainer);

/* ── Tabs ─────────────────────────────────────────────── */

const s22 = section('<tabs>');
const s22Hint = document.createElement('div');
s22Hint.className = 'hint';
s22Hint.textContent = 'Focus tabs → Arrow Left/Right to switch.';
const tabs = document.createElement('tabs') as InstanceType<typeof Tabs>;
tabs.setAttribute('tabindex', '0');
for (const [tabTitle, content] of [
  ['Overview', 'General information goes here.'],
  ['Details', 'More specific information and data.'],
  ['Settings', 'Configure preferences and options.'],
]) {
  const tab = document.createElement('tab');
  tab.setAttribute('title', tabTitle!);
  tab.textContent = content!;
  tabs.appendChild(tab);
}
const tabStatus = document.createElement('div');
tabStatus.className = 'status';
tabStatus.textContent = 'Active tab: Overview';
tabs.addEventListener('input', () => {
  const names = ['Overview', 'Details', 'Settings'];
  tabStatus.textContent = `Active tab: ${names[(tabs as Tabs).getActiveIndex()] ?? '?'}`;
});
s22.container.appendChild(s22Hint);
s22.container.appendChild(tabs);
s22.container.appendChild(tabStatus);

/* ── List ─────────────────────────────────────────────── */

const s17 = section('<listbox>');
const s17Hint = document.createElement('div');
s17Hint.className = 'hint';
s17Hint.textContent = 'Arrow Up/Down to highlight. Enter or click to select.';
const list = document.createElement('listbox') as InstanceType<typeof Listbox>;
list.setAttribute('tabindex', '0');
for (const item of ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']) {
  const div = document.createElement('div');
  div.setAttribute('value', item);
  div.textContent = item;
  list.appendChild(div);
}
const listStatus = document.createElement('div');
listStatus.className = 'status';
listStatus.textContent = 'Selected: (none)';
list.addEventListener('select', () => {
  listStatus.textContent = `Selected: ${(list as Listbox).getSelectedValue()}`;
});
s17.container.appendChild(s17Hint);
s17.container.appendChild(list);
s17.container.appendChild(listStatus);

/* ── Menu / Dropdown ──────────────────────────────────── */

const s24 = section('<dropdown> + <navmenu>');
const s24Hint = document.createElement('div');
s24Hint.className = 'hint';
s24Hint.textContent = 'Enter/click to open. Arrows navigate. Enter selects. Escape closes.';
const dropdown = document.createElement('dropdown') as InstanceType<typeof Dropdown>;
dropdown.setAttribute('tabindex', '0');
dropdown.textContent = '▼ Actions';
const menu = document.createElement('navmenu') as InstanceType<typeof Navmenu>;
for (const [value, label] of [
  ['copy', 'Copy'],
  ['paste', 'Paste'],
  ['cut', 'Cut'],
  ['delete', 'Delete'],
]) {
  const item = document.createElement('navmenuitem');
  item.setAttribute('value', value!);
  item.textContent = label!;
  menu.appendChild(item);
}
dropdown.appendChild(menu);
const menuStatus = document.createElement('div');
menuStatus.className = 'status';
menuStatus.textContent = 'Menu: (none selected)';
menu.addEventListener('select', () => {
  menuStatus.textContent = `Menu: selected "${(menu as Navmenu).getHighlightedValue()}"`;
});
s24.container.appendChild(s24Hint);
s24.container.appendChild(dropdown);
s24.container.appendChild(menuStatus);

/* ── Dialog ───────────────────────────────────────────── */

const s9 = section('<dialog>');
const s9Hint = document.createElement('div');
s9Hint.className = 'hint';
s9Hint.textContent = 'Buttons open dialogs. Escape closes modals.';

const dialogBtnRow = document.createElement('div');
dialogBtnRow.className = 'row';
const showBtn = document.createElement('button');
showBtn.setAttribute('variant', 'primary');
showBtn.setAttribute('tabindex', '0');
showBtn.textContent = 'Non-modal';
const showModalBtn = document.createElement('button');
showModalBtn.setAttribute('variant', 'primary');
showModalBtn.setAttribute('tabindex', '0');
showModalBtn.textContent = 'Modal';
dialogBtnRow.appendChild(showBtn);
dialogBtnRow.appendChild(showModalBtn);

const dialogStatus = document.createElement('div');
dialogStatus.className = 'status';
dialogStatus.textContent = 'Dialog: idle';

const dialog = document.createElement('dialog');
dialog.style.zIndex = '10';
const dialogMsg = document.createElement('p');
dialogMsg.textContent = 'Non-modal dialog. Tab to Close, press Enter.';
const closeBtn = document.createElement('button');
closeBtn.setAttribute('variant', 'primary');
closeBtn.setAttribute('tabindex', '0');
closeBtn.textContent = 'Close';
dialog.appendChild(dialogMsg);
dialog.appendChild(closeBtn);
document.body.appendChild(dialog);

const modalDialog = document.createElement('dialog');
modalDialog.style.zIndex = '10';
const modalMsg = document.createElement('p');
modalMsg.textContent = 'MODAL: Focus trapped. Escape or buttons to close.';
const confirmBtn = document.createElement('button');
confirmBtn.setAttribute('variant', 'primary');
confirmBtn.setAttribute('tabindex', '0');
confirmBtn.textContent = 'Confirm';
const cancelBtn = document.createElement('button');
cancelBtn.setAttribute('variant', 'primary');
cancelBtn.setAttribute('tabindex', '0');
cancelBtn.textContent = 'Cancel';
const modalBtnRow = document.createElement('div');
modalBtnRow.className = 'row';
modalBtnRow.appendChild(confirmBtn);
modalBtnRow.appendChild(cancelBtn);
modalDialog.appendChild(modalMsg);
modalDialog.appendChild(modalBtnRow);
document.body.appendChild(modalDialog);

showBtn.addEventListener('click', () => {
  const scrollY = (document.body as any).scrollTop ?? 0;
  dialog.style.top = String(scrollY + 2);
  dialog.style.left = '10';
  (dialog as any).show();
  dialogStatus.textContent = 'Dialog: non-modal opened';
});
closeBtn.addEventListener('click', () => {
  (dialog as any).close('closed');
  dialogStatus.textContent = 'Dialog: closed';
});
showModalBtn.addEventListener('click', () => {
  (modalDialog as any).showModal();
  dialogStatus.textContent = 'Dialog: modal opened';
});
confirmBtn.addEventListener('click', () => {
  (modalDialog as any).close('confirmed');
  dialogStatus.textContent = 'Dialog: confirmed';
});
cancelBtn.addEventListener('click', () => {
  (modalDialog as any).close('cancelled');
  dialogStatus.textContent = 'Dialog: cancelled';
});
modalDialog.addEventListener('cancel', () => {
  dialogStatus.textContent = 'Dialog: Escape pressed';
});

s9.container.appendChild(s9Hint);
s9.container.appendChild(dialogBtnRow);
s9.container.appendChild(dialogStatus);

/* ── Assemble ──────────────────────────────────────────── */

app.appendChild(title);
app.appendChild(hint);
app.appendChild(s1.container);
app.appendChild(s2.container);
app.appendChild(s3.container);
app.appendChild(s4.container);
app.appendChild(s5.container);
app.appendChild(s6.container);
app.appendChild(s7.container);
app.appendChild(s10.container);
app.appendChild(s11.container);
app.appendChild(s12.container);
app.appendChild(s22.container);
app.appendChild(s17.container);
app.appendChild(s24.container);
app.appendChild(s9.container);
document.body.appendChild(app);

document.setActiveElement(tabs);

/* ── Quit ──────────────────────────────────────────────── */

process.stdin.on('data', (chunk: Buffer | string) => {
  const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  if (text.includes('\u0011')) {
    terminal.exit();
    process.exit(0);
  }
});
process.on('SIGINT', () => {
  terminal.exit();
  process.exit(0);
});
process.on('SIGTERM', () => {
  terminal.exit();
  process.exit(0);
});

await terminal.run();
