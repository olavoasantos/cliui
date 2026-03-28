import {Terminal} from '@micra/terminal-dom';

const terminal = new Terminal({
  altScreen: true,
  fps: 30,
  output: process.stdout,
  input: process.stdin,
});

const {document} = terminal;

const style = document.createElement('style');
style.textContent = `
  .app {
    padding: 1 2;
    border-style: rounded;
    border-color: #7c3aed;
    color: #e5e7eb;
    background-color: #1e1b2e;
    display: flex;
    flex-direction: column;
    gap: 1;
  }
  .title {
    color: #c4b5fd;
    font-weight: bold;
  }
  .counter {
    color: #86efac;
  }
  .hint {
    color: #64748b;
  }
`;
document.head.appendChild(style);

const app = document.createElement('div');
app.className = 'app';

const title = document.createElement('div');
title.className = 'title';
title.textContent = 'Vanilla TypeScript';

const counter = document.createElement('div');
counter.className = 'counter';

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Press any key to increment. Ctrl+C to quit.';

let count = 0;

function render() {
  counter.textContent = `Count: ${count}`;
}

render();

app.appendChild(title);
app.appendChild(counter);
app.appendChild(hint);
document.body.appendChild(app);

document.body.addEventListener('keydown', (event: Event) => {
  const key = (event as KeyboardEvent).key;

  if (key === 'c' && (event as KeyboardEvent).ctrlKey) {
    terminal.exit();
    process.exit(0);
  }

  count++;
  render();
});

await terminal.run();
