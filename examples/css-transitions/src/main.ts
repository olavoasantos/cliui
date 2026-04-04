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

app.appendChild(text('header', '🎨 CSS Transitions — Interactive Demo'));

// ── 1. Color transition ─────────────────────────────────────────

app.appendChild(separator());
app.appendChild(text('section-label', '1. Color Transition (background-color + color, 500ms ease)'));

const colorBox = doc.createElement('div');
colorBox.className = 'color-box';
colorBox.textContent = 'Press 1/2/3 to change color → transitions smoothly';
app.appendChild(colorBox);

// ── 2. Width transition ─────────────────────────────────────────

app.appendChild(separator());
app.appendChild(text('section-label', '2. Width Transition (width, 400ms ease-in-out)'));

const widthBox = doc.createElement('div');
widthBox.className = 'width-box';
widthBox.textContent = 'Press W to toggle width';
app.appendChild(widthBox);

// ── 3. Opacity transition ───────────────────────────────────────

app.appendChild(separator());
app.appendChild(text('section-label', '3. Opacity Transition (opacity, 600ms ease)'));

const opacityBox = doc.createElement('div');
opacityBox.className = 'opacity-box';
opacityBox.textContent = 'Press O to fade in/out';
app.appendChild(opacityBox);

// ── 4. Multi-property transition ────────────────────────────────

app.appendChild(separator());
app.appendChild(text('section-label', '4. Multi-Property (bg + color 300ms, width 500ms)'));

const multiBox = doc.createElement('div');
multiBox.className = 'multi-box';
multiBox.textContent = 'Press M to activate/deactivate';
app.appendChild(multiBox);

// ── 5. Event log ────────────────────────────────────────────────

app.appendChild(separator());
const eventLog = text('event-log', 'Transition events will appear here...');
app.appendChild(eventLog);

// Listen for transition events on all demo boxes
const logEvents = ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel'];

for (const type of logEvents) {
  app.addEventListener(type, ((e: Event) => {
    const te = e as Event & {propertyName?: string; elapsedTime?: number};
    const prop = te.propertyName ?? '?';
    const elapsed = te.elapsedTime?.toFixed(0) ?? '?';
    eventLog.textContent = `${type} → ${prop} (${elapsed}ms)`;
  }) as EventListener);
}

// ── Hint ────────────────────────────────────────────────────────

app.appendChild(separator());
app.appendChild(text('hint', '1/2/3 = colors  W = width  O = opacity  M = multi  Ctrl+C = quit'));

doc.body.appendChild(app);

// ── Input handling ──────────────────────────────────────────────

let colorState = 0;
let widthWide = false;
let opacityFaded = false;
let multiActive = false;

doc.body.addEventListener('keydown', (event: Event) => {
  const ke = event as KeyboardEvent;

  if (ke.key === 'c' && ke.ctrlKey) {
    terminal.exit();
    process.exit(0);
  }

  switch (ke.key) {
    case '1':
      colorBox.className = 'color-box state-a';
      colorState = 1;
      break;
    case '2':
      colorBox.className = 'color-box state-b';
      colorState = 2;
      break;
    case '3':
      colorBox.className = 'color-box state-c';
      colorState = 3;
      break;
    case 'w':
    case 'W':
      widthWide = !widthWide;
      widthBox.className = widthWide ? 'width-box wide' : 'width-box';
      break;
    case 'o':
    case 'O':
      opacityFaded = !opacityFaded;
      opacityBox.className = opacityFaded ? 'opacity-box faded' : 'opacity-box';
      break;
    case 'm':
    case 'M':
      multiActive = !multiActive;
      multiBox.className = multiActive ? 'multi-box active' : 'multi-box';
      break;
  }
});

// ── Start ───────────────────────────────────────────────────────

await terminal.run();
