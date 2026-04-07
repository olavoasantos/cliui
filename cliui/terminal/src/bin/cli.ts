#!/usr/bin/env node

import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseCliArgs} from './parseCliArgs.js';

/**
 * CLI entry point for running terminal-dom HTML applications.
 *
 * Usage:
 *   npx @cliui/terminal <file.html> [options]
 */

function printUsage(): void {
  console.log(
    `
Usage: npx @cliui/terminal <file.html> [options]

Options:
  --no-alt-screen  Disable alternate screen mode (useful for debugging)
  --fps <n>        Set the frame rate (default: 60)
  --help           Show this help message

Examples:
  npx @cliui/terminal index.html
  npx @cliui/terminal index.html --no-alt-screen
  npx @cliui/terminal index.html --fps 30
`.trim(),
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let options;

  try {
    options = parseCliArgs(args);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  if (!options.file) {
    console.error('Error: No HTML file specified');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  const filePath = resolve(options.file);

  if (!existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  if (!filePath.endsWith('.html') && !filePath.endsWith('.htm')) {
    console.error(`Warning: File does not have .html extension: ${filePath}`);
  }

  try {
    const {Terminal} = await import('../index.js');

    const terminal = new Terminal({
      altScreen: options.altScreen,
      fps: options.fps,
    });

    await terminal.loadFile(filePath);
    await terminal.run();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

void main();
