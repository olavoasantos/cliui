import '@micra/terminal-dom';
import {mount} from 'svelte';
import {Terminal} from '@micra/terminal-dom';
import App from './App.svelte';

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
  .title { color: #c4b5fd; font-weight: bold; }
  .counter { color: #86efac; }
  .hint { color: #64748b; }
`;
document.head.appendChild(style);

mount(App, {
  target: document.body,
  props: {terminal, doc: document},
});

await terminal.run();
