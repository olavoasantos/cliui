/**
 * DevTools Bridge Example
 *
 * Demonstrates connecting Chrome DevTools to a terminal-dom application.
 *
 * Run with:
 *   cd examples/devtools && pnpm dev
 *
 * Then open Chrome and navigate to:
 *   chrome://inspect
 *
 * Click "Configure..." and add localhost:9222, then click "inspect"
 * on the Terminal DOM target that appears.
 *
 * You can also open DevTools directly at:
 *   devtools://devtools/bundled/inspector.html?ws=127.0.0.1:9222/devtools/page
 */

import {Terminal, StyleEngine} from '@cliui/terminal';
import {CSSParser, SelectorMatcher} from '@cliui/terminal/css';
import {DevToolsBridge} from '@cliui/devtools';
import css from './styles.css?inline';

// ── Terminal setup ───────────────────────────────────────────────────

const terminal = new Terminal({
  altScreen: true,
  fps: 30,
  output: process.stdout,
  input: process.stdin,
});

// ── Styles ───────────────────────────────────────────────────────────

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

// ── DOM structure ────────────────────────────────────────────────────

const app = document.createElement('div');
app.className = 'app';
app.setAttribute('id', 'app');

// Header
const header = document.createElement('div');
header.className = 'header';

const title = document.createElement('div');
title.className = 'title';
title.textContent = '🔧 DevTools Bridge Demo';

const badge = document.createElement('div');
badge.className = 'badge';
badge.textContent = ' CDP ';

header.appendChild(title);
header.appendChild(badge);

// Counter section
const section = document.createElement('div');
section.className = 'section';
section.setAttribute('id', 'content');

const counter = document.createElement('div');
counter.className = 'counter';
counter.setAttribute('id', 'counter');

// List of items
const items = ['Elements panel', 'Styles pane', 'Console', 'Performance'];
const itemElements: HTMLElement[] = [];

for (const label of items) {
  const item = document.createElement('div') as unknown as HTMLElement;
  item.className = 'item';
  item.textContent = `  ${label}`;
  item.setAttribute('data-feature', label.toLowerCase().replace(' ', '-'));
  itemElements.push(item);
  section.appendChild(item);
}

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = '↑/↓ Navigate  •  Space Select  •  q Quit';

let count = 0;
let selectedIndex = 0;

function render() {
  counter.textContent = `Interactions: ${count}`;

  for (let i = 0; i < itemElements.length; i++) {
    const el = itemElements[i];
    if (i === selectedIndex) {
      el.className = 'item-active';
      el.textContent = `▸ ${items[i]}`;
    } else {
      el.className = 'item';
      el.textContent = `  ${items[i]}`;
    }
  }
}

render();

app.appendChild(header);
app.appendChild(counter);
app.appendChild(section);
app.appendChild(hint);
document.body.appendChild(app);

// ── DevTools Bridge ──────────────────────────────────────────────────

// Create a StyleEngine that reads from the same document for DevTools inspection
const inspectionStyleEngine = new StyleEngine();
inspectionStyleEngine.attach(document);

const bridge = new DevToolsBridge({
  window: terminal.window,
  document: terminal.document,
  styleEngine: inspectionStyleEngine,
  selectorMatcher: new SelectorMatcher(),
  cssParser: new CSSParser(),
  terminalInstance: terminal,
  options: {port: 9222, debug: true},
});

await bridge.listen();

// ── Input handling ───────────────────────────────────────────────────

document.body.addEventListener('keydown', (event: KeyboardEvent) => {
  const key = event.key;

  if (key === 'q' || (key === 'c' && event.ctrlKey)) {
    bridge.close().then(() => {
      terminal.exit();
      process.exit(0);
    });
    return;
  }

  if (key === 'ArrowUp') {
    selectedIndex = Math.max(0, selectedIndex - 1);
    count++;
    render();
    return;
  }

  if (key === 'ArrowDown') {
    selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
    count++;
    render();
    return;
  }

  if (key === ' ') {
    count++;
    const selected = items[selectedIndex];
    console.log(`Selected: ${selected}`);
    render();
    return;
  }

  count++;
  render();
});

// ── Start ────────────────────────────────────────────────────────────

await terminal.run();
