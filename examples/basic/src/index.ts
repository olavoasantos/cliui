import {Terminal} from '@micra/terminal-dom';
import {UiButton, UiInput, UiTextarea} from '@micra/terminal-dom/components';

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
window.customElements.define(UiInput.tagName, UiInput);
window.customElements.define(UiTextarea.tagName, UiTextarea);

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

  .section {
    padding: 0 1;
    border-style: rounded;
    border-color: #475569;
    display: flex;
    flex-direction: column;
    gap: 1;
  }

  .section-title {
    font-weight: bold;
    color: #fbbf24;
  }

  .row {
    display: flex;
    flex-direction: row;
    gap: 1;
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

  ui-button[variant="primary"]:hover {
    background-color: #6d28d9;
  }

  ui-button[variant="primary"]:focus {
    background-color: #6d28d9;
  }

  ui-button[variant="primary"]:active {
    background-color: #5b21b6;
  }

  ui-button[variant="secondary"] {
    color: #e5e7eb;
    background-color: #334155;
  }

  ui-button[variant="secondary"]:hover {
    background-color: #3f4d61;
  }

  ui-button[variant="secondary"]:focus {
    background-color: #475569;
  }

  ui-button[variant="secondary"]:active {
    background-color: #1e293b;
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
`;
document.head.appendChild(style);

/* ── App shell ─────────────────────────────────────────── */

const app = document.createElement('div');
app.className = 'app';

const title = document.createElement('div');
title.className = 'title';
title.textContent = 'ui-textarea + [EDITABLE] system test';

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Tab to cycle. Type to edit. Arrow keys to navigate. Ctrl+Q to quit.';

/* ── Input section ─────────────────────────────────────── */

const inputSection = document.createElement('div');
inputSection.className = 'section';

const inputTitle = document.createElement('div');
inputTitle.className = 'section-title';
inputTitle.textContent = 'Single-line inputs';

const nameLabel = document.createElement('div');
nameLabel.className = 'label';
nameLabel.textContent = 'Name:';

const nameInput = document.createElement('ui-input') as InstanceType<typeof UiInput>;
nameInput.setAttribute('tabindex', '0');
nameInput.setAttribute('width', '25');
nameInput.setAttribute('placeholder', 'Enter your name');

const emailLabel = document.createElement('div');
emailLabel.className = 'label';
emailLabel.textContent = 'Email:';

const emailInput = document.createElement('ui-input') as InstanceType<typeof UiInput>;
emailInput.setAttribute('tabindex', '1');
emailInput.setAttribute('width', '25');
emailInput.setAttribute('placeholder', 'you@example.com');

inputSection.appendChild(inputTitle);
inputSection.appendChild(nameLabel);
inputSection.appendChild(nameInput);
inputSection.appendChild(emailLabel);
inputSection.appendChild(emailInput);

/* ── Textarea section ──────────────────────────────────── */

const textareaSection = document.createElement('div');
textareaSection.className = 'section';

const textareaTitle = document.createElement('div');
textareaTitle.className = 'section-title';
textareaTitle.textContent = 'Multi-line textarea';

const notesLabel = document.createElement('div');
notesLabel.className = 'label';
notesLabel.textContent = 'Notes (Enter for new lines, ArrowUp/Down to navigate):';

const notesTextarea = document.createElement('ui-textarea') as InstanceType<typeof UiTextarea>;
notesTextarea.setAttribute('tabindex', '2');
notesTextarea.setAttribute('cols', '40');
notesTextarea.setAttribute('rows', '6');
notesTextarea.setAttribute('placeholder', 'Type your notes here...');

textareaSection.appendChild(textareaTitle);
textareaSection.appendChild(notesLabel);
textareaSection.appendChild(notesTextarea);

/* ── Button section ────────────────────────────────────── */

const buttonSection = document.createElement('div');
buttonSection.className = 'section';

const buttonTitle = document.createElement('div');
buttonTitle.className = 'section-title';
buttonTitle.textContent = 'Actions';

const buttonRow = document.createElement('div');
buttonRow.className = 'row';

const submitBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
submitBtn.setAttribute('variant', 'primary');
submitBtn.setAttribute('tabindex', '3');
submitBtn.textContent = 'Submit';

const resetBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
resetBtn.setAttribute('variant', 'secondary');
resetBtn.setAttribute('tabindex', '4');
resetBtn.textContent = 'Reset';

buttonRow.appendChild(submitBtn);
buttonRow.appendChild(resetBtn);
buttonSection.appendChild(buttonTitle);
buttonSection.appendChild(buttonRow);

/* ── Status ────────────────────────────────────────────── */

const status = document.createElement('div');
status.className = 'status';
status.textContent = 'Status: ready';

/* ── Assemble ──────────────────────────────────────────── */

app.appendChild(title);
app.appendChild(hint);
app.appendChild(inputSection);
app.appendChild(textareaSection);
app.appendChild(buttonSection);
app.appendChild(status);
document.body.appendChild(app);

/* ── Event handlers ────────────────────────────────────── */

submitBtn.addEventListener('click', () => {
  const name = nameInput.getAttribute('value') ?? '';
  const email = emailInput.getAttribute('value') ?? '';
  const notes = notesTextarea.getAttribute('value') ?? '';
  const lineCount = notes.split('\n').length;
  status.textContent = `Status: submitted name="${name}" email="${email}" notes=${lineCount} lines`;
});

resetBtn.addEventListener('click', () => {
  nameInput.setAttribute('value', '');
  emailInput.setAttribute('value', '');
  notesTextarea.setAttribute('value', '');
  status.textContent = 'Status: reset';
});

nameInput.addEventListener('input', () => {
  status.textContent = `Status: typing name="${nameInput.getAttribute('value') ?? ''}"`;
});

notesTextarea.addEventListener('input', () => {
  const val = notesTextarea.getAttribute('value') ?? '';
  const lineCount = val.split('\n').length;
  status.textContent = `Status: typing notes (${lineCount} lines, ${val.length} chars)`;
});

document.setActiveElement(nameInput);

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
