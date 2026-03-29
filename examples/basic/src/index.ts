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
    color: #93c5fd;
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

  .hover-status {
    color: #94a3b8;
  }

  .status {
    color: #86efac;
  }

  /* ── Button base ─────────────────────────────────────── */

  ui-button {
    padding: 0 2;
  }

  /* ── Primary variant ─────────────────────────────────── */

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

  ui-button[variant="primary"]:disabled {
    color: #a1a1aa;
    background-color: #3f3f46;
  }

  /* ── Secondary variant ───────────────────────────────── */

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

  ui-button[variant="secondary"]:disabled {
    color: #71717a;
    background-color: #27272a;
  }

  /* ── Dangerous tone ──────────────────────────────────── */

  ui-button[tone="dangerous"][variant="primary"] {
    background-color: #dc2626;
    color: #fef2f2;
  }

  ui-button[tone="dangerous"][variant="primary"]:hover {
    background-color: #c32525;
  }

  ui-button[tone="dangerous"][variant="primary"]:focus {
    background-color: #b91c1c;
  }

  ui-button[tone="dangerous"][variant="primary"]:active {
    background-color: #991b1b;
  }

  ui-button[tone="dangerous"][variant="primary"]:disabled {
    color: #a1a1aa;
    background-color: #3f3f46;
  }

  ui-button[tone="dangerous"][variant="secondary"] {
    color: #fca5a5;
    background-color: #451a1a;
  }

  ui-button[tone="dangerous"][variant="secondary"]:hover {
    background-color: #532020;
  }

  ui-button[tone="dangerous"][variant="secondary"]:focus {
    background-color: #5c2020;
  }

  ui-button[tone="dangerous"][variant="secondary"]:active {
    background-color: #331111;
  }
`;
document.head.appendChild(style);

/* ── App shell ─────────────────────────────────────────── */

const app = document.createElement('div');
app.className = 'app';

const title = document.createElement('div');
title.className = 'title';
title.textContent = 'ui-button showcase';

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Tab to cycle focus. Enter or Space to activate. Ctrl+Q to quit.';

/* ── Variants section ──────────────────────────────────── */

const variantsSection = document.createElement('div');
variantsSection.className = 'section';

const variantsTitle = document.createElement('div');
variantsTitle.className = 'section-title';
variantsTitle.textContent = 'Variants';

const variantsRow = document.createElement('div');
variantsRow.className = 'row';

const primaryBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
primaryBtn.setAttribute('variant', 'primary');
primaryBtn.setAttribute('tabindex', '0');
primaryBtn.textContent = 'Primary';

const secondaryBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
secondaryBtn.setAttribute('variant', 'secondary');
secondaryBtn.setAttribute('tabindex', '1');
secondaryBtn.textContent = 'Secondary';

variantsRow.appendChild(primaryBtn);
variantsRow.appendChild(secondaryBtn);
variantsSection.appendChild(variantsTitle);
variantsSection.appendChild(variantsRow);

/* ── Tones section ─────────────────────────────────────── */

const tonesSection = document.createElement('div');
tonesSection.className = 'section';

const tonesTitle = document.createElement('div');
tonesTitle.className = 'section-title';
tonesTitle.textContent = 'Tones';

const tonesRow = document.createElement('div');
tonesRow.className = 'row';

const defaultToneBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
defaultToneBtn.setAttribute('variant', 'primary');
defaultToneBtn.setAttribute('tone', 'default');
defaultToneBtn.setAttribute('tabindex', '2');
defaultToneBtn.textContent = 'Default';

const dangerPrimaryBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
dangerPrimaryBtn.setAttribute('variant', 'primary');
dangerPrimaryBtn.setAttribute('tone', 'dangerous');
dangerPrimaryBtn.setAttribute('tabindex', '3');
dangerPrimaryBtn.textContent = 'Dangerous';

const dangerSecondaryBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
dangerSecondaryBtn.setAttribute('variant', 'secondary');
dangerSecondaryBtn.setAttribute('tone', 'dangerous');
dangerSecondaryBtn.setAttribute('tabindex', '4');
dangerSecondaryBtn.textContent = 'Danger Secondary';

tonesRow.appendChild(defaultToneBtn);
tonesRow.appendChild(dangerPrimaryBtn);
tonesRow.appendChild(dangerSecondaryBtn);
tonesSection.appendChild(tonesTitle);
tonesSection.appendChild(tonesRow);

/* ── States section ────────────────────────────────────── */

const statesSection = document.createElement('div');
statesSection.className = 'section';

const statesTitle = document.createElement('div');
statesTitle.className = 'section-title';
statesTitle.textContent = 'States';

const statesRow = document.createElement('div');
statesRow.className = 'row';

const disabledPrimaryBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
disabledPrimaryBtn.setAttribute('variant', 'primary');
disabledPrimaryBtn.setAttribute('disabled', '');
disabledPrimaryBtn.textContent = 'Disabled Primary';

const disabledSecondaryBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
disabledSecondaryBtn.setAttribute('variant', 'secondary');
disabledSecondaryBtn.setAttribute('disabled', '');
disabledSecondaryBtn.textContent = 'Disabled Secondary';

const disabledDangerBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
disabledDangerBtn.setAttribute('variant', 'primary');
disabledDangerBtn.setAttribute('tone', 'dangerous');
disabledDangerBtn.setAttribute('disabled', '');
disabledDangerBtn.textContent = 'Disabled Danger';

statesRow.appendChild(disabledPrimaryBtn);
statesRow.appendChild(disabledSecondaryBtn);
statesRow.appendChild(disabledDangerBtn);
statesSection.appendChild(statesTitle);
statesSection.appendChild(statesRow);

/* ── Interactive section ───────────────────────────────── */

const interactiveSection = document.createElement('div');
interactiveSection.className = 'section';

const interactiveTitle = document.createElement('div');
interactiveTitle.className = 'section-title';
interactiveTitle.textContent = 'Interactive';

const nameLabel = document.createElement('div');
nameLabel.className = 'label';
nameLabel.textContent = 'Name:';

const nameInput = document.createElement('ui-input') as InstanceType<typeof UiInput>;
nameInput.setAttribute('tabindex', '5');
nameInput.setAttribute('width', '25');
nameInput.setAttribute('placeholder', 'Enter your name');

const interactiveRow = document.createElement('div');
interactiveRow.className = 'row';

const submitBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
submitBtn.setAttribute('variant', 'primary');
submitBtn.setAttribute('tabindex', '6');
submitBtn.textContent = 'Submit';

const resetBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
resetBtn.setAttribute('variant', 'secondary');
resetBtn.setAttribute('tabindex', '7');
resetBtn.textContent = 'Reset';

const deleteBtn = document.createElement('ui-button') as InstanceType<typeof UiButton>;
deleteBtn.setAttribute('variant', 'primary');
deleteBtn.setAttribute('tone', 'dangerous');
deleteBtn.setAttribute('tabindex', '8');
deleteBtn.textContent = 'Delete';

interactiveRow.appendChild(submitBtn);
interactiveRow.appendChild(resetBtn);
interactiveRow.appendChild(deleteBtn);

interactiveSection.appendChild(interactiveTitle);
interactiveSection.appendChild(nameLabel);
interactiveSection.appendChild(nameInput);
interactiveSection.appendChild(interactiveRow);

/* ── Status ────────────────────────────────────────────── */

const hoverStatus = document.createElement('div');
hoverStatus.className = 'hover-status';
hoverStatus.textContent = 'Hover: none';

const status = document.createElement('div');
status.className = 'status';
status.textContent = 'Status: ready';

/* ── Assemble ──────────────────────────────────────────── */

app.appendChild(title);
app.appendChild(hint);
app.appendChild(variantsSection);
app.appendChild(tonesSection);
app.appendChild(statesSection);
app.appendChild(interactiveSection);
app.appendChild(hoverStatus);
app.appendChild(status);
document.body.appendChild(app);

/* ── Event handlers ────────────────────────────────────── */

let clickCount = 0;

const logClick = (label: string): void => {
  clickCount += 1;
  status.textContent = `Status: "${label}" clicked (#${clickCount})`;
};

primaryBtn.addEventListener('click', () => logClick('Primary'));
secondaryBtn.addEventListener('click', () => logClick('Secondary'));
defaultToneBtn.addEventListener('click', () => logClick('Default'));
dangerPrimaryBtn.addEventListener('click', () => logClick('Dangerous'));
dangerSecondaryBtn.addEventListener('click', () => logClick('Danger Secondary'));

submitBtn.addEventListener('click', () => {
  const name = nameInput.getAttribute('value') ?? '';
  status.textContent = name.length > 0 ? `Status: submitted "${name}"` : 'Status: name is empty';
});

resetBtn.addEventListener('click', () => {
  nameInput.setAttribute('value', '');
  status.textContent = 'Status: reset';
});

deleteBtn.addEventListener('click', () => {
  status.textContent = 'Status: delete confirmed!';
});

/* ── Hover handlers ──────────────────────────────────── */

const hoverTargets: Array<[InstanceType<typeof UiButton>, string]> = [
  [primaryBtn, 'Primary'],
  [secondaryBtn, 'Secondary'],
  [defaultToneBtn, 'Default'],
  [dangerPrimaryBtn, 'Dangerous'],
  [dangerSecondaryBtn, 'Danger Secondary'],
  [disabledPrimaryBtn, 'Disabled Primary'],
  [disabledSecondaryBtn, 'Disabled Secondary'],
  [disabledDangerBtn, 'Disabled Danger'],
  [submitBtn, 'Submit'],
  [resetBtn, 'Reset'],
  [deleteBtn, 'Delete'],
];

for (const [btn, label] of hoverTargets) {
  btn.addEventListener('mouseenter', () => {
    hoverStatus.textContent = `Hover: ${label}`;
  });
  btn.addEventListener('mouseleave', () => {
    hoverStatus.textContent = 'Hover: none';
  });
}

document.setActiveElement(primaryBtn);

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
