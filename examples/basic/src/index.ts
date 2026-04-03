import {Terminal} from '@cliui/terminal';
import {
  Button,
  UiCodeblock,
  Details,
  Input,
  Option,
  Select,
  Table,
  Tbody,
  Td,
  Textarea,
  Tfoot,
  Th,
  Thead,
  Tr,
} from '@cliui/elements';

/* Load Shiki highlighter before starting the app */
const jsLang = (await import('shiki/langs/javascript.mjs')).default;
const nordTheme = (await import('shiki/themes/nord.mjs')).default;
await UiCodeblock.loadHighlighter({langs: [jsLang], themes: [nordTheme]});

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

window.customElements.define(Button.tagName, Button);
window.customElements.define(UiCodeblock.tagName, UiCodeblock);
window.customElements.define(Details.tagName, Details);
window.customElements.define(Input.tagName, Input);
window.customElements.define(Option.tagName, Option);
window.customElements.define(Select.tagName, Select);
window.customElements.define(Table.tagName, Table);
window.customElements.define(Tbody.tagName, Tbody);
window.customElements.define(Td.tagName, Td);
window.customElements.define(Textarea.tagName, Textarea);
window.customElements.define(Tfoot.tagName, Tfoot);
window.customElements.define(Th.tagName, Th);
window.customElements.define(Thead.tagName, Thead);
window.customElements.define(Tr.tagName, Tr);

const style = document.createElement('style');
style.textContent = `
  .app {
    padding: 1;
    border-style: rounded;
    border-color: #7c3aed;
    color: #e5e7eb;
    background-color: #0f172a;
    display: flex;
    flex-direction: column;
    gap: 1;
  }

  .title {
    color: #c4b5fd;
    font-weight: bold;
  }

  .hint {
    color: #64748b;
  }

  .row {
    display: flex;
    flex-direction: row;
    gap: 2;
  }

  .label {
    color: #cbd5e1;
  }

  .status {
    color: #86efac;
  }

  /* ── Button styles ─────────────────────────────────────── */

  button {
    padding: 0 2;
  }

  button[variant="primary"] {
    color: #ffffff;
    background-color: #7c3aed;
  }

  button[variant="primary"]:focus {
    background-color: #6d28d9;
  }

  button[variant="secondary"] {
    color: #e5e7eb;
    background-color: #334155;
  }

  button[variant="secondary"]:focus {
    background-color: #475569;
  }

  /* ── Input styles ──────────────────────────────────────── */

  input {
    color: #e5e7eb;
    background-color: #1e293b;
  }

  input:focus {
    background-color: #334155;
  }

  /* ── Textarea styles ───────────────────────────────────── */

  textarea {
    color: #e5e7eb;
    background-color: #1e293b;
  }

  textarea:focus {
    background-color: #334155;
  }

  /* ── Select styles ─────────────────────────────────────── */

  select {
    color: #e5e7eb;
    background-color: #1e293b;
    text-decoration: none;
    width: 20;
  }

  select:focus {
    background-color: #334155;
  }

  select .select-listbox {
    background-color: #1e293b;
  }

  option {
    display: block;
    color: #e5e7eb;
  }

  option[highlighted] {
    background-color: #7c3aed;
    color: #ffffff;
  }

  option[selected] {
    font-weight: bold;
  }

  option[disabled] {
    color: #64748b;
  }

  /* ── Details styles ────────────────────────────────────── */

  details {
    padding: 0 1;
    border-style: rounded;
    border-color: #475569;
  }

  details:focus {
    border-color: #7c3aed;
  }

  details summary {
    color: #fbbf24;
    font-weight: bold;
  }

  details .details-content {
    color: #cbd5e1;
  }

  /* ── Table styles ──────────────────────────────────────── */

  table {
    padding: 0 1;
  }

  th {
    color: #c4b5fd;
  }

  td {
    color: #e5e7eb;
  }
`;
document.head.appendChild(style);

/* ── App shell ─────────────────────────────────────────── */

const app = document.createElement('div');
app.className = 'app';

const title = document.createElement('div');
title.className = 'title';
title.textContent = 'Component showcase';

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Tab to cycle. Arrow keys to navigate. Enter/Space to activate. Ctrl+Q to quit.';

/* ── Form details ──────────────────────────────────────── */

const formDetails = document.createElement('details') as InstanceType<typeof Details>;
formDetails.setAttribute('tabindex', '0');
formDetails.setAttribute('open', '');

const formSummary = document.createElement('summary');
formSummary.textContent = 'Form';

const nameLabel = document.createElement('div');
nameLabel.className = 'label';
nameLabel.textContent = 'Name:';

const nameInput = document.createElement('input') as InstanceType<typeof Input>;
nameInput.setAttribute('tabindex', '1');
nameInput.setAttribute('width', '25');
nameInput.setAttribute('placeholder', 'Enter your name');

const colorLabel = document.createElement('div');
colorLabel.className = 'label';
colorLabel.textContent = 'Favorite color:';

const colorSelect = document.createElement('select') as InstanceType<typeof Select>;
colorSelect.setAttribute('tabindex', '2');
colorSelect.setAttribute('value', 'blue');

for (const [value, label] of [
  ['red', 'Red'],
  ['green', 'Green'],
  ['blue', 'Blue'],
  ['purple', 'Purple'],
  ['orange', 'Orange'],
]) {
  const opt = document.createElement('option') as InstanceType<typeof Option>;
  opt.setAttribute('value', value!);
  opt.textContent = label!;
  colorSelect.appendChild(opt);
}

const sizeLabel = document.createElement('div');
sizeLabel.className = 'label';
sizeLabel.textContent = 'Size:';

const sizeSelect = document.createElement('select') as InstanceType<typeof Select>;
sizeSelect.setAttribute('tabindex', '3');
sizeSelect.setAttribute('value', 'medium');

for (const [value, label, disabled] of [
  ['small', 'Small', false],
  ['medium', 'Medium', false],
  ['large', 'Large', false],
  ['xl', 'Extra Large (out of stock)', true],
]) {
  const opt = document.createElement('option') as InstanceType<typeof Option>;
  opt.setAttribute('value', value as string);
  opt.textContent = label as string;

  if (disabled) opt.setAttribute('disabled', '');

  sizeSelect.appendChild(opt);
}

const notesLabel = document.createElement('div');
notesLabel.className = 'label';
notesLabel.textContent = 'Notes:';

const notesTextarea = document.createElement('textarea') as InstanceType<typeof Textarea>;
notesTextarea.setAttribute('tabindex', '4');
notesTextarea.setAttribute('cols', '30');
notesTextarea.setAttribute('rows', '3');
notesTextarea.setAttribute('placeholder', 'Any additional notes...');

formDetails.appendChild(formSummary);
formDetails.appendChild(nameLabel);
formDetails.appendChild(nameInput);
formDetails.appendChild(colorLabel);
formDetails.appendChild(colorSelect);
formDetails.appendChild(sizeLabel);
formDetails.appendChild(sizeSelect);
formDetails.appendChild(notesLabel);
formDetails.appendChild(notesTextarea);

/* ── Table details ─────────────────────────────────────── */

const tableDetails = document.createElement('details') as InstanceType<typeof Details>;
tableDetails.setAttribute('tabindex', '5');
tableDetails.setAttribute('open', '');

const tableSummary = document.createElement('summary');
tableSummary.textContent = 'Team roster';

const teamTable = document.createElement('table') as InstanceType<typeof Table>;

const thead = document.createElement('thead');
const headerRow = document.createElement('tr');

for (const heading of ['Name', 'Role', 'Status']) {
  const th = document.createElement('th');
  th.textContent = heading;
  headerRow.appendChild(th);
}

thead.appendChild(headerRow);

const tbody = document.createElement('tbody');
const teamData = [
  ['Alice', 'Engineer', 'Active'],
  ['Bob', 'Designer', 'Active'],
  ['Charlie', 'Manager', 'Away'],
  ['Diana', 'QA Lead', 'Active'],
];

for (const row of teamData) {
  const tr = document.createElement('tr');

  for (const cell of row) {
    const td = document.createElement('td');
    td.textContent = cell!;
    tr.appendChild(td);
  }

  tbody.appendChild(tr);
}

const tfoot = document.createElement('tfoot');
const footerRow = document.createElement('tr');
const totalCell = document.createElement('td');
totalCell.textContent = 'Total';
const countCell = document.createElement('td');
countCell.textContent = `${teamData.length} members`;
const blankCell = document.createElement('td');
blankCell.textContent = '';
footerRow.appendChild(totalCell);
footerRow.appendChild(countCell);
footerRow.appendChild(blankCell);
tfoot.appendChild(footerRow);

teamTable.appendChild(thead);
teamTable.appendChild(tbody);
teamTable.appendChild(tfoot);

tableDetails.appendChild(tableSummary);
tableDetails.appendChild(teamTable);

/* ── Code details ──────────────────────────────────────── */

const codeDetails = document.createElement('details') as InstanceType<typeof Details>;
codeDetails.setAttribute('tabindex', '6');
codeDetails.setAttribute('open', '');

const codeSummary = document.createElement('summary');
codeSummary.textContent = 'Code example';

const codeblock = document.createElement('ui-codeblock') as InstanceType<typeof UiCodeblock>;
codeblock.setAttribute('language', 'javascript');
codeblock.setAttribute('theme', 'nord');
codeblock.setAttribute('line-numbers', '');
codeblock.textContent = `import { Terminal } from '@cliui/terminal';

const terminal = new Terminal({ altScreen: true, mouse: true, fps: 30 });
const { document } = terminal;

const box = document.createElement('div');
box.style.borderStyle = 'rounded';
box.style.borderColor = '#7c3aed';
box.style.padding = '1';
box.textContent = 'Hello, Terminal!';
document.body.appendChild(box);

await terminal.run();`;

codeDetails.appendChild(codeSummary);
codeDetails.appendChild(codeblock);

/* ── Help details (collapsed) ──────────────────────────── */

const helpDetails = document.createElement('details') as InstanceType<typeof Details>;
helpDetails.setAttribute('tabindex', '7');

const helpSummary = document.createElement('summary');
helpSummary.textContent = 'Help & shortcuts';

const helpContent = document.createElement('div');
helpContent.textContent =
  'Tab/Shift+Tab: cycle focus  |  Enter/Space: activate  |  Arrows: navigate  |  Ctrl+Q: quit';

helpDetails.appendChild(helpSummary);
helpDetails.appendChild(helpContent);

/* ── Button row ────────────────────────────────────────── */

const buttonRow = document.createElement('div');
buttonRow.className = 'row';

const submitBtn = document.createElement('button') as InstanceType<typeof Button>;
submitBtn.setAttribute('variant', 'primary');
submitBtn.setAttribute('tabindex', '8');
submitBtn.textContent = 'Submit';

const resetBtn = document.createElement('button') as InstanceType<typeof Button>;
resetBtn.setAttribute('variant', 'secondary');
resetBtn.setAttribute('tabindex', '9');
resetBtn.textContent = 'Reset';

buttonRow.appendChild(submitBtn);
buttonRow.appendChild(resetBtn);

/* ── Status ────────────────────────────────────────────── */

const status = document.createElement('div');
status.className = 'status';
status.textContent = 'Status: ready';

/* ── Assemble ──────────────────────────────────────────── */

app.appendChild(title);
app.appendChild(hint);
app.appendChild(formDetails);
app.appendChild(tableDetails);
app.appendChild(codeDetails);
app.appendChild(helpDetails);
app.appendChild(buttonRow);
app.appendChild(status);
document.body.appendChild(app);

/* ── Event handlers ────────────────────────────────────── */

submitBtn.addEventListener('click', () => {
  const name = nameInput.getAttribute('value') ?? '';
  const color = colorSelect.getAttribute('value') ?? '';
  const size = sizeSelect.getAttribute('value') ?? '';
  const notes = notesTextarea.getAttribute('value') ?? '';
  status.textContent = `Status: submitted name="${name}" color=${color} size=${size} notes=${notes.length}ch`;
});

resetBtn.addEventListener('click', () => {
  nameInput.setAttribute('value', '');
  colorSelect.setAttribute('value', 'blue');
  sizeSelect.setAttribute('value', 'medium');
  notesTextarea.setAttribute('value', '');
  status.textContent = 'Status: reset';
});

colorSelect.addEventListener('input', () => {
  status.textContent = `Status: color → ${colorSelect.getAttribute('value')}`;
});

sizeSelect.addEventListener('input', () => {
  status.textContent = `Status: size → ${sizeSelect.getAttribute('value')}`;
});

formDetails.addEventListener('toggle', () => {
  status.textContent = `Status: form section ${formDetails.isOpen() ? 'expanded' : 'collapsed'}`;
});

tableDetails.addEventListener('toggle', () => {
  status.textContent = `Status: table section ${tableDetails.isOpen() ? 'expanded' : 'collapsed'}`;
});

codeDetails.addEventListener('toggle', () => {
  status.textContent = `Status: code section ${codeDetails.isOpen() ? 'expanded' : 'collapsed'}`;
});

helpDetails.addEventListener('toggle', () => {
  status.textContent = `Status: help section ${helpDetails.isOpen() ? 'expanded' : 'collapsed'}`;
});

document.setActiveElement(formDetails);

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
