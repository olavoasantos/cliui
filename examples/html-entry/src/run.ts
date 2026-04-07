/**
 * Runner script for the HTML entry point example.
 *
 * Demonstrates using Terminal.loadFile() to load an HTML document
 * that includes external stylesheets, inline styles, and scripts.
 */

import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Terminal} from '@cliui/terminal';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, 'index.html');

process.stdin.setRawMode?.(true);
process.stdin.resume();

const terminal = new Terminal({
  altScreen: true,
  fps: 30,
  output: process.stdout,
  input: process.stdin,
});

await terminal.loadFile(htmlPath);
await terminal.run();
