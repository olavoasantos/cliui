import {Terminal} from '@cliui/terminal';
import css from './styles.css?inline';

const terminal = new Terminal({
  altScreen: true,
  fps: 30,
  output: process.stdout,
  input: process.stdin,
});

const style = document.createElement('style');
style.textContent = css;
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

document.body.addEventListener('keydown', (event: KeyboardEvent) => {
  const key = event.key;

  if (key === 'c' && event.ctrlKey) {
    terminal.exit();
    process.exit(0);
  }

  count++;
  render();
});

await terminal.run();
