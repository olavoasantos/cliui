import {Terminal} from '@micra/terminal-dom';

const terminal = new Terminal({
  altScreen: true,
  mouse: true,
  fps: 30,
  output: process.stdout,
  input: process.stdin,
});

const {document, window} = terminal;

const style = document.createElement('style');
style.textContent = `
  .app {
    padding: 1;
    border-style: rounded;
    border-color: #7c3aed;
    color: #e5e7eb;
  }

  .title {
    color: #a78bfa;
    font-weight: bold;
  }

  .hint {
    color: #93c5fd;
  }

  .row {
    display: flex;
    gap: 1;
  }

  .button {
    padding: 0 1;
    border-style: rounded;
    border-color: #64748b;
  }

  .focus {
    border-color: #f59e0b;
    color: #fef3c7;
  }
`;
document.head.appendChild(style);

const app = document.createElement('div');
app.className = 'app';

const title = document.createElement('div');
title.className = 'title';
title.textContent = 'terminal-dom basic playground';

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Tab focus • click • wheel • paste on Paste • resize • window focus • q quits';

const buttons = document.createElement('div');
buttons.className = 'row';

const alpha = document.createElement('div');
alpha.className = 'button';
alpha.setAttribute('tabindex', '0');
alpha.textContent = 'Alpha';

const beta = document.createElement('div');
beta.className = 'button';
beta.setAttribute('tabindex', '0');
beta.textContent = 'Beta';

const pasteTarget = document.createElement('div');
pasteTarget.className = 'button';
pasteTarget.setAttribute('tabindex', '0');
pasteTarget.textContent = 'Paste';

buttons.appendChild(alpha);
buttons.appendChild(beta);
buttons.appendChild(pasteTarget);

const activeLine = document.createElement('div');
const keyLine = document.createElement('div');
const pasteLine = document.createElement('div');
const mouseLine = document.createElement('div');
const mutationLine = document.createElement('div');
const resizeLine = document.createElement('div');
const windowLine = document.createElement('div');

const observed = document.createElement('div');
observed.textContent = 'Observed: ready';

app.appendChild(title);
app.appendChild(hint);
app.appendChild(buttons);
app.appendChild(activeLine);
app.appendChild(keyLine);
app.appendChild(pasteLine);
app.appendChild(mouseLine);
app.appendChild(mutationLine);
app.appendChild(resizeLine);
app.appendChild(windowLine);
app.appendChild(observed);
document.body.appendChild(app);

const focusable = [alpha, beta, pasteTarget];
let counter = 0;

function refreshFocus(): void {
  for (const element of focusable) {
    element.className = document.activeElement === element ? 'button focus' : 'button';
  }

  activeLine.textContent =
    document.activeElement === document.body
      ? 'Active: body'
      : `Active: ${document.activeElement.textContent ?? 'unknown'}`;
}

function setObserved(text: string): void {
  observed.textContent = `Observed: ${text}`;
}

for (const element of focusable) {
  element.addEventListener('focus', refreshFocus);
  element.addEventListener('blur', refreshFocus);

  element.addEventListener('mousedown', () => {
    mouseLine.textContent = `Mouse: down ${element.textContent ?? ''}`;
  });

  element.addEventListener('mouseup', () => {
    mouseLine.textContent = `Mouse: up ${element.textContent ?? ''}`;
  });

  element.addEventListener('click', () => {
    setObserved(`click ${element.textContent ?? ''}`);
    mouseLine.textContent = `Mouse: click ${element.textContent ?? ''}`;
  });

  element.addEventListener('mousemove', () => {
    mouseLine.textContent = `Mouse: move ${element.textContent ?? ''}`;
  });

  element.addEventListener('wheel', (event) => {
    const wheelEvent = event as {deltaY?: number};
    counter += wheelEvent.deltaY === 1 ? 1 : wheelEvent.deltaY === -1 ? -1 : 0;
    mouseLine.textContent = `Mouse: wheel ${element.textContent ?? ''} (${counter})`;
    setObserved(`wheel ${counter}`);
  });

  element.addEventListener('keydown', (event) => {
    const keyboardEvent = event as {key?: string};
    keyLine.textContent = `Key: ${keyboardEvent.key ?? 'unknown'} on ${element.textContent ?? ''}`;
    setObserved(`key ${keyboardEvent.key ?? 'unknown'}`);
  });
}

pasteTarget.addEventListener('paste', (event) => {
  const clipboardEvent = event as {clipboardData?: {getData(type: string): string}};
  const text = clipboardEvent.clipboardData?.getData('text/plain') ?? '';
  pasteLine.textContent = `Paste: ${text || '(empty)'}`;
  setObserved(`paste ${text || '(empty)'}`);
});

const observer = new window.MutationObserver((records) => {
  const summary = records
    .map((record) => `${record.type}${record.attributeName ? `:${record.attributeName}` : ''}`)
    .join(', ');

  mutationLine.textContent = `MutationObserver: ${summary || 'none'}`;
});

observer.observe(observed, {
  attributes: true,
  attributeOldValue: true,
  characterData: true,
  childList: true,
  subtree: true,
});

window.addEventListener('focus', () => {
  windowLine.textContent = 'Window: focus';
});

window.addEventListener('blur', () => {
  windowLine.textContent = 'Window: blur';
});

window.addEventListener('resize', () => {
  resizeLine.textContent = `Resize: ${process.stdout.columns ?? '?'}x${process.stdout.rows ?? '?'}`;
});

document.body.addEventListener('keydown', (event) => {
  const keyboardEvent = event as {key?: string};

  if (keyboardEvent.key === 'q') {
    terminal.exit();
  }
});

refreshFocus();
keyLine.textContent = 'Key: —';
pasteLine.textContent = 'Paste: —';
mouseLine.textContent = 'Mouse: —';
mutationLine.textContent = 'MutationObserver: —';
resizeLine.textContent = `Resize: ${process.stdout.columns ?? '?'}x${process.stdout.rows ?? '?'}`;
windowLine.textContent = 'Window: —';

await terminal.run();
