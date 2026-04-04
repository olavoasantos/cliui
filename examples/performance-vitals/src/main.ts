import {Terminal, TerminalVitals, PerformanceObserver} from '@cliui/terminal';
import css from './styles.css?inline';

import type {TerminalVitalsMetricName} from '@cliui/terminal';

// ── Terminal setup ──────────────────────────────────────────────

const terminal = new Terminal({
  altScreen: true,
  fps: 30,
  output: process.stdout,
  input: process.stdin,
});

const doc = terminal.document;
const perf = terminal.window.performance;

const style = doc.createElement('style');
style.textContent = css;
doc.head.appendChild(style);

// ── Build the UI ────────────────────────────────────────────────

const app = doc.createElement('div');
app.className = 'app';

const header = doc.createElement('div');
header.className = 'header';
header.textContent = '⚡ Terminal Performance Vitals — Live Dashboard';

// Counter section (generates activity when user presses keys)
const counterBox = doc.createElement('div');
counterBox.className = 'counter-box';

const counterLabel = doc.createElement('span');
counterLabel.className = 'counter-label';
counterLabel.textContent = 'Key presses:';

const counterValue = doc.createElement('span');
counterValue.className = 'counter-value';
counterValue.textContent = '0';

counterBox.appendChild(counterLabel);
counterBox.appendChild(counterValue);

// Separator
function makeSeparator(): HTMLElement {
  const sep = doc.createElement('div');
  sep.className = 'separator';
  sep.textContent = '─'.repeat(50);
  return sep;
}

// Vitals sections
const paintTitle = doc.createElement('div');
paintTitle.className = 'section-title';
paintTitle.textContent = '🎨 Paint Timing';

const frameTitle = doc.createElement('div');
frameTitle.className = 'section-title';
frameTitle.textContent = '🖥  Frame Metrics';

const inputTitle = doc.createElement('div');
inputTitle.className = 'section-title';
inputTitle.textContent = '⌨  Input Metrics';

// Metric rows
function makeRow(label: string): {row: HTMLElement; valueEl: HTMLElement} {
  const row = doc.createElement('div');
  row.className = 'row';

  const labelEl = doc.createElement('span');
  labelEl.className = 'label';
  labelEl.textContent = label;

  const valueEl = doc.createElement('span');
  valueEl.className = 'value';
  valueEl.textContent = '—';

  row.appendChild(labelEl);
  row.appendChild(valueEl);
  return {row, valueEl};
}

const fcpRow = makeRow('First Contentful Paint');
const lcpRow = makeRow('Largest Contentful Paint');
const droppedRow = makeRow('Dropped Frames');
const budgetRow = makeRow('Frame Budget Utilization');
const idleRow = makeRow('Idle Frame Ratio');
const dirtyRow = makeRow('Dirty Element Ratio');
const outputRow = makeRow('Avg Frame Output Size');
const latencyRow = makeRow('Input Dispatch Latency');
const inpRow = makeRow('INP (p98)');

const hint = doc.createElement('div');
hint.className = 'hint';
hint.textContent = 'Press keys to generate input metrics. Ctrl+C to quit.';

// Assemble
app.appendChild(header);
app.appendChild(counterBox);
app.appendChild(makeSeparator());
app.appendChild(paintTitle);
app.appendChild(fcpRow.row);
app.appendChild(lcpRow.row);
app.appendChild(makeSeparator());
app.appendChild(frameTitle);
app.appendChild(droppedRow.row);
app.appendChild(budgetRow.row);
app.appendChild(idleRow.row);
app.appendChild(dirtyRow.row);
app.appendChild(outputRow.row);
app.appendChild(makeSeparator());
app.appendChild(inputTitle);
app.appendChild(latencyRow.row);
app.appendChild(inpRow.row);
app.appendChild(makeSeparator());
app.appendChild(hint);
doc.body.appendChild(app);

// ── Raw PerformanceObserver — log frame measures to a count ─────

let frameCount = 0;
const rawObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name === 'terminal.frame') {
      frameCount++;
    }
  }
});
rawObserver.observe({performance: perf, entryTypes: ['measure']});

// ── Terminal Vitals — high-level derived metrics ────────────────

const vitals = new TerminalVitals(perf, {fps: 30});

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtMs(n: number): string {
  return `${fmt(n, 2)} ms`;
}

function fmtPct(n: number): string {
  return `${fmt(n * 100, 1)}%`;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${Math.round(n)} B`;
  return `${fmt(n / 1024, 1)} KB`;
}

function setValueClass(el: HTMLElement, level: 'good' | 'warn' | 'bad'): void {
  el.className = level === 'good' ? 'value' : level === 'warn' ? 'value-warn' : 'value-bad';
}

const metricHandlers: Record<TerminalVitalsMetricName, (value: number) => void> = {
  'fcp': (v) => {
    fcpRow.valueEl.textContent = fmtMs(v);
  },
  'lcp': (v) => {
    lcpRow.valueEl.textContent = fmtMs(v);
  },
  'dropped-frames': (v) => {
    droppedRow.valueEl.textContent = String(v);
    setValueClass(droppedRow.valueEl, v === 0 ? 'good' : v < 5 ? 'warn' : 'bad');
  },
  'frame-budget-utilization': (v) => {
    budgetRow.valueEl.textContent = fmtPct(v);
    setValueClass(budgetRow.valueEl, v < 0.5 ? 'good' : v < 0.9 ? 'warn' : 'bad');
  },
  'idle-frame-ratio': (v) => {
    idleRow.valueEl.textContent = fmtPct(v);
  },
  'dirty-element-ratio': (v) => {
    dirtyRow.valueEl.textContent = fmtPct(v);
  },
  'frame-output-size': (v) => {
    outputRow.valueEl.textContent = fmtBytes(v);
  },
  'input-dispatch-latency': (v) => {
    latencyRow.valueEl.textContent = fmtMs(v);
    setValueClass(latencyRow.valueEl, v < 1 ? 'good' : v < 5 ? 'warn' : 'bad');
  },
  'inp': (v) => {
    inpRow.valueEl.textContent = fmtMs(v);
    setValueClass(inpRow.valueEl, v < 50 ? 'good' : v < 200 ? 'warn' : 'bad');
  },
};

for (const [name, handler] of Object.entries(metricHandlers)) {
  vitals.onMetric(name as TerminalVitalsMetricName, (m) => handler(m.value));
}

// ── Input handling ──────────────────────────────────────────────

let keyPresses = 0;

doc.body.addEventListener('keydown', (event: Event) => {
  const ke = event as KeyboardEvent;

  if (ke.key === 'c' && ke.ctrlKey) {
    vitals.disconnect();
    rawObserver.disconnect();
    terminal.exit();
    process.exit(0);
  }

  keyPresses++;
  counterValue.textContent = String(keyPresses);
});

// ── Start ───────────────────────────────────────────────────────

await terminal.run();
