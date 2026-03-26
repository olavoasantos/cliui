import {Terminal} from '@micra/terminal-dom';
import {UiSpinner} from '@micra/terminal-dom/components';

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

window.customElements.define(UiSpinner.tagName, UiSpinner);

const style = document.createElement('style');
style.textContent = `
  .app {
    padding: 1;
    border-style: rounded;
    border-color: #7c3aed;
    color: #e5e7eb;
    background-color: #0f172a;
  }

  .title {
    color: #c4b5fd;
    font-weight: bold;
  }

  .hint {
    color: #93c5fd;
  }

  .capabilities {
    color: #86efac;
  }

  .row {
    display: flex;
    gap: 1;
  }

  .panel {
    padding: 0 1;
    border-style: rounded;
    border-color: #475569;
    color: #e2e8f0;
  }

  .focus {
    border-color: #f59e0b;
    color: #fef3c7;
  }

  .block-border {
    border-style: block;
    color: #0f172a;
    background-color: #fde68a;
  }

  .half-block-border {
    border-style: half-block;
    color: #e9d5ff;
    background-color: #312e81;
  }

  .feature-title {
    color: #fca5a5;
    font-weight: bold;
  }

  .spinner-row {
    display: flex;
    gap: 1;
  }

  .spinner-panel {
    padding: 0 1;
    border-style: rounded;
    border-color: #475569;
    color: #e2e8f0;
  }

  .spinner-demo {
    display: flex;
    gap: 2;
    color: #dbeafe;
  }

  .main {
    display: flex;
    gap: 1;
  }

  .overlay-panel {
    width: 34;
  }

  .overlay-stage {
    width: 30;
    height: 8;
    padding: 1;
    border-style: double;
    border-color: #38bdf8;
    background-color: #0b1120;
  }

  .layer {
    position: absolute;
    width: 12;
    height: 3;
    padding: 0 1;
    border-style: rounded;
  }

  .layer-low {
    top: 2;
    left: 2;
    z-index: 1;
    border-color: #f97316;
    background-color: #7c2d12;
    color: #ffedd5;
  }

  .layer-mid {
    top: 4;
    left: 8;
    z-index: 4;
    border-color: #22c55e;
    background-color: #14532d;
    color: #dcfce7;
  }

  .layer-top {
    top: 3;
    left: 12;
    z-index: 8;
    border-color: #f472b6;
    background-color: #831843;
    color: #fce7f3;
  }

  .scroll-panel {
    width: 31;
  }

  .scroll-frame {
    width: 27;
    height: 8;
    padding: 0 1;
    border-style: rounded;
    border-color: #60a5fa;
    overflow: scroll;
    background-color: #111827;
    color: #dbeafe;
  }

  .scroll-line {
    color: #bfdbfe;
  }

  .scroll-accent {
    color: #fca5a5;
  }

  .status {
    color: #cbd5e1;
  }
`;
document.head.appendChild(style);

const app = document.createElement('div');
app.className = 'app';

const title = document.createElement('div');
title.className = 'title';
title.textContent = 'milestone 4 playground';

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Tab • click layers • wheel log • paste • q/Ctrl+C quits';

const capabilities = document.createElement('div');
capabilities.className = 'capabilities';
capabilities.textContent = `Caps: depth ${process.stdout.getColorDepth?.() ?? 'unknown'} • tty ${process.stdin.isTTY ? 'yes' : 'no'} • raw ${typeof process.stdin.setRawMode === 'function' ? 'yes' : 'no'}`;

const borderRow = document.createElement('div');
borderRow.className = 'row';

const blockBorder = document.createElement('div');
blockBorder.className = 'panel block-border';
blockBorder.textContent = 'block';

const halfBlockBorder = document.createElement('div');
halfBlockBorder.className = 'panel half-block-border';
halfBlockBorder.textContent = 'half-block';

borderRow.appendChild(blockBorder);
borderRow.appendChild(halfBlockBorder);

const spinnerRow = document.createElement('div');
spinnerRow.className = 'spinner-row';

const spinnerPanel = document.createElement('div');
spinnerPanel.className = 'spinner-panel';

const spinnerTitle = document.createElement('div');
spinnerTitle.className = 'feature-title';
spinnerTitle.textContent = 'built-in custom elements';

const spinnerDemo = document.createElement('div');
spinnerDemo.className = 'spinner-demo';

const defaultSpinner = document.createElement('ui-spinner');
defaultSpinner.setAttribute('label', 'Loading dashboard');

const pulseSpinner = document.createElement('ui-spinner');
pulseSpinner.setAttribute('variant', 'pulse');
pulseSpinner.setAttribute('interval', '120');
pulseSpinner.setAttribute('label', 'Syncing');

spinnerDemo.appendChild(defaultSpinner);
spinnerDemo.appendChild(pulseSpinner);
spinnerPanel.appendChild(spinnerTitle);
spinnerPanel.appendChild(spinnerDemo);
spinnerRow.appendChild(spinnerPanel);

const mainRow = document.createElement('div');
mainRow.className = 'main';

const overlayPanel = document.createElement('div');
overlayPanel.className = 'overlay-panel';

const overlayTitle = document.createElement('div');
overlayTitle.className = 'feature-title';
overlayTitle.textContent = 'absolute + z-index';

const overlayStage = document.createElement('div');
overlayStage.className = 'overlay-stage';
overlayStage.setAttribute('tabindex', '0');
overlayStage.textContent = 'Stage';

const layerLow = document.createElement('div');
layerLow.className = 'panel layer layer-low';
layerLow.setAttribute('tabindex', '0');
layerLow.textContent = 'low';

const layerMid = document.createElement('div');
layerMid.className = 'panel layer layer-mid';
layerMid.setAttribute('tabindex', '0');
layerMid.textContent = 'mid';

const layerTop = document.createElement('div');
layerTop.className = 'panel layer layer-top';
layerTop.setAttribute('tabindex', '0');
layerTop.textContent = 'top';

overlayStage.appendChild(layerLow);
overlayStage.appendChild(layerMid);
overlayStage.appendChild(layerTop);
overlayPanel.appendChild(overlayTitle);
overlayPanel.appendChild(overlayStage);

const scrollPanel = document.createElement('div');
scrollPanel.className = 'scroll-panel';

const scrollTitle = document.createElement('div');
scrollTitle.className = 'feature-title';
scrollTitle.textContent = 'overflow: scroll';

const scrollFrame = document.createElement('div');
scrollFrame.className = 'scroll-frame panel';
scrollFrame.setAttribute('tabindex', '0');

for (let index = 1; index <= 14; index += 1) {
  const line = document.createElement('div');
  line.className = index % 3 === 0 ? 'scroll-line scroll-accent' : 'scroll-line';
  line.textContent = `Log ${String(index).padStart(2, '0')} — wheel this pane`;
  scrollFrame.appendChild(line);
}

scrollPanel.appendChild(scrollTitle);
scrollPanel.appendChild(scrollFrame);

mainRow.appendChild(overlayPanel);
mainRow.appendChild(scrollPanel);

const focusLine = document.createElement('div');
focusLine.className = 'status';
const activityLine = document.createElement('div');
activityLine.className = 'status';
const environmentLine = document.createElement('div');
environmentLine.className = 'status';
const observed = document.createElement('div');
observed.className = 'status';
observed.textContent = 'Observed: ready';

app.appendChild(title);
app.appendChild(hint);
app.appendChild(capabilities);
app.appendChild(borderRow);
app.appendChild(spinnerRow);
app.appendChild(mainRow);
app.appendChild(focusLine);
app.appendChild(activityLine);
app.appendChild(environmentLine);
app.appendChild(observed);
document.body.appendChild(app);

const focusable = [overlayStage, layerLow, layerMid, layerTop, scrollFrame];
let scrollEvents = 0;

function refreshFocus(): void {
  for (const element of focusable) {
    const classes = element.className
      .split(' ')
      .filter(Boolean)
      .filter((name) => name !== 'focus');

    if (document.activeElement === element) {
      classes.push('focus');
    }

    element.className = classes.join(' ');
  }

  focusLine.textContent =
    document.activeElement === document.body
      ? 'Focus: body'
      : `Focus: ${document.activeElement.textContent ?? 'unknown'}`;
}

function setObserved(text: string): void {
  observed.textContent = `Observed: ${text}`;
}

function registerKeyboardTarget(element: (typeof focusable)[number] | typeof document.body): void {
  element.addEventListener('keydown', (event) => {
    const keyboardEvent = event as {key?: string};
    const key = keyboardEvent.key ?? 'unknown';

    activityLine.textContent = `Activity: key ${key}`;
    setObserved(`key ${key}`);

    if (key === 'q') {
      terminal.exit();
    }
  });
}

for (const element of focusable) {
  element.addEventListener('focus', refreshFocus);
  element.addEventListener('blur', refreshFocus);
  registerKeyboardTarget(element);
}

registerKeyboardTarget(document.body);

for (const [label, element] of [
  ['low', layerLow],
  ['mid', layerMid],
  ['top', layerTop],
] as const) {
  element.addEventListener('mousedown', () => {
    activityLine.textContent = `Activity: down on ${label}`;
  });

  element.addEventListener('click', () => {
    activityLine.textContent = `Activity: clicked ${label}`;
    setObserved(`clicked ${label}`);
  });
}

overlayStage.addEventListener('click', () => {
  activityLine.textContent = 'Activity: clicked stage';
  setObserved('clicked stage');
});

scrollFrame.addEventListener('wheel', (event) => {
  const wheelEvent = event as {deltaY?: number};
  scrollEvents += wheelEvent.deltaY === 1 ? 1 : wheelEvent.deltaY === -1 ? -1 : 0;
  activityLine.textContent = `Activity: scroll ${wheelEvent.deltaY ?? 0} (${scrollEvents})`;
  setObserved(`scroll ${scrollEvents}`);
});

scrollFrame.addEventListener('click', () => {
  activityLine.textContent = 'Activity: clicked scroll pane';
  setObserved('clicked scroll viewport');
});

scrollFrame.addEventListener('paste', (event) => {
  const clipboardEvent = event as {clipboardData?: {getData(type: string): string}};
  const text = clipboardEvent.clipboardData?.getData('text/plain') ?? '';
  activityLine.textContent = `Activity: paste ${text || '(empty)'}`;
  setObserved(`paste ${text || '(empty)'}`);
});

const observer = new window.MutationObserver((records) => {
  const summary = records
    .map((record) => `${record.type}${record.attributeName ? `:${record.attributeName}` : ''}`)
    .join(', ');

  environmentLine.textContent = `Env: mutation ${summary || 'none'} • ${process.stdout.columns ?? '?'}x${process.stdout.rows ?? '?'}`;
});

observer.observe(observed, {
  attributes: true,
  attributeOldValue: true,
  characterData: true,
  childList: true,
  subtree: true,
});

window.addEventListener('focus', () => {
  environmentLine.textContent = `Env: window focus • ${process.stdout.columns ?? '?'}x${process.stdout.rows ?? '?'}`;
});

window.addEventListener('blur', () => {
  environmentLine.textContent = `Env: window blur • ${process.stdout.columns ?? '?'}x${process.stdout.rows ?? '?'}`;
});

window.addEventListener('resize', () => {
  environmentLine.textContent = `Env: resize • ${process.stdout.columns ?? '?'}x${process.stdout.rows ?? '?'}`;
});

refreshFocus();
activityLine.textContent = 'Activity: click layers, wheel log, paste';
environmentLine.textContent = `Env: ready • ${process.stdout.columns ?? '?'}x${process.stdout.rows ?? '?'}`;

const emergencyInputHandler = (chunk: Buffer | string): void => {
  const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');

  if (text.includes('q') || text.includes('\u0003')) {
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
