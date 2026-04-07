/**
 * Demonstrates Terminal.loadDocument() with an inline HTML string.
 *
 * This shows that you don't need a separate HTML file — you can
 * pass HTML directly as a string.
 */

import {Terminal} from '@cliui/terminal';

process.stdin.setRawMode?.(true);
process.stdin.resume();

const terminal = new Terminal({
  altScreen: true,
  fps: 30,
  output: process.stdout,
  input: process.stdin,
});

await terminal.loadDocument(`
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        .container {
          display: flex;
          flex-direction: column;
          padding: 2;
          gap: 1;
        }
        .title {
          font-weight: bold;
          color: #22d3ee;
          border-style: rounded;
          border-color: #22d3ee;
          padding: 1;
        }
        .message {
          color: #a5f3fc;
          padding: 0 1;
        }
        .hint {
          color: #475569;
          font-style: italic;
          padding: 0 1;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="title">📄 loadDocument() Demo</div>
        <div class="message">
          This entire UI was defined as an inline HTML string
          passed to terminal.loadDocument().
        </div>
        <div class="message">
          No separate HTML file needed!
        </div>
        <div class="hint">Press 'q' to exit</div>
      </div>
      <script>
        document.body.addEventListener('keydown', function(e) {
          if (e.key === 'q') terminal.exit();
        });
      </script>
    </body>
  </html>
`);

await terminal.run();
