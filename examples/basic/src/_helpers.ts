import {Terminal} from '@micra/terminal-dom';

/**
 * Shared bootstrap for component examples.
 * Sets up a terminal with alt screen, mouse support, and Ctrl+Q quit.
 * Returns the terminal, document, and window for element creation.
 */
export function createDemo() {
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

  /* Inject base styles */
  const style = document.createElement('style');
  style.textContent = `
    .demo {
      padding: 1 2;
      color: #e5e7eb;
      background-color: #0f172a;
      display: flex;
      flex-direction: column;
      gap: 1;
    }
    .title { color: #c4b5fd; font-weight: bold; }
    .hint { color: #64748b; }
    .status { color: #86efac; }
    .row { display: flex; flex-direction: row; gap: 2; }
    .section {
      border-style: rounded; border-color: #475569;
      padding: 1 2; display: flex; flex-direction: column; gap: 1;
    }
    .label { color: #cbd5e1; }

    ui-button { padding: 0 2; }
    ui-button[variant="primary"] { color: #fff; background-color: #7c3aed; }
    ui-button[variant="primary"]:focus { background-color: #6d28d9; }
    ui-button[variant="secondary"] { color: #e5e7eb; background-color: #334155; }
    ui-button[variant="secondary"]:focus { background-color: #475569; }

    ui-input { color: #e5e7eb; background-color: #1e293b; }
    ui-input:focus { background-color: #334155; }

    ui-textarea { color: #e5e7eb; background-color: #1e293b; }
    ui-textarea:focus { background-color: #334155; }

    ui-select { color: #e5e7eb; background-color: #1e293b; text-decoration: none; width: 25; }
    ui-select:focus { background-color: #334155; }
    ui-select .ui-select-listbox { background-color: #1e293b; }
    ui-option { display: block; color: #e5e7eb; }
    ui-option[highlighted] { background-color: #7c3aed; color: #fff; }
    ui-option[selected] { font-weight: bold; }
    ui-option[disabled] { color: #64748b; }
    .ui-optgroup-label { color: #c4b5fd; }

    dialog { background-color: #1e293b; border-color: #7c3aed; color: #e5e7eb; width: 50; }
    dialog[modal] { border-color: #f59e0b; }
  `;
  document.head.appendChild(style);

  /* Quit handling */
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

  return {terminal, document, window};
}

/** Creates the demo shell container with title and hint. */
export function createShell(
  document: ReturnType<typeof createDemo>['document'],
  title: string,
  hint: string,
) {
  const app = document.createElement('div');
  app.className = 'demo';

  const titleEl = document.createElement('div');
  titleEl.className = 'title';
  titleEl.textContent = title;

  const hintEl = document.createElement('div');
  hintEl.className = 'hint';
  hintEl.textContent = hint;

  app.appendChild(titleEl);
  app.appendChild(hintEl);

  return app;
}

/** Creates a labeled section box. */
export function createSection(document: ReturnType<typeof createDemo>['document'], label: string) {
  const box = document.createElement('div');
  box.className = 'section';
  const labelEl = document.createElement('div');
  labelEl.className = 'title';
  labelEl.textContent = label;
  box.appendChild(labelEl);
  return box;
}

/** Creates a status line element. */
export function createStatus(document: ReturnType<typeof createDemo>['document'], initial: string) {
  const el = document.createElement('div');
  el.className = 'status';
  el.textContent = initial;
  return el;
}
