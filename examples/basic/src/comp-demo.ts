import {Terminal} from '@micra/terminal-dom';
import {UiButton} from '@micra/terminal-dom/components';

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

window.customElements.define(UiButton.tagName, UiButton);

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
`;
document.head.appendChild(style);

const app = document.createElement('div');
app.className = 'app';

/* ── Title ─────────────────────────────────────────────── */

const title = document.createElement('h1');
title.textContent = 'COMP-1 through COMP-4 + COMP-9 Demo';

const hint = document.createElement('p');
hint.textContent = 'Tab to cycle focus. Enter/Space to activate. Ctrl+Q to quit.';
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

// Each inline style demo is its own element to avoid mixed text+element flow
const strong = document.createElement('strong');
strong.textContent = 'Bold text (strong)';

const em = document.createElement('em');
em.textContent = 'Italic text (em)';

const u = document.createElement('u');
u.textContent = 'Underlined text (u)';

const s = document.createElement('s');
s.textContent = 'Strikethrough text (s)';

const code = document.createElement('code');
code.textContent = 'Inline code (code): const x = 42';

const mark = document.createElement('mark');
mark.textContent = 'Highlighted text (mark)';

const preDemo = document.createElement('pre');
preDemo.textContent = '  Preformatted text (pre)\n  preserves   spaces\n  and newlines';

const list = document.createElement('ul');
const li1 = document.createElement('li');
li1.textContent = 'List item 1 (indented by padding-left: 2)';
const li2 = document.createElement('li');
li2.textContent = 'List item 2';
list.appendChild(li1);
list.appendChild(li2);

section1.appendChild(title1);
section1.appendChild(headings);
section1.appendChild(strong);
section1.appendChild(em);
section1.appendChild(u);
section1.appendChild(s);
section1.appendChild(code);
section1.appendChild(mark);
section1.appendChild(preDemo);
section1.appendChild(list);

/* ── COMP-2: Anchor / Hyperlink ────────────────────────── */

const section2 = document.createElement('div');
section2.className = 'section';

const title2 = document.createElement('div');
title2.className = 'section-title';
title2.textContent = 'COMP-2: <a> Hyperlink (OSC 8)';

// Each link is its own element — no mixed text+element flow
const link1 = document.createElement('a');
link1.setAttribute('href', 'https://github.com');
link1.textContent = 'GitHub — https://github.com';

const link2 = document.createElement('a');
link2.setAttribute('href', 'https://example.com');
link2.textContent = 'Example.com — https://example.com';

const linkHint = document.createElement('div');
linkHint.className = 'hint';
linkHint.textContent = 'Links are underlined + colored. Clickable in terminals with OSC 8 support.';

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

/* ── COMP-9: Dialog ────────────────────────────────────── */

const section9 = document.createElement('div');
section9.className = 'section';

const title9 = document.createElement('div');
title9.className = 'section-title';
title9.textContent = 'COMP-9: <dialog>';

const dialogHint = document.createElement('div');
dialogHint.className = 'hint';
dialogHint.textContent = 'Press the buttons below to open dialogs. Escape closes modal dialogs.';

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
dialog.style.top = '5';
dialog.style.left = '10';
dialog.style.zIndex = '10';
const dialogMsg = document.createElement('p');
dialogMsg.textContent = 'This is a non-modal dialog. Click Close to dismiss.';
const closeBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
closeBtn.setAttribute('variant', 'primary');
closeBtn.setAttribute('tabindex', '0');
closeBtn.textContent = 'Close';
dialog.appendChild(dialogMsg);
dialog.appendChild(closeBtn);
document.body.appendChild(dialog);

/* Modal dialog */
const modalDialog = document.createElement('dialog');
modalDialog.style.top = '5';
modalDialog.style.left = '10';
modalDialog.style.zIndex = '10';
const modalMsg = document.createElement('p');
modalMsg.textContent = 'MODAL dialog. Focus is trapped here. Press Escape or click buttons.';
const confirmBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
confirmBtn.setAttribute('variant', 'primary');
confirmBtn.setAttribute('tabindex', '0');
confirmBtn.textContent = 'Confirm';
const cancelBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
cancelBtn.setAttribute('variant', 'primary');
cancelBtn.setAttribute('tabindex', '1');
cancelBtn.textContent = 'Cancel';
const modalBtnRow = document.createElement('div');
modalBtnRow.style.display = 'flex';
modalBtnRow.style.flexDirection = 'row';
modalBtnRow.style.gap = '2';
modalBtnRow.appendChild(confirmBtn);
modalBtnRow.appendChild(cancelBtn);
modalDialog.appendChild(modalMsg);
modalDialog.appendChild(modalBtnRow);
document.body.appendChild(modalDialog);

/* Dialog event handlers */
showBtn.addEventListener('click', () => {
  (dialog as any).show();
  dialogStatus.textContent = 'Dialog status: non-modal dialog opened';
});

closeBtn.addEventListener('click', () => {
  (dialog as any).close('closed');
  dialogStatus.textContent = `Dialog status: closed (returnValue="${(dialog as any).returnValue}")`;
});

showModalBtn.addEventListener('click', () => {
  (modalDialog as any).showModal();
  dialogStatus.textContent = 'Dialog status: modal dialog opened (focus trapped, Escape to close)';
});

confirmBtn.addEventListener('click', () => {
  (modalDialog as any).close('confirmed');
  dialogStatus.textContent = `Dialog status: modal confirmed (returnValue="${(modalDialog as any).returnValue}")`;
});

cancelBtn.addEventListener('click', () => {
  (modalDialog as any).close('cancelled');
  dialogStatus.textContent = `Dialog status: modal cancelled (returnValue="${(modalDialog as any).returnValue}")`;
});

modalDialog.addEventListener('cancel', () => {
  dialogStatus.textContent = 'Dialog status: modal cancelled via Escape';
});

modalDialog.addEventListener('close', () => {
  const rv = (modalDialog as any).returnValue;
  if (rv) {
    dialogStatus.textContent = `Dialog status: modal closed (returnValue="${rv}")`;
  }
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
app.appendChild(section9);
document.body.appendChild(app);

document.setActiveElement(showBtn);

/* ── Quit handling ─────────────────────────────────────── */

const emergencyInputHandler = (chunk: Buffer | string): void => {
  const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  if (text.includes('\u0011')) {
    terminal.exit();
    process.exit(0);
  }
};

process.stdin.on('data', emergencyInputHandler);
process.on('SIGINT', () => {
  terminal.exit();
  process.exit(0);
});
process.on('SIGTERM', () => {
  terminal.exit();
  process.exit(0);
});

await terminal.run();
