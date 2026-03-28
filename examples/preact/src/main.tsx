import {render} from 'preact';
import {useState, useEffect} from 'preact/hooks';
import {Terminal} from '@micra/terminal-dom';
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

function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const handler = (event: Event) => {
      const key = (event as KeyboardEvent).key;

      if (key === 'c' && (event as KeyboardEvent).ctrlKey) {
        terminal.exit();
        process.exit(0);
      }

      setCount((c) => c + 1);
    };

    document.body.addEventListener('keydown', handler);
    return () => document.body.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app">
      <div className="title">Preact</div>
      <div className="counter">{`Count: ${count}`}</div>
      <div className="hint">Press any key to increment. Ctrl+C to quit.</div>
    </div>
  );
}

render(<App />, document.body);

await terminal.run();
