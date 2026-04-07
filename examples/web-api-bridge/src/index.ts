/**
 * Web API ↔ Terminal Bridge — Interactive Demo
 *
 * Showcases every bridge from Milestone 13:
 *   1  document.title → OSC 2 window title
 *   2  <a href> → clickable hyperlinks (OSC 8)
 *   3  document.hasFocus() / visibilityState
 *   4  alert() / confirm() / prompt()
 *   5  Notification API → OSC 9 / BEL
 *   6  navigator.clipboard → OSC 52
 *   7  matchMedia('(prefers-color-scheme: dark)')
 *   8  window.location.pathname → OSC 7 CWD reporting
 *   9  CSS cursor property → terminal cursor shape
 *
 * Press 1–9 to try each feature, q to exit.
 */
import {Terminal} from '@cliui/terminal';
import {Button} from '@cliui/elements';

const terminal = new Terminal({
  altScreen: true,
  mouse: true,
  fps: 30,
});

const {document, window} = terminal;

// Register elements
window.customElements.define(Button.tagName, Button);

// ─── Styles ──────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  .app {
    display: flex;
    flex-direction: column;
    padding: 1 2;
    gap: 1;
  }
  .title {
    font-weight: bold;
    color: #c084fc;
    text-decoration: underline;
  }
  .subtitle {
    color: #94a3b8;
  }
  .menu {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .menu-item {
    display: flex;
    flex-direction: row;
  }
  .key {
    color: #fbbf24;
    font-weight: bold;
  }
  .desc {
    color: #e2e8f0;
  }
  .status {
    color: #22c55e;
    border-style: rounded;
    border-color: #334155;
    padding: 0 1;
  }
  .link {
    color: #60a5fa;
    text-decoration: underline;
  }
  .cursor-demo {
    display: flex;
    flex-direction: row;
    gap: 2;
  }
  .cursor-item {
    padding: 0 1;
    border-style: rounded;
    border-color: #475569;
  }
`;
document.head.appendChild(style);

// ─── App layout ──────────────────────────────────────────
const app = document.createElement('div');
app.className = 'app';

const titleEl = document.createElement('div');
titleEl.className = 'title';
titleEl.textContent = '🌐 Web API ↔ Terminal Bridge Demo';
app.appendChild(titleEl);

const subtitle = document.createElement('div');
subtitle.className = 'subtitle';
subtitle.textContent = 'Press 1–9 to try each bridge, q to exit';
app.appendChild(subtitle);

const menu = document.createElement('div');
menu.className = 'menu';

const items = [
  ['1', 'document.title → window title (OSC 2)'],
  ['2', '<a href> → clickable hyperlinks (OSC 8)'],
  ['3', 'document.hasFocus() / visibilityState'],
  ['4', 'alert() / confirm() / prompt() dialogs'],
  ['5', 'Notification → terminal notification (BEL)'],
  ['6', 'navigator.clipboard read/write (OSC 52)'],
  ['7', 'matchMedia prefers-color-scheme'],
  ['8', 'window.location.pathname → CWD (OSC 7)'],
  ['9', 'CSS cursor property → cursor shape'],
];

for (const [key, desc] of items) {
  const row = document.createElement('div');
  row.className = 'menu-item';

  const keyEl = document.createElement('span');
  keyEl.className = 'key';
  keyEl.textContent = `  [${key}] `;
  row.appendChild(keyEl);

  const descEl = document.createElement('span');
  descEl.className = 'desc';
  descEl.textContent = desc;
  row.appendChild(descEl);

  menu.appendChild(row);
}

app.appendChild(menu);

// ─── Status area ─────────────────────────────────────────
const status = document.createElement('div');
status.className = 'status';
status.textContent = 'Ready — press a number key';
app.appendChild(status);

// ─── Dynamic content area ────────────────────────────────
const contentArea = document.createElement('div');
app.appendChild(contentArea);

document.body.appendChild(app);

// ─── Set initial document title ──────────────────────────
document.title = 'Web API Bridge Demo';

// ─── Keyboard handler ────────────────────────────────────
document.body.addEventListener('keydown', async (event: Event) => {
  const key = (event as KeyboardEvent).key;

  // Clear content area
  contentArea.textContent = '';

  switch (key) {
    case '1': {
      // Document title
      document.title = 'Title changed! — ' + new Date().toLocaleTimeString();
      status.textContent = '✓ document.title updated → check your terminal tab title';
      break;
    }

    case '2': {
      // Anchor hyperlinks
      const link = document.createElement('a');
      link.setAttribute('href', 'https://github.com');
      link.className = 'link';
      link.textContent = '🔗 Click this link → https://github.com (OSC 8 hyperlink)';
      contentArea.appendChild(link);
      status.textContent = '✓ Hyperlink rendered — hover/click to open in browser';
      break;
    }

    case '3': {
      // Focus state
      const hasFocus = document.hasFocus();
      const visibility = document.visibilityState;
      status.textContent = `✓ hasFocus(): ${hasFocus} | visibilityState: "${visibility}"`;

      const hint = document.createElement('div');
      hint.className = 'subtitle';
      hint.textContent = '  (Switch terminal focus away and back to see changes)';
      contentArea.appendChild(hint);

      // Listen for visibility changes
      const handler = () => {
        status.textContent =
          `✓ hasFocus(): ${document.hasFocus()} | visibilityState: "${document.visibilityState}"`;
      };
      document.addEventListener('visibilitychange', handler);
      break;
    }

    case '4': {
      // Dialogs — alert
      status.textContent = '⏳ Showing alert...';
      await window.alert('Hello from window.alert()!');
      status.textContent = '✓ Alert dismissed';

      // Dialogs — confirm
      status.textContent = '⏳ Showing confirm...';
      const confirmed = await window.confirm('Do you like terminal UIs?');
      status.textContent = `✓ Confirm result: ${confirmed}`;

      // Dialogs — prompt
      status.textContent = '⏳ Showing prompt...';
      const name = await window.prompt('What is your name?', 'Developer');
      status.textContent = `✓ Prompt result: ${name === null ? '(cancelled)' : `"${name}"`}`;
      break;
    }

    case '5': {
      // Notifications — use window.Notification
      const NotifClass = window.Notification as unknown as {
        new (title: string, options?: {body?: string}): unknown;
      };
      new NotifClass('Build Complete', {
        body: 'All 1053 tests passed ✓',
      });
      status.textContent = '✓ Notification sent (OSC 9/777 or BEL fallback)';
      break;
    }

    case '6': {
      // Clipboard
      const textToCopy = 'Hello from navigator.clipboard! 📋';
      await window.navigator.clipboard.writeText(textToCopy);
      const readBack = await window.navigator.clipboard.readText();
      status.textContent = `✓ Clipboard write: "${textToCopy}" | Read: "${readBack}"`;
      break;
    }

    case '7': {
      // matchMedia
      const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const lightQuery = window.matchMedia('(prefers-color-scheme: light)');

      status.textContent = `✓ Dark mode: ${darkQuery.matches} | Light mode: ${lightQuery.matches}`;

      darkQuery.addEventListener('change', (e: Event) => {
        const mqe = e as unknown as {matches: boolean};
        status.textContent = `✓ Color scheme changed → dark: ${mqe.matches}`;
      });

      const info = document.createElement('div');
      info.className = 'subtitle';
      info.textContent = `  Color scheme: "${window.getColorScheme()}" (default)`;
      contentArea.appendChild(info);
      break;
    }

    case '8': {
      // CWD reporting
      const currentPath = window.location.pathname;
      status.textContent = `✓ Current pathname: "${currentPath}"`;

      // Change the pathname
      window.location.pathname = '/demo/web-api-bridge';
      const info = document.createElement('div');
      info.className = 'subtitle';
      info.textContent = '  pathname changed to "/demo/web-api-bridge" → OSC 7 emitted';
      contentArea.appendChild(info);

      // Reset after a moment
      setTimeout(() => {
        window.location.pathname = currentPath;
      }, 3000);
      break;
    }

    case '9': {
      // CSS cursor property
      const cursorDemo = document.createElement('div');
      cursorDemo.className = 'cursor-demo';

      const cursorTypes = [
        {value: 'default', label: '▌ default (block)'},
        {value: 'text', label: '│ text (bar)'},
        {value: 'wait', label: '▌ wait (blink)'},
        {value: 'pointer', label: '▌ pointer (block)'},
        {value: 'none', label: '  none (hidden)'},
      ];

      for (const {value, label} of cursorTypes) {
        const item = document.createElement('div');
        item.className = 'cursor-item';
        item.setAttribute('tabindex', '0');
        item.style.cursor = value;
        item.textContent = label;
        cursorDemo.appendChild(item);
      }

      contentArea.appendChild(cursorDemo);
      status.textContent = '✓ Tab between items to see cursor shape change';
      break;
    }

    case 'q': {
      terminal.exit();
      process.exit(0);
      break;
    }
  }
});

await terminal.run();
