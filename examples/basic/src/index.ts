import {Terminal} from '@micra/terminal-dom';
import {UiInput} from '@micra/terminal-dom/components';

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

window.customElements.define(UiInput.tagName, UiInput);

const style = document.createElement('style');
style.textContent = `
  :root {
    --bg: #0f172a;
    --fg: #e5e7eb;
    --accent: #7c3aed;
    --accent-secondary: #06b6d4;
    --panel-border: #475569;
    --title-color: #c4b5fd;
    --hint-color: #93c5fd;
    --label-color: #cbd5e1;
    --status-color: #86efac;
    --error-color: #fca5a5;
  }

  @border-style fancy {
    top: "═";
    bottom: "═";
    left: "║";
    right: "║";
    top-left: "╔";
    top-right: "╗";
    bottom-left: "╚";
    bottom-right: "╝";
  }

  .app {
    padding: 1;
    border-style: fancy;
    border-color: linear-gradient(var(--accent), var(--accent-secondary));
    color: var(--fg);
    background-color: var(--bg);
    display: flex;
    flex-direction: column;
    gap: 1;
  }

  .title {
    color: var(--title-color);
    font-weight: bold;
  }

  .hint {
    color: var(--hint-color);
  }

  .panel {
    padding: 0 1;
    border-style: rounded;
    border-color: linear-gradient(var(--panel-border), var(--accent));
    color: var(--fg);
    display: flex;
    flex-direction: column;
    gap: 1;
  }

  .panel-title {
    color: var(--error-color);
    font-weight: bold;
  }

  .label {
    color: var(--label-color);
  }

  .status {
    color: var(--status-color);
  }
`;
document.head.appendChild(style);

const app = document.createElement('div');
app.className = 'app';

const title = document.createElement('div');
title.className = 'title';
title.textContent = 'ui-input basic example';

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Tab to switch fields. Type, backspace, Home/End, paste. Press Ctrl+C to quit.';

const inputPanel = document.createElement('div');
inputPanel.className = 'panel';

const inputTitle = document.createElement('div');
inputTitle.className = 'panel-title';
inputTitle.textContent = 'Text inputs';

const nameLabel = document.createElement('div');
nameLabel.className = 'label';
nameLabel.textContent = 'Name:';

const nameInput = document.createElement('ui-input') as InstanceType<typeof UiInput>;
nameInput.setAttribute('tabindex', '0');
nameInput.setAttribute('width', '30');
nameInput.setAttribute('placeholder', 'Enter your name');

const emailLabel = document.createElement('div');
emailLabel.className = 'label';
emailLabel.textContent = 'Email:';

const emailInput = document.createElement('ui-input') as InstanceType<typeof UiInput>;
emailInput.setAttribute('tabindex', '1');
emailInput.setAttribute('width', '30');
emailInput.setAttribute('placeholder', 'user@example.com');

const maxLabel = document.createElement('div');
maxLabel.className = 'label';
maxLabel.textContent = 'Code (max 6 chars):';

const codeInput = document.createElement('ui-input') as InstanceType<typeof UiInput>;
codeInput.setAttribute('tabindex', '2');
codeInput.setAttribute('width', '10');
codeInput.setAttribute('maxlength', '6');
codeInput.setAttribute('placeholder', 'ABC123');

const readonlyLabel = document.createElement('div');
readonlyLabel.className = 'label';
readonlyLabel.textContent = 'Readonly:';

const readonlyInput = document.createElement('ui-input') as InstanceType<typeof UiInput>;
readonlyInput.setAttribute('tabindex', '3');
readonlyInput.setAttribute('width', '30');
readonlyInput.setAttribute('value', 'This text is readonly');
readonlyInput.setAttribute('readonly', '');

inputPanel.appendChild(inputTitle);
inputPanel.appendChild(nameLabel);
inputPanel.appendChild(nameInput);
inputPanel.appendChild(emailLabel);
inputPanel.appendChild(emailInput);
inputPanel.appendChild(maxLabel);
inputPanel.appendChild(codeInput);
inputPanel.appendChild(readonlyLabel);
inputPanel.appendChild(readonlyInput);

const status = document.createElement('div');
status.className = 'status';
status.textContent = 'Status: ready';

app.appendChild(title);
app.appendChild(hint);
app.appendChild(inputPanel);
app.appendChild(status);
document.body.appendChild(app);

const updateStatus = (): void => {
  const name = nameInput.getAttribute('value') ?? '';
  const email = emailInput.getAttribute('value') ?? '';
  const code = codeInput.getAttribute('value') ?? '';

  status.textContent = `Status: name="${name}" email="${email}" code="${code}"`;
};

nameInput.addEventListener('input', updateStatus);
emailInput.addEventListener('input', updateStatus);
codeInput.addEventListener('input', updateStatus);

nameInput.addEventListener('change', () => {
  status.textContent = `Status: name committed → "${nameInput.getAttribute('value') ?? ''}"`;
});

document.setActiveElement(nameInput);

const emergencyInputHandler = (chunk: Buffer | string): void => {
  const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');

  if (text.includes('\u0003')) {
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
