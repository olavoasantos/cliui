import {Terminal} from '@micra/terminal-dom';
import {UiProgress} from '@micra/terminal-dom/components';

process.stdin.setRawMode?.(true);
process.stdin.resume();

const terminal = new Terminal({
  altScreen: true,
  mouse: false,
  fps: 30,
  output: process.stdout,
  input: process.stdin,
});

const {document, window} = terminal;

window.customElements.define(UiProgress.tagName, UiProgress);

const style = document.createElement('style');
style.textContent = `
  .app {
    padding: 1;
    border-style: rounded;
    border-color: #7c3aed;
    color: #e5e7eb;
    background-color: #0f172a;
    display: flex;
    flex-direction: column;
    gap: 1;
  }

  .title {
    color: #c4b5fd;
    font-weight: bold;
  }

  .hint {
    color: #93c5fd;
  }

  .panel {
    padding: 0 1;
    border-style: rounded;
    border-color: #475569;
    color: #e2e8f0;
    display: flex;
    flex-direction: column;
    gap: 1;
  }

  .panel-title {
    color: #fca5a5;
    font-weight: bold;
  }

  .muted {
    color: #cbd5e1;
  }
`;
document.head.appendChild(style);

const app = document.createElement('div');
app.className = 'app';

const title = document.createElement('div');
title.className = 'title';
title.textContent = 'ui-progress basic example';

const hint = document.createElement('div');
hint.className = 'hint';
hint.textContent = 'Watch the animated bars update. Press q or Ctrl+C to quit.';

const animatedPanel = document.createElement('div');
animatedPanel.className = 'panel';

const animatedTitle = document.createElement('div');
animatedTitle.className = 'panel-title';
animatedTitle.textContent = 'Animated progress';

const deployProgress = document.createElement('ui-progress');
deployProgress.setAttribute('animated', '');
deployProgress.setAttribute('label', 'Deploy');
deployProgress.setAttribute('show-value', '');
deployProgress.setAttribute('width', '24');
deployProgress.setAttribute('value', '12');

const syncProgress = document.createElement('ui-progress');
syncProgress.setAttribute('animated', '');
syncProgress.setAttribute('label', 'Sync');
syncProgress.setAttribute('show-value', '');
syncProgress.setAttribute('width', '24');
syncProgress.setAttribute('value', '68');

animatedPanel.appendChild(animatedTitle);
animatedPanel.appendChild(deployProgress);
animatedPanel.appendChild(syncProgress);

const blockPanel = document.createElement('div');
blockPanel.className = 'panel';

const blockTitle = document.createElement('div');
blockTitle.className = 'panel-title';
blockTitle.textContent = 'Default block preset';

const queueProgress = document.createElement('ui-progress');
queueProgress.setAttribute('label', 'Queue');
queueProgress.setAttribute('show-value', '');
queueProgress.setAttribute('width', '24');
queueProgress.setAttribute('value', '42');

const indexProgress = document.createElement('ui-progress');
indexProgress.setAttribute('label', 'Index');
indexProgress.setAttribute('show-value', '');
indexProgress.setAttribute('width', '24');
indexProgress.setAttribute('value', '78');

blockPanel.appendChild(blockTitle);
blockPanel.appendChild(queueProgress);
blockPanel.appendChild(indexProgress);

const status = document.createElement('div');
status.className = 'muted';
status.textContent = 'Status: ready';

app.appendChild(title);
app.appendChild(hint);
app.appendChild(animatedPanel);
app.appendChild(blockPanel);
app.appendChild(status);
document.body.appendChild(app);

let deployValue = 12;
let deployDirection = 1;
let syncValue = 68;
let syncDirection = -1;

const animationTimer = setInterval(() => {
  deployValue += deployDirection * 11;
  syncValue += syncDirection * 7;

  if (deployValue >= 100) {
    deployValue = 100;
    deployDirection = -1;
  } else if (deployValue <= 0) {
    deployValue = 0;
    deployDirection = 1;
  }

  if (syncValue >= 100) {
    syncValue = 100;
    syncDirection = -1;
  } else if (syncValue <= 0) {
    syncValue = 0;
    syncDirection = 1;
  }

  deployProgress.setAttribute('value', String(deployValue));
  syncProgress.setAttribute('value', String(syncValue));
  status.textContent = `Status: Deploy ${deployValue}% • Sync ${syncValue}%`;
}, 900);

const shutdown = (): void => {
  clearInterval(animationTimer);
  terminal.exit();
};

const emergencyInputHandler = (chunk: Buffer | string): void => {
  const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');

  if (text.includes('q') || text.includes('\u0003')) {
    shutdown();
    process.exit(0);
  }
};

process.stdin.on('data', emergencyInputHandler);

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});

await terminal.run();
