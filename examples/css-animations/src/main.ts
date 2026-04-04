import {Terminal} from '@cliui/terminal';
import css from './styles.css?inline';

// ── Setup ───────────────────────────────────────────────────────

const terminal = new Terminal({
  altScreen: true,
  fps: 30,
  output: process.stdout,
  input: process.stdin,
});

const doc = terminal.document;

const style = doc.createElement('style');
style.textContent = css;
doc.head.appendChild(style);

// ── UI ──────────────────────────────────────────────────────────

const app = doc.createElement('div');
app.className = 'app';

function text(className: string, content: string) {
  const el = doc.createElement('div');
  el.className = className;
  el.textContent = content;
  return el;
}

function separator() {
  const el = doc.createElement('div');
  el.className = 'separator';
  el.textContent = '─'.repeat(54);
  return el;
}

app.appendChild(text('header', '✨ CSS @keyframes Animations — Live Demo'));

// ── Demos ─────────────────────────────────────────────────────

interface Demo {
  label: string;
  key: string;
  element: HTMLElement;
  running: boolean;
}

const demos: Demo[] = [];

function addDemo(label: string, key: string, className: string, content: string): HTMLElement {
  app.appendChild(separator());
  app.appendChild(text('section-label', `${label}  [${key}]`));

  const el = doc.createElement('div');
  el.className = className;
  el.textContent = content;
  app.appendChild(el);

  demos.push({label, key: key.toLowerCase(), element: el, running: false});
  return el;
}

// 1. Background color pulse — infinite ease-in-out
addDemo(
  '1. Color Pulse (2s ease-in-out infinite)',
  'P',
  'pulse-box',
  'Background color pulses between gray and purple',
);

// 2. Rainbow text — infinite linear, 6 color stops
addDemo(
  '2. Rainbow Text (3s linear infinite)',
  'R',
  'rainbow-text',
  'Text color cycles through the spectrum',
);

// 3. Border color — infinite ease
addDemo(
  '3. Border Cycle (2s ease infinite)',
  'B',
  'border-box',
  'Border color cycles purple → green → red',
);

// 4. Text color pulse — infinite ease-in-out
addDemo(
  '4. Text Pulse (1.5s ease-in-out infinite)',
  'T',
  'text-pulse',
  'Text color pulses dim → bright → dim',
);

// ── Event log ───────────────────────────────────────────────────

app.appendChild(separator());
const eventLog = text('event-log', 'Animation events will appear here...');
app.appendChild(eventLog);

for (const type of ['animationstart', 'animationend', 'animationiteration', 'animationcancel']) {
  app.addEventListener(type, ((e: Event) => {
    const ae = e as Event & {animationName?: string; elapsedTime?: number};
    const name = ae.animationName ?? '?';
    const elapsed = ae.elapsedTime?.toFixed(0) ?? '?';
    eventLog.textContent = `${type} → ${name} (${elapsed}ms)`;
  }) as EventListener);
}

// ── Controls ────────────────────────────────────────────────────

app.appendChild(separator());
app.appendChild(text('hint', 'P/R/B/T = toggle each animation  A = all on/off  Ctrl+C = quit'));

doc.body.appendChild(app);

// ── Input ───────────────────────────────────────────────────────

let allRunning = false;

doc.body.addEventListener('keydown', (event: Event) => {
  const ke = event as KeyboardEvent;

  if (ke.key === 'c' && ke.ctrlKey) {
    terminal.exit();
    process.exit(0);
  }

  const key = ke.key.toLowerCase();

  // Toggle individual
  for (const demo of demos) {
    if (key === demo.key) {
      demo.running = !demo.running;
      const base = demo.element.className.replace(' running', '');
      demo.element.className = demo.running ? `${base} running` : base;
      return;
    }
  }

  // Toggle all
  if (key === 'a') {
    allRunning = !allRunning;

    for (const demo of demos) {
      demo.running = allRunning;
      const base = demo.element.className.replace(' running', '');
      demo.element.className = allRunning ? `${base} running` : base;
    }
  }
});

// ── Start ───────────────────────────────────────────────────────

await terminal.run();
