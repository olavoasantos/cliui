import {mount} from 'svelte';
import {Terminal} from '@micra/terminal-dom';
import App from './App.svelte';
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

mount(App, {
  target: document.body,
  props: {terminal, doc: document},
});

await terminal.run();
