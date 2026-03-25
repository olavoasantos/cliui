import {Terminal} from '@micra/terminal-dom';

const terminal = new Terminal({
  altScreen: true,
  mouse: false,
  fps: 30,
  output: process.stdout,
  input: process.stdin,
});

const {document} = terminal;

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
`;
document.head.appendChild(style);

const app = document.createElement('div');
app.className = 'app';

const title = document.createElement('div');
title.className = 'title';
title.textContent = 'Hello, terminal-dom';

const body = document.createElement('div');
body.textContent = 'Press q to quit.';

app.appendChild(title);
app.appendChild(body);
document.body.appendChild(app);

document.body.addEventListener('keydown', (event) => {
  const keyboardEvent = event as {key?: string};

  if (keyboardEvent.key === 'q') {
    terminal.exit();
  }
});

await terminal.run();
