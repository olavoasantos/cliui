import {Terminal} from '@micra/terminal-dom';
import {
  UiButton,
  UiDetails,
  UiInput,
  UiOption,
  UiSelect,
  UiTable,
  UiTbody,
  UiTd,
  UiTextarea,
  UiTfoot,
  UiTh,
  UiThead,
  UiTr,
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

window.customElements.define(UiButton.tagName, UiButton);
window.customElements.define(UiDetails.tagName, UiDetails);
window.customElements.define(UiInput.tagName, UiInput);
window.customElements.define(UiOption.tagName, UiOption);
window.customElements.define(UiSelect.tagName, UiSelect);
window.customElements.define(UiTable.tagName, UiTable);
window.customElements.define(UiTbody.tagName, UiTbody);
window.customElements.define(UiTd.tagName, UiTd);
window.customElements.define(UiTextarea.tagName, UiTextarea);
window.customElements.define(UiTfoot.tagName, UiTfoot);
window.customElements.define(UiTh.tagName, UiTh);
window.customElements.define(UiThead.tagName, UiThead);
window.customElements.define(UiTr.tagName, UiTr);

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

  ui-button {
    padding: 0 2;
  }

  ui-button[variant="primary"] {
    color: #ffffff;
    background-color: #7c3aed;
  }

  ui-button[variant="primary"]:focus {
    background-color: #6d28d9;
  }

  ui-button[variant="secondary"] {
    color: #e5e7eb;
    background-color: #334155;
  }

  ui-button[variant="secondary"]:focus {
    background-color: #475569;
  }

  /* ── Input styles ──────────────────────────────────────── */

  ui-input {
    color: #e5e7eb;
    background-color: #1e293b;
  }

  ui-input:focus {
    background-color: #334155;
  }

  /* ── Textarea styles ───────────────────────────────────── */

  ui-textarea {
    color: #e5e7eb;
    background-color: #1e293b;
  }

  ui-textarea:focus {
    background-color: #334155;
  }

  /* ── Select styles ─────────────────────────────────────── */

  ui-select {
    color: #e5e7eb;
    background-color: #1e293b;
    text-decoration: none;
    width: 20;
  }

  ui-select:focus {
    background-color: #334155;
  }

  ui-select .ui-select-listbox {
    background-color: #1e293b;
  }

  ui-option {
    display: block;
    color: #e5e7eb;
  }

  ui-option[highlighted] {
    background-color: #7c3aed;
    color: #ffffff;
  }

  ui-option[selected] {
    font-weight: bold;
  }

  ui-option[disabled] {
    color: #64748b;
  }

  /* ── Details styles ────────────────────────────────────── */

  ui-details {
    padding: 0 1;
    border-style: rounded;
    border-color: #475569;
  }

  ui-details:focus {
    border-color: #7c3aed;
  }

  ui-details ui-summary {
    color: #fbbf24;
    font-weight: bold;
  }

  ui-details .ui-details-content {
    color: #cbd5e1;
  }

  /* ── Table styles ──────────────────────────────────────── */

  ui-table {
    padding: 0 1;
  }

  ui-th {
    color: #c4b5fd;
  }

  ui-td {
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

const formDetails = document.createElement('ui-details') as InstanceType<typeof UiDetails>;
formDetails.setAttribute('tabindex', '0');
formDetails.setAttribute('open', '');

const formSummary = document.createElement('ui-summary');
formSummary.textContent = 'Form';

const nameLabel = document.createElement('div');
nameLabel.className = 'label';
nameLabel.textContent = 'Name:';

const nameInput = document.createElement('ui-input') as InstanceType<typeof UiInput>;
nameInput.setAttribute('tabindex', '1');
nameInput.setAttribute('width', '25');
nameInput.setAttribute('placeholder', 'Enter your name');

const colorLabel = document.createElement('div');
colorLabel.className = 'label';
colorLabel.textContent = 'Favorite color:';

const colorSelect = document.createElement('ui-select') as InstanceType<typeof UiSelect>;
colorSelect.setAttribute('tabindex', '2');
colorSelect.setAttribute('value', 'blue');

for (const [value, label] of [
  ['red', 'Red'],
  ['green', 'Green'],
  ['blue', 'Blue'],
  ['purple', 'Purple'],
  ['orange', 'Orange'],
]) {
  const opt = document.createElement('ui-option') as InstanceType<typeof UiOption>;
  opt.setAttribute('value', value!);
  opt.textContent = label!;
  colorSelect.appendChild(opt);
}

const sizeLabel = document.createElement('div');
sizeLabel.className = 'label';
sizeLabel.textContent = 'Size:';

const sizeSelect = document.createElement('ui-select') as InstanceType<typeof UiSelect>;
sizeSelect.setAttribute('tabindex', '3');
sizeSelect.setAttribute('value', 'medium');

for (const [value, label, disabled] of [
  ['small', 'Small', false],
  ['medium', 'Medium', false],
  ['large', 'Large', false],
  ['xl', 'Extra Large (out of stock)', true],
]) {
  const opt = document.createElement('ui-option') as InstanceType<typeof UiOption>;
  opt.setAttribute('value', value as string);
  opt.textContent = label as string;

  if (disabled) opt.setAttribute('disabled', '');

  sizeSelect.appendChild(opt);
}

const notesLabel = document.createElement('div');
notesLabel.className = 'label';
notesLabel.textContent = 'Notes:';

const notesTextarea = document.createElement('ui-textarea') as InstanceType<typeof UiTextarea>;
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

const tableDetails = document.createElement('ui-details') as InstanceType<typeof UiDetails>;
tableDetails.setAttribute('tabindex', '5');
tableDetails.setAttribute('open', '');

const tableSummary = document.createElement('ui-summary');
tableSummary.textContent = 'Team roster';

const teamTable = document.createElement('ui-table') as InstanceType<typeof UiTable>;

const thead = document.createElement('ui-thead');
const headerRow = document.createElement('ui-tr');

for (const heading of ['Name', 'Role', 'Status']) {
  const th = document.createElement('ui-th');
  th.textContent = heading;
  headerRow.appendChild(th);
}

thead.appendChild(headerRow);

const tbody = document.createElement('ui-tbody');
const teamData = [
  ['Alice', 'Engineer', 'Active'],
  ['Bob', 'Designer', 'Active'],
  ['Charlie', 'Manager', 'Away'],
  ['Diana', 'QA Lead', 'Active'],
];

for (const row of teamData) {
  const tr = document.createElement('ui-tr');

  for (const cell of row) {
    const td = document.createElement('ui-td');
    td.textContent = cell!;
    tr.appendChild(td);
  }

  tbody.appendChild(tr);
}

const tfoot = document.createElement('ui-tfoot');
const footerRow = document.createElement('ui-tr');
const totalCell = document.createElement('ui-td');
totalCell.textContent = 'Total';
const countCell = document.createElement('ui-td');
countCell.textContent = `${teamData.length} members`;
const blankCell = document.createElement('ui-td');
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

/* ── Help details (collapsed) ──────────────────────────── */

const helpDetails = document.createElement('ui-details') as InstanceType<typeof UiDetails>;
helpDetails.setAttribute('tabindex', '6');

const helpSummary = document.createElement('ui-summary');
helpSummary.textContent = 'Help & shortcuts';

const helpContent = document.createElement('div');
helpContent.textContent =
  'Tab/Shift+Tab: cycle focus  |  Enter/Space: activate  |  Arrows: navigate  |  Ctrl+Q: quit';

helpDetails.appendChild(helpSummary);
helpDetails.appendChild(helpContent);

/* ── Button row ────────────────────────────────────────── */

const buttonRow = document.createElement('div');
buttonRow.className = 'row';

const submitBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
submitBtn.setAttribute('variant', 'primary');
submitBtn.setAttribute('tabindex', '7');
submitBtn.textContent = 'Submit';

const resetBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
resetBtn.setAttribute('variant', 'secondary');
resetBtn.setAttribute('tabindex', '8');
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
