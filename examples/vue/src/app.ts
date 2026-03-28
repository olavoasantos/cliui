import {createApp, ref, onMounted, onUnmounted, h, defineComponent} from 'vue';
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
  .title { color: #c4b5fd; font-weight: bold; }
  .counter { color: #86efac; }
  .hint { color: #64748b; }
`;
document.head.appendChild(style);

const App = defineComponent({
  setup() {
    const count = ref(0);

    const handler = (event: Event) => {
      const key = (event as KeyboardEvent).key;

      if (key === 'c' && (event as KeyboardEvent).ctrlKey) {
        terminal.exit();
        process.exit(0);
      }

      count.value++;
    };

    onMounted(() => document.body.addEventListener('keydown', handler));
    onUnmounted(() => document.body.removeEventListener('keydown', handler));

    return () =>
      h('div', {class: 'app'}, [
        h('div', {class: 'title'}, 'Vue'),
        h('div', {class: 'counter'}, `Count: ${count.value}`),
        h('div', {class: 'hint'}, 'Press any key to increment. Ctrl+C to quit.'),
      ]);
  },
});

const app = createApp(App);
app.mount(document.body);

await terminal.run();
