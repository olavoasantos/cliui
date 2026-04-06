import {DevToolsBridge} from './classes/DevToolsBridge';
import {CSSParser} from '@cliui/terminal/css';
import {SelectorMatcher} from '@cliui/terminal/css';

import type {DevToolsBridgeOptions} from './types';
import type {TerminalPlugin, TerminalPluginContext} from '@cliui/terminal';

/**
 * Creates a Terminal plugin that starts the DevTools bridge.
 *
 * @example
 * ```ts
 * import { Terminal } from '@cliui/terminal';
 * import { devtools } from '@cliui/devtools';
 *
 * const terminal = new Terminal({
 *   plugins: [devtools({ port: 9222 })],
 * });
 * ```
 */
export function devtools(options: DevToolsBridgeOptions = {}): TerminalPlugin {
  let bridge: DevToolsBridge | null = null;

  return {
    name: 'devtools',

    install(context: TerminalPluginContext) {
      bridge = new DevToolsBridge({
        window: context.window,
        document: context.document,
        styleEngine: context.styleEngine,
        selectorMatcher: new SelectorMatcher(),
        cssParser: new CSSParser(),
        terminalInstance: null,
        layoutLookup: (element) => {
          const box = context.getLayoutBox(element);
          if (!box) return null;
          return {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            contentX: box.contentX,
            contentY: box.contentY,
            contentWidth: box.contentWidth,
            contentHeight: box.contentHeight,
          };
        },
        options,
      });

      bridge.listen().catch((err) => {
        process.stderr.write(`DevTools plugin error: ${(err as Error).message}\n`);
      });
    },
  };
}
