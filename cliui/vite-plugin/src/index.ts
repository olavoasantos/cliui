import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';

import type {Plugin, ResolvedConfig} from 'vite';
import type {TerminalDomPluginOptions} from './types';

export type {TerminalDomPluginOptions};

/**
 * Minimal interface for the parts of Terminal the plugin needs at runtime.
 * Avoids a compile-time dependency on `@cliui/terminal`.
 */
interface TerminalHandle {
  loadDocument(html: string, options?: {baseDir?: string}): Promise<void>;
  run(): Promise<void>;
  exit(): void;
  clearDocument(): void;
  reloadStyles(): void;
  document: {
    head: {
      querySelectorAll(
        sel: string,
      ): ArrayLike<{sheet: string | null; getAttribute(n: string): string | null}>;
    };
  };
}

/**
 * Vite plugin for terminal-dom applications.
 *
 * Makes `vite dev` run terminal applications from an `index.html` entry
 * point, with HMR support for CSS changes and full reload for script/HTML
 * changes. `vite build` produces a standalone Node.js entry point.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { terminalDom } from '@cliui/vite-plugin';
 *
 * export default {
 *   plugins: [terminalDom()],
 * };
 * ```
 */
export function terminalDom(options?: TerminalDomPluginOptions): Plugin {
  const pluginOptions = {
    fps: options?.fps ?? 30,
    altScreen: options?.altScreen ?? true,
  };

  let config: ResolvedConfig;
  let terminal: TerminalHandle | null = null;

  return {
    name: 'terminal-dom',
    enforce: 'pre' as const,

    /**
     * Silence Vite's default console output.  The "VITE ready" banner,
     * local URL, and "press h" hint are written by Vite's logger and
     * would bleed over the terminal UI.
     */
    config() {
      return {
        logLevel: 'silent' as const,
      };
    },

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    configureServer(devServer) {
      return () => {
        devServer.httpServer?.on('listening', () => {
          void launchTerminal(pluginOptions, config, devServer).then((t) => {
            terminal = t;
          });
        });
      };
    },

    handleHotUpdate(ctx) {
      if (!terminal) return;

      const {file} = ctx;

      if (file.endsWith('.css')) {
        reloadCss(terminal, config);
        return [];
      }

      // HTML / JS / TS changes → full reload
      void fullReload(terminal, config);
      return [];
    },

    generateBundle(_outputOptions, bundle) {
      if (config.command !== 'build') return;

      const htmlEntry = resolve(config.root, 'index.html');
      let htmlContent: string;

      try {
        htmlContent = readFileSync(htmlEntry, 'utf-8');
      } catch {
        return;
      }

      const cssChunks: string[] = [];

      for (const [, chunk] of Object.entries(bundle)) {
        if (
          chunk.type === 'asset' &&
          typeof chunk.source === 'string' &&
          chunk.fileName.endsWith('.css')
        ) {
          cssChunks.push(chunk.source);
        }
      }

      if (cssChunks.length > 0) {
        const inlinedCss = cssChunks.join('\n');
        htmlContent = htmlContent.replace(/<link\s+rel=["']stylesheet["'][^>]*\/?>/gi, '');
        htmlContent = htmlContent.replace('</head>', `<style>${inlinedCss}</style>\n</head>`);
      }

      htmlContent = htmlContent.replace(
        /<script\s+[^>]*src=["'][^"']*["'][^>]*>\s*<\/script>/gi,
        '',
      );

      let entryChunkName = '';

      for (const [name, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.isEntry) {
          entryChunkName = name;
          break;
        }
      }

      const escapedHtml = JSON.stringify(htmlContent);
      const runnerCode = `
import { Terminal } from '@cliui/terminal';

const terminal = new Terminal({
  altScreen: ${pluginOptions.altScreen},
  fps: ${pluginOptions.fps},
});

await terminal.loadDocument(${escapedHtml});
${entryChunkName ? `await import('./${entryChunkName}');` : ''}
await terminal.run();
`.trim();

      this.emitFile({
        type: 'asset',
        fileName: 'terminal-runner.js',
        source: runnerCode,
      });
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Read the raw `index.html` from disk.  We intentionally skip Vite's
 * `transformIndexHtml` because that injects a `<script>` tag for the
 * browser HMR client (`/@vite/client`) which has no meaning in a
 * terminal context and would render as visible text.
 */
function readHtml(config: ResolvedConfig): string | null {
  try {
    return readFileSync(resolve(config.root, 'index.html'), 'utf-8');
  } catch {
    return null;
  }
}

async function launchTerminal(
  options: {fps: number; altScreen: boolean},
  config: ResolvedConfig,
  devServer: {close(): Promise<void>},
): Promise<TerminalHandle | null> {
  try {
    const require = createRequire(resolve(config.root, 'package.json'));
    const mod = require('@cliui/terminal') as Record<string, unknown>;
    const Ctor = mod.Terminal as new (o: Record<string, unknown>) => TerminalHandle;

    const t = new Ctor({
      fps: options.fps,
      altScreen: options.altScreen,
    });

    // Wrap exit() so that closing the terminal also shuts down the
    // Vite dev server and lets the Node process terminate.
    const originalExit = t.exit.bind(t);
    t.exit = () => {
      originalExit();
      void devServer.close().then(() => process.exit(0));
    };

    const html = readHtml(config);

    if (!html) return null;

    await t.loadDocument(html, {baseDir: config.root});
    await t.run();

    return t;
  } catch (error) {
    console.error('[terminal-dom] Failed to start terminal:', error);
    return null;
  }
}

/**
 * Re-reads every `<link rel="stylesheet">` href from disk, updates the
 * element's `.sheet`, then tells the terminal to re-collect styles.
 */
function reloadCss(terminal: TerminalHandle, config: ResolvedConfig): void {
  const links = terminal.document.head.querySelectorAll('link');

  for (let i = 0; i < links.length; i++) {
    const link = links[i]!;

    if (link.getAttribute('rel') !== 'stylesheet') continue;

    const href = link.getAttribute('href');

    if (!href) continue;

    const filePath = resolve(config.root, href.replace(/^\.\//, ''));

    try {
      link.sheet = readFileSync(filePath, 'utf-8');
    } catch {
      /* file may have been deleted */
    }
  }

  terminal.reloadStyles();
}

/**
 * Clears the document tree, re-reads `index.html`, and reloads
 * everything from scratch.
 */
async function fullReload(terminal: TerminalHandle, config: ResolvedConfig): Promise<void> {
  const html = readHtml(config);

  if (!html) return;

  terminal.clearDocument();
  await terminal.loadDocument(html, {baseDir: config.root});
}
