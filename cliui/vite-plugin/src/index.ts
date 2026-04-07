import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import type {Plugin, ViteDevServer, ResolvedConfig} from 'vite';
import type {TerminalDomPluginOptions} from './types';

export type {TerminalDomPluginOptions};

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
    fps: options?.fps ?? 60,
    altScreen: options?.altScreen ?? true,
  };

  let config: ResolvedConfig;
  let server: ViteDevServer | null = null;
  let terminalInstance: unknown = null;

  return {
    name: 'terminal-dom',
    enforce: 'pre' as const,

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    configureServer(devServer) {
      server = devServer;

      // Return a post-hook that runs after Vite's internal middleware
      return () => {
        // Start the terminal after the server is ready
        devServer.httpServer?.on('listening', () => {
          void startTerminal(devServer, pluginOptions, config).then((terminal) => {
            terminalInstance = terminal;
          });
        });
      };
    },

    /**
     * Transform CSS files to inject them into the terminal's style engine
     * during development.
     */
    transform(code, id) {
      if (!server) return;

      // For CSS files in dev mode, we handle loading through the terminal's
      // stylesheet loader — no browser-side injection needed
      if (id.endsWith('.css') && config.command === 'serve') {
        return {
          code: `/* terminal-dom: CSS processed by style engine */\nexport default ${JSON.stringify(code)};`,
          map: null,
        };
      }

      return undefined;
    },

    /**
     * Handle HMR updates for CSS files.
     */
    handleHotUpdate(ctx) {
      if (!terminalInstance) return;

      const {file, modules} = ctx;

      if (file.endsWith('.css')) {
        console.log(`[terminal-dom] ${file.split('/').pop()} updated`);
        // Signal the terminal to reload stylesheets
        reloadStylesheets(terminalInstance);
        return []; // Prevent default HMR handling
      }

      if (file.endsWith('.html')) {
        console.log('[terminal-dom] HTML changed, reloading...');
        void reloadDocument(terminalInstance, config);
        return [];
      }

      // Script changes — let Vite handle module invalidation,
      // then trigger a full terminal reload
      if (modules.length > 0) {
        console.log(`[terminal-dom] ${file.split('/').pop()} changed, reloading...`);
        void reloadDocument(terminalInstance, config);
      }

      return undefined;
    },

    /**
     * Generate the build output for production.
     *
     * Transforms the HTML entry point into a standalone Node.js script
     * that creates a Terminal, loads the inlined HTML, and runs.
     */
    generateBundle(_outputOptions, bundle) {
      if (config.command !== 'build') return;

      // Find the HTML entry
      const htmlEntry = resolve(config.root, 'index.html');
      let htmlContent: string;

      try {
        htmlContent = readFileSync(htmlEntry, 'utf-8');
      } catch {
        return;
      }

      // Collect CSS from the bundle
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

      // Inline CSS into the HTML
      if (cssChunks.length > 0) {
        const inlinedCss = cssChunks.join('\n');
        htmlContent = htmlContent.replace(/<link\s+rel=["']stylesheet["'][^>]*\/?>/gi, '');
        htmlContent = htmlContent.replace('</head>', `<style>${inlinedCss}</style>\n</head>`);
      }

      // Remove external script tags (they're bundled)
      htmlContent = htmlContent.replace(
        /<script\s+[^>]*src=["'][^"']*["'][^>]*>\s*<\/script>/gi,
        '',
      );

      // Find the JS entry chunk
      let entryChunkName = '';

      for (const [name, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.isEntry) {
          entryChunkName = name;
          break;
        }
      }

      // Generate the runner script
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

      // Emit the runner as an additional asset
      this.emitFile({
        type: 'asset',
        fileName: 'terminal-runner.js',
        source: runnerCode,
      });
    },
  };
}

/**
 * Starts the terminal in dev mode.
 */
async function startTerminal(
  server: ViteDevServer,
  options: {fps: number; altScreen: boolean},
  config: ResolvedConfig,
): Promise<unknown> {
  try {
    // @cliui/terminal is a peer dependency imported at runtime
    const modulePath = '@cliui/terminal';
    const terminalModule = (await import(modulePath)) as Record<string, unknown>;
    const TerminalClass = terminalModule.Terminal as new (
      opts: Record<string, unknown>,
    ) => Record<string, unknown>;
    const terminal = new TerminalClass({
      fps: options.fps,
      altScreen: options.altScreen,
    });

    const htmlPath = resolve(config.root, 'index.html');
    let html: string;

    try {
      html = readFileSync(htmlPath, 'utf-8');
    } catch {
      console.error('[terminal-dom] index.html not found in project root');
      return null;
    }

    // Let Vite transform the HTML
    html = await server.transformIndexHtml('/', html);

    await (terminal.loadDocument as Function)(html, {baseDir: config.root});
    await (terminal.run as Function)();

    return terminal;
  } catch (error) {
    console.error('[terminal-dom] Failed to start terminal:', error);
    return null;
  }
}

/**
 * Reloads stylesheets in the terminal.
 */
function reloadStylesheets(terminal: unknown): void {
  // The terminal's style engine re-collects stylesheets on next frame
  // when invalidated. Trigger by marking all styles dirty.
  const t = terminal as {styleEngine?: {invalidateStylesheets(): void; markAllDirty(): void}};

  if (t.styleEngine) {
    t.styleEngine.invalidateStylesheets();
    t.styleEngine.markAllDirty();
  }
}

/**
 * Reloads the entire document in the terminal.
 */
async function reloadDocument(terminal: unknown, config: ResolvedConfig): Promise<void> {
  const htmlPath = resolve(config.root, 'index.html');
  let html: string;

  try {
    html = readFileSync(htmlPath, 'utf-8');
  } catch {
    return;
  }

  const t = terminal as {loadDocument?(html: string, options?: {baseDir?: string}): Promise<void>};

  if (t.loadDocument) {
    await t.loadDocument(html, {baseDir: config.root});
  }
}
