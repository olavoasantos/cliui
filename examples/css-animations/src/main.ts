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

// 1. Color pulse — infinite ease-in-out
addDemo(
  '1. Color Pulse (2s ease-in-out infinite)',
  'P',
  'pulse-box',
  'Background color pulses between gray and purple',
);

// 2. Fade in/out — infinite linear
addDemo(
  '2. Fade In/Out (1.5s linear infinite)',
  'F',
  'fade-box',
  'Opacity cycles 0 → 1 → 0',
);

// 3. Width slide — infinite alternate
addDemo(
  '3. Width Slide (2s ease-in-out infinite alternate)',
  'S',
  'slide-box',
  'Width bounces 10 ↔ 50',
);

// 4. Rainbow text — infinite linear
addDemo(
  '4. Rainbow Text (3s linear infinite)',
  'R',
  'rainbow-text',
  'Text color cycles through the spectrum',
);

// 5. Border color — infinite ease
addDemo(
  '5. Border Cycle (2s ease infinite)',
  'B',
  'border-box',
  'Border color cycles purple → green → red',
);

// 6. Multi-animation — pulse + fadeInOut
addDemo(
  '6. Multi-Animation (pulse 2s + fadeInOut 3s)',
  'U',
  'multi-anim',
  'Two animations on one element simultaneously',
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
app.appendChild(text('hint', 'P/F/S/R/B/U = toggle each animation  A = all on/off  Ctrl+C = quit'));

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
