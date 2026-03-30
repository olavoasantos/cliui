import {Terminal} from '@micra/terminal-dom';
import {
  UiAlert,
  UiButton,
  UiDropdown,
  UiLabel,
  UiList,
  UiMenu,
  UiMenuItem,
  UiTab,
  UiTabPanel,
  UiTabs,
} from '@micra/terminal-dom/components';

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

window.customElements.define(UiAlert.tagName, UiAlert);
window.customElements.define(UiButton.tagName, UiButton);
window.customElements.define(UiDropdown.tagName, UiDropdown);
window.customElements.define(UiLabel.tagName, UiLabel);
window.customElements.define(UiList.tagName, UiList);
window.customElements.define(UiMenu.tagName, UiMenu);
window.customElements.define(UiMenuItem.tagName, UiMenuItem);
window.customElements.define(UiTab.tagName, UiTab);
window.customElements.define(UiTabPanel.tagName, UiTabPanel);
window.customElements.define(UiTabs.tagName, UiTabs);

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

  .section-title {
    color: #c4b5fd;
    font-weight: bold;
  }

  .hint {
    color: #64748b;
  }

  .status {
    color: #86efac;
  }

  /* ── Button styles ────── */
  ui-button[variant="primary"] {
    color: #ffffff;
    background-color: #7c3aed;
    padding: 0 2;
  }
  ui-button[variant="primary"]:focus {
    background-color: #6d28d9;
  }

  /* ── Dialog styles ────── */
  dialog {
    background-color: #1e293b;
    border-color: #7c3aed;
    color: #e5e7eb;
    width: 50;
  }
  dialog[modal] {
    border-color: #f59e0b;
  }

  /* ── Tabs styles ────── */
  ui-tabs {
    border-style: single;
    border-color: #475569;
    padding: 0 1;
  }
  ui-tabs:focus {
    border-color: #7c3aed;
  }
  ui-tab {
    color: #94a3b8;
  }
  ui-tab[selected] {
    color: #e5e7eb;
  }

  /* ── List styles ────── */
  ui-list {
    border-style: single;
    border-color: #475569;
    padding: 0 1;
    width: 30;
  }
  ui-list:focus {
    border-color: #7c3aed;
  }
  ui-list div[highlighted] {
    background-color: #7c3aed;
    color: #ffffff;
  }
  ui-list div[selected] {
    font-weight: bold;
  }

  /* ── Menu styles ────── */
  ui-menu {
    background-color: #1e293b;
    border-color: #475569;
    width: 20;
  }
  ui-menu-item[highlighted] {
    background-color: #7c3aed;
    color: #ffffff;
  }
`;
document.head.appendChild(style);

const app = document.createElement('div');
app.className = 'app';

/* ── Title ─────────────────────────────────────────────── */

const title = document.createElement('h1');
title.textContent = 'Component Roster Demo';

const hint = document.createElement('p');
hint.textContent = 'Tab to cycle focus. Arrow keys to navigate. Enter/Space to activate. Ctrl+Q to quit.';
hint.className = 'hint';

/* ── COMP-1: UA Stylesheet ─────────────────────────────── */

const section1 = document.createElement('div');
section1.className = 'section';

const title1 = document.createElement('div');
title1.className = 'section-title';
title1.textContent = 'COMP-1: User-Agent Stylesheet';

const headings = document.createElement('div');
const h2 = document.createElement('h2');
h2.textContent = 'Heading 2 (bold block)';
const h3 = document.createElement('h3');
h3.textContent = 'Heading 3 (bold block)';
headings.appendChild(h2);
headings.appendChild(h3);

const strong = document.createElement('strong');
strong.textContent = 'Bold text (strong)';
const em = document.createElement('em');
em.textContent = 'Italic text (em)';
const uEl = document.createElement('u');
uEl.textContent = 'Underlined text (u)';
const sEl = document.createElement('s');
sEl.textContent = 'Strikethrough text (s)';
const codeEl = document.createElement('code');
codeEl.textContent = 'Inline code (code): const x = 42';
const markEl = document.createElement('mark');
markEl.textContent = 'Highlighted text (mark)';
const preDemo = document.createElement('pre');
preDemo.textContent = '  Preformatted text (pre)\n  preserves   spaces\n  and newlines';
const listUl = document.createElement('ul');
const li1 = document.createElement('li');
li1.textContent = 'List item 1 (indented)';
const li2 = document.createElement('li');
li2.textContent = 'List item 2';
listUl.appendChild(li1);
listUl.appendChild(li2);

section1.appendChild(title1);
section1.appendChild(headings);
section1.appendChild(strong);
section1.appendChild(em);
section1.appendChild(uEl);
section1.appendChild(sEl);
section1.appendChild(codeEl);
section1.appendChild(markEl);
section1.appendChild(preDemo);
section1.appendChild(listUl);

/* ── COMP-2: Anchor / Hyperlink ────────────────────────── */

const section2 = document.createElement('div');
section2.className = 'section';

const title2 = document.createElement('div');
title2.className = 'section-title';
title2.textContent = 'COMP-2: <a> Hyperlink (OSC 8)';

const link1 = document.createElement('a');
link1.setAttribute('href', 'https://github.com');
link1.textContent = 'GitHub — https://github.com';
const link2 = document.createElement('a');
link2.setAttribute('href', 'https://example.com');
link2.textContent = 'Example.com — https://example.com';
const linkHint = document.createElement('div');
linkHint.className = 'hint';
linkHint.textContent = 'Underlined + colored. Clickable in terminals with OSC 8.';

section2.appendChild(title2);
section2.appendChild(link1);
section2.appendChild(link2);
section2.appendChild(linkHint);

/* ── COMP-3: br and wbr ───────────────────────────────── */

const section3 = document.createElement('div');
section3.className = 'section';

const title3 = document.createElement('div');
title3.className = 'section-title';
title3.textContent = 'COMP-3: <br> and <wbr>';

const brDemo = document.createElement('p');
brDemo.appendChild(document.createTextNode('First line'));
brDemo.appendChild(document.createElement('br'));
brDemo.appendChild(document.createTextNode('Second line (after <br>)'));
brDemo.appendChild(document.createElement('br'));
brDemo.appendChild(document.createElement('br'));
brDemo.appendChild(document.createTextNode('Fourth line (two <br> = blank line above)'));

section3.appendChild(title3);
section3.appendChild(brDemo);

/* ── COMP-4: hr ────────────────────────────────────────── */

const section4 = document.createElement('div');
section4.className = 'section';

const title4 = document.createElement('div');
title4.className = 'section-title';
title4.textContent = 'COMP-4: <hr> Horizontal Rule';

const beforeHr = document.createElement('p');
beforeHr.textContent = 'Content above the rule';
const hr1 = document.createElement('hr');
const afterHr = document.createElement('p');
afterHr.textContent = 'Content below the rule';
const hr2 = document.createElement('hr');
hr2.style.width = '30';
const afterHr2 = document.createElement('p');
afterHr2.textContent = 'Above: custom width hr (30 columns)';

section4.appendChild(title4);
section4.appendChild(beforeHr);
section4.appendChild(hr1);
section4.appendChild(afterHr);
section4.appendChild(hr2);
section4.appendChild(afterHr2);

/* ── COMP-5: Label ─────────────────────────────────────── */

const section5 = document.createElement('div');
section5.className = 'section';

const title5 = document.createElement('div');
title5.className = 'section-title';
title5.textContent = 'COMP-5: <ui-label>';

const labelHint = document.createElement('div');
labelHint.className = 'hint';
labelHint.textContent = 'Click a label to focus its associated input (via for attribute).';

const label1 = document.createElement('ui-label');
label1.setAttribute('for', 'demo-input');
label1.textContent = 'Name (click me to focus input):';

const input1 = document.createElement('div');
input1.setAttribute('id', 'demo-input');
input1.setAttribute('tabindex', '0');
input1.textContent = '[focusable input placeholder]';
input1.style.borderStyle = 'single';
input1.style.borderColor = '#475569';
input1.style.padding = '0 1';

section5.appendChild(title5);
section5.appendChild(labelHint);
section5.appendChild(label1);
section5.appendChild(input1);

/* ── COMP-10: Alert ────────────────────────────────────── */

const section10 = document.createElement('div');
section10.className = 'section';

const title10 = document.createElement('div');
title10.className = 'section-title';
title10.textContent = 'COMP-10: <ui-alert>';

const alertInfo = document.createElement('ui-alert');
alertInfo.setAttribute('variant', 'info');
alertInfo.textContent = 'Info: This is an informational message.';

const alertSuccess = document.createElement('ui-alert');
alertSuccess.setAttribute('variant', 'success');
alertSuccess.textContent = 'Success: Operation completed successfully.';

const alertWarning = document.createElement('ui-alert');
alertWarning.setAttribute('variant', 'warning');
alertWarning.textContent = 'Warning: Disk usage is above 80%.';

const alertError = document.createElement('ui-alert');
alertError.setAttribute('variant', 'error');
alertError.textContent = 'Error: Connection refused.';

section10.appendChild(title10);
section10.appendChild(alertInfo);
section10.appendChild(alertSuccess);
section10.appendChild(alertWarning);
section10.appendChild(alertError);

/* ── COMP-22: Tabs ─────────────────────────────────────── */

const section22 = document.createElement('div');
section22.className = 'section';

const title22 = document.createElement('div');
title22.className = 'section-title';
title22.textContent = 'COMP-22: <ui-tabs>';

const tabsHint = document.createElement('div');
tabsHint.className = 'hint';
tabsHint.textContent = 'Focus the tabs, then use Arrow Left/Right to switch.';

const tabs = document.createElement('ui-tabs') as InstanceType<typeof UiTabs>;
tabs.setAttribute('tabindex', '0');

const tab1 = document.createElement('ui-tab');
tab1.textContent = '[ Overview ]';
const tab2 = document.createElement('ui-tab');
tab2.textContent = '[ Details ]';
const tab3 = document.createElement('ui-tab');
tab3.textContent = '[ Settings ]';

const panel1 = document.createElement('ui-tab-panel');
panel1.textContent = 'This is the Overview panel content.';
const panel2 = document.createElement('ui-tab-panel');
panel2.textContent = 'This is the Details panel with more information.';
const panel3 = document.createElement('ui-tab-panel');
panel3.textContent = 'Settings panel: configure your preferences here.';

tabs.appendChild(tab1);
tabs.appendChild(tab2);
tabs.appendChild(tab3);
tabs.appendChild(panel1);
tabs.appendChild(panel2);
tabs.appendChild(panel3);

const tabStatus = document.createElement('div');
tabStatus.className = 'status';
tabStatus.textContent = 'Active tab: Overview';

tabs.addEventListener('input', () => {
  const names = ['Overview', 'Details', 'Settings'];
  tabStatus.textContent = `Active tab: ${names[(tabs as UiTabs).getActiveIndex()] ?? '?'}`;
});

section22.appendChild(title22);
section22.appendChild(tabsHint);
section22.appendChild(tabs);
section22.appendChild(tabStatus);

/* ── COMP-17: List ─────────────────────────────────────── */

const section17 = document.createElement('div');
section17.className = 'section';

const title17 = document.createElement('div');
title17.className = 'section-title';
title17.textContent = 'COMP-17: <ui-list>';

const listHint = document.createElement('div');
listHint.className = 'hint';
listHint.textContent = 'Focus the list, Arrow Up/Down to highlight, Enter to select.';

const interactiveList = document.createElement('ui-list') as InstanceType<typeof UiList>;
interactiveList.setAttribute('tabindex', '0');

for (const item of ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']) {
  const div = document.createElement('div');
  div.setAttribute('value', item);
  div.textContent = item;
  interactiveList.appendChild(div);
}

const listStatus = document.createElement('div');
listStatus.className = 'status';
listStatus.textContent = 'Selected: (none)';

interactiveList.addEventListener('select', () => {
  listStatus.textContent = `Selected: ${(interactiveList as UiList).getSelectedValue()}`;
});

section17.appendChild(title17);
section17.appendChild(listHint);
section17.appendChild(interactiveList);
section17.appendChild(listStatus);

/* ── COMP-24: Menu / Dropdown ──────────────────────────── */

const section24 = document.createElement('div');
section24.className = 'section';

const title24 = document.createElement('div');
title24.className = 'section-title';
title24.textContent = 'COMP-24: <ui-dropdown> + <ui-menu>';

const menuHint = document.createElement('div');
menuHint.className = 'hint';
menuHint.textContent = 'Focus the dropdown, press Enter to open. Arrow keys navigate, Enter selects, Escape closes.';

const dropdown = document.createElement('ui-dropdown') as InstanceType<typeof UiDropdown>;
dropdown.setAttribute('tabindex', '0');
dropdown.textContent = '▼ Actions';

const menu = document.createElement('ui-menu') as InstanceType<typeof UiMenu>;

for (const [value, label] of [
  ['copy', 'Copy'],
  ['paste', 'Paste'],
  ['cut', 'Cut'],
  ['delete', 'Delete'],
]) {
  const item = document.createElement('ui-menu-item');
  item.setAttribute('value', value!);
  item.textContent = label!;
  menu.appendChild(item);
}

dropdown.appendChild(menu);

const menuStatus = document.createElement('div');
menuStatus.className = 'status';
menuStatus.textContent = 'Menu: (none selected)';

menu.addEventListener('select', () => {
  menuStatus.textContent = `Menu: selected "${(menu as UiMenu).getHighlightedValue()}"`;
});

section24.appendChild(title24);
section24.appendChild(menuHint);
section24.appendChild(dropdown);
section24.appendChild(menuStatus);

/* ── COMP-9: Dialog ────────────────────────────────────── */

const section9 = document.createElement('div');
section9.className = 'section';

const title9 = document.createElement('div');
title9.className = 'section-title';
title9.textContent = 'COMP-9: <dialog>';

const dialogHint = document.createElement('div');
dialogHint.className = 'hint';
dialogHint.textContent = 'Press the buttons to open dialogs. Escape closes modals.';

const dialogBtnRow = document.createElement('div');
dialogBtnRow.style.display = 'flex';
dialogBtnRow.style.flexDirection = 'row';
dialogBtnRow.style.gap = '2';

const showBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
showBtn.setAttribute('variant', 'primary');
showBtn.setAttribute('tabindex', '0');
showBtn.textContent = 'Show (non-modal)';

const showModalBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
showModalBtn.setAttribute('variant', 'primary');
showModalBtn.setAttribute('tabindex', '1');
showModalBtn.textContent = 'Show Modal';

dialogBtnRow.appendChild(showBtn);
dialogBtnRow.appendChild(showModalBtn);

const dialogStatus = document.createElement('div');
dialogStatus.className = 'hint';
dialogStatus.textContent = 'Dialog status: idle';

/* Non-modal dialog */
const dialog = document.createElement('dialog');
dialog.style.zIndex = '10';
const dialogMsg = document.createElement('p');
dialogMsg.textContent = 'Non-modal dialog. Tab to Close and press Enter.';
const closeBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
closeBtn.setAttribute('variant', 'primary');
closeBtn.setAttribute('tabindex', '0');
closeBtn.textContent = 'Close';
dialog.appendChild(dialogMsg);
dialog.appendChild(closeBtn);
document.body.appendChild(dialog);

/* Modal dialog */
const modalDialog = document.createElement('dialog');
modalDialog.style.zIndex = '10';
const modalMsg = document.createElement('p');
modalMsg.textContent = 'MODAL: Focus trapped. Escape or buttons to close.';
const confirmBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
confirmBtn.setAttribute('variant', 'primary');
confirmBtn.setAttribute('tabindex', '0');
confirmBtn.textContent = 'Confirm';
const cancelBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
cancelBtn.setAttribute('variant', 'primary');
cancelBtn.setAttribute('tabindex', '1');
cancelBtn.textContent = 'Cancel';
const modalBtnRow2 = document.createElement('div');
modalBtnRow2.style.display = 'flex';
modalBtnRow2.style.flexDirection = 'row';
modalBtnRow2.style.gap = '2';
modalBtnRow2.appendChild(confirmBtn);
modalBtnRow2.appendChild(cancelBtn);
modalDialog.appendChild(modalMsg);
modalDialog.appendChild(modalBtnRow2);
document.body.appendChild(modalDialog);

showBtn.addEventListener('click', () => {
  const scrollY = (document.body as any).scrollTop ?? 0;
  dialog.style.top = String(scrollY + 2);
  dialog.style.left = '10';
  (dialog as any).show();
  dialogStatus.textContent = 'Dialog status: non-modal opened';
});
closeBtn.addEventListener('click', () => {
  (dialog as any).close('closed');
  dialogStatus.textContent = `Dialog status: closed (rv="${(dialog as any).returnValue}")`;
});
showModalBtn.addEventListener('click', () => {
  (modalDialog as any).showModal();
  dialogStatus.textContent = 'Dialog status: modal opened (Escape to close)';
});
confirmBtn.addEventListener('click', () => {
  (modalDialog as any).close('confirmed');
  dialogStatus.textContent = `Dialog status: confirmed`;
});
cancelBtn.addEventListener('click', () => {
  (modalDialog as any).close('cancelled');
  dialogStatus.textContent = `Dialog status: cancelled`;
});
modalDialog.addEventListener('cancel', () => {
  dialogStatus.textContent = 'Dialog status: Escape pressed';
});

section9.appendChild(title9);
section9.appendChild(dialogHint);
section9.appendChild(dialogBtnRow);
section9.appendChild(dialogStatus);

/* ── Assemble ──────────────────────────────────────────── */

app.appendChild(title);
app.appendChild(hint);
app.appendChild(section1);
app.appendChild(section2);
app.appendChild(section3);
app.appendChild(section4);
app.appendChild(section5);
app.appendChild(section10);
app.appendChild(section22);
app.appendChild(section17);
app.appendChild(section24);
app.appendChild(section9);
document.body.appendChild(app);

document.setActiveElement(tabs);

/* ── Quit handling ─────────────────────────────────────── */

process.stdin.on('data', (chunk: Buffer | string) => {
  const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  if (text.includes('\u0011')) {
    terminal.exit();
    process.exit(0);
  }
});
process.on('SIGINT', () => { terminal.exit(); process.exit(0); });
process.on('SIGTERM', () => { terminal.exit(); process.exit(0); });

await terminal.run();
