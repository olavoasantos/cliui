import {useState, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
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
      <div className="title">React</div>
      <div className="counter">{`Count: ${count}`}</div>
      <div className="hint">Press any key to increment. Ctrl+C to quit.</div>
    </div>
  );
}

const root = createRoot(document.body);
root.render(<App />);

await terminal.run();
