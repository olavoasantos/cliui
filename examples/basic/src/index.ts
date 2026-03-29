import {Terminal} from '@micra/terminal-dom';
import {UiButton, UiInput} from '@micra/terminal-dom/components';

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
`;
document.head.appendChild(style);

/* ── App shell ─────────────────────────────────────────── */

const app = document.createElement('div');
app.className = 'app';

const title = document.createElement('div');
title.className = 'title';
title.textContent = '[EDITABLE] system test';

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Tab to cycle. Type to edit. Enter/Space to activate buttons. Ctrl+Q to quit.';

/* ── Input section ─────────────────────────────────────── */

const inputSection = document.createElement('div');
inputSection.className = 'section';

const inputTitle = document.createElement('div');
inputTitle.className = 'section-title';
inputTitle.textContent = 'Text inputs (system-managed via [EDITABLE])';

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

const limitLabel = document.createElement('div');
limitLabel.className = 'label';
limitLabel.textContent = 'Code (max 5):';

const limitInput = document.createElement('ui-input') as InstanceType<typeof UiInput>;
limitInput.setAttribute('tabindex', '2');
limitInput.setAttribute('width', '10');
limitInput.setAttribute('maxlength', '5');
limitInput.setAttribute('placeholder', 'ABC');

const readonlyLabel = document.createElement('div');
readonlyLabel.className = 'label';
readonlyLabel.textContent = 'Readonly:';

const readonlyInput = document.createElement('ui-input') as InstanceType<typeof UiInput>;
readonlyInput.setAttribute('tabindex', '3');
readonlyInput.setAttribute('width', '20');
readonlyInput.setAttribute('value', 'Cannot edit this');
readonlyInput.setAttribute('readonly', '');

inputSection.appendChild(inputTitle);
inputSection.appendChild(nameLabel);
inputSection.appendChild(nameInput);
inputSection.appendChild(emailLabel);
inputSection.appendChild(emailInput);
inputSection.appendChild(limitLabel);
inputSection.appendChild(limitInput);
inputSection.appendChild(readonlyLabel);
inputSection.appendChild(readonlyInput);

/* ── Button section ────────────────────────────────────── */

const buttonSection = document.createElement('div');
buttonSection.className = 'section';

const buttonTitle = document.createElement('div');
buttonTitle.className = 'section-title';
buttonTitle.textContent = 'Buttons';

const buttonRow = document.createElement('div');
buttonRow.className = 'row';

const submitBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
submitBtn.setAttribute('variant', 'primary');
submitBtn.setAttribute('tabindex', '4');
submitBtn.textContent = 'Submit';

const resetBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
resetBtn.setAttribute('variant', 'secondary');
resetBtn.setAttribute('tabindex', '5');
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
app.appendChild(buttonSection);
app.appendChild(status);
document.body.appendChild(app);

/* ── Event handlers ────────────────────────────────────── */

submitBtn.addEventListener('click', () => {
  const name = nameInput.getAttribute('value') ?? '';
  const email = emailInput.getAttribute('value') ?? '';
  const code = limitInput.getAttribute('value') ?? '';
  status.textContent = `Status: submitted name="${name}" email="${email}" code="${code}"`;
});

resetBtn.addEventListener('click', () => {
  nameInput.setAttribute('value', '');
  emailInput.setAttribute('value', '');
  limitInput.setAttribute('value', '');
  status.textContent = 'Status: reset';
});

nameInput.addEventListener('input', () => {
  status.textContent = `Status: typing name="${nameInput.getAttribute('value') ?? ''}"`;
});

emailInput.addEventListener('input', () => {
  status.textContent = `Status: typing email="${emailInput.getAttribute('value') ?? ''}"`;
});

nameInput.addEventListener('change', () => {
  status.textContent = `Status: name committed "${nameInput.getAttribute('value') ?? ''}"`;
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
