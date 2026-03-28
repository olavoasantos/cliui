import {createApp} from 'vue';
import {Terminal} from '@micra/terminal-dom';
import App from './App.vue';
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

const app = createApp(App, {terminal, doc: document});
app.mount(document.body);

await terminal.run();
