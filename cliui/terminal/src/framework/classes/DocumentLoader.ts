import {readFileSync} from 'node:fs';
import {dirname} from 'node:path';

import {parseDocument} from '@cliui/dom';

import {ResourceResolver} from './ResourceResolver';
import {ScriptContext} from './ScriptContext';
import {ScriptExecutor} from './ScriptExecutor';
import {ModuleScriptExecutor} from './ModuleScriptExecutor';
import {StylesheetLoader} from './StylesheetLoader';
import {DocumentLifecycle} from './DocumentLifecycle';

import type {
  Document,
  Element,
  HTMLLinkElement,
  HTMLScriptElement,
  Node as DomNode,
  Window,
} from '@cliui/dom';
import type {StyleEngine} from '../../css/classes/StyleEngine';

/** Options for document loading. */
export interface DocumentLoadOptions {
  /** Base directory for resolving relative paths. Defaults to `process.cwd()`. */
  baseDir?: string;
}

/**
 * Orchestrates loading a full HTML document into a terminal's DOM.
 *
 * Coordinates the parsing, resource loading (stylesheets), script execution
 * (classic and module), and lifecycle events (DOMContentLoaded, load).
 *
 * This is the core implementation behind `Terminal.loadDocument()` and
 * `Terminal.loadFile()`.
 */
export class DocumentLoader {
  private readonly document: Document;
  private readonly styleEngine: StyleEngine;
  private readonly resolver: ResourceResolver;
  private readonly stylesheetLoader: StylesheetLoader;
  private readonly scriptContext: ScriptContext;
  private readonly scriptExecutor: ScriptExecutor;
  private readonly moduleExecutor: ModuleScriptExecutor;
  private readonly lifecycle: DocumentLifecycle;

  constructor(window: Window, styleEngine: StyleEngine, terminal?: unknown) {
    this.document = window.document;
    this.styleEngine = styleEngine;
    this.resolver = new ResourceResolver();
    this.stylesheetLoader = new StylesheetLoader(this.resolver, styleEngine);
    this.scriptContext = new ScriptContext(window, terminal);
    this.scriptExecutor = new ScriptExecutor(this.scriptContext, this.resolver, window);
    this.moduleExecutor = new ModuleScriptExecutor(this.scriptContext, this.resolver, window);
    this.lifecycle = new DocumentLifecycle(this.scriptExecutor, this.moduleExecutor, window);
  }

  /**
   * Loads an HTML string into the document.
   *
   * Parses the HTML, loads stylesheets, executes scripts in the correct
   * order, and fires lifecycle events.
   *
   * @param html - The HTML document string.
   * @param options - Loading options.
   * @returns A promise that resolves after DOMContentLoaded fires.
   */
  async loadDocument(html: string, options?: DocumentLoadOptions): Promise<void> {
    const baseDir = options?.baseDir ?? process.cwd();
    this.resolver.setBaseDir(baseDir);
    this.resolver.setRootDir(baseDir);

    // Parse the HTML into the document skeleton
    parseDocument(html, this.document);

    // Process all elements in order: load stylesheets, execute scripts
    this.processHead();
    this.processBody();

    // Ensure the style engine picks up all new stylesheets
    this.styleEngine.invalidateStylesheets();
    this.styleEngine.markAllDirty();

    // Finish parsing: execute deferred scripts, fire DOMContentLoaded
    await this.lifecycle.finishParsing();

    // Fire load event (all resources are synchronously loaded in terminal)
    this.lifecycle.fireLoadEvent();
  }

  /**
   * Loads an HTML file from the filesystem.
   *
   * Reads the file, then delegates to {@link loadDocument} with `baseDir`
   * set to the file's directory.
   *
   * @param filePath - Path to the HTML file.
   * @returns A promise that resolves after loading completes.
   */
  async loadFile(filePath: string): Promise<void> {
    const html = readFileSync(filePath, 'utf-8');
    const baseDir = dirname(filePath);
    return this.loadDocument(html, {baseDir});
  }

  /**
   * Processes elements in `<head>`: loads stylesheets and processes scripts.
   */
  private processHead(): void {
    const children: DomNode[] = Array.from(this.document.head.childNodes);

    for (const child of children) {
      if (child.nodeType !== 1) continue; // Element nodes only
      this.processElement(child as unknown as Element, true);
    }
  }

  /**
   * Processes elements in `<body>`: loads stylesheets and processes scripts.
   */
  private processBody(): void {
    this.processTree(this.document.body, false);
  }

  /**
   * Recursively processes a DOM tree for script and link elements.
   */
  private processTree(parent: Element, inHead: boolean): void {
    const children: DomNode[] = Array.from(parent.childNodes);

    for (const child of children) {
      if (child.nodeType !== 1) continue;
      const element = child as unknown as Element;
      this.processElement(element, inHead);

      // Don't recurse into script elements
      if (element.localName !== 'script') {
        this.processTree(element, inHead);
      }
    }
  }

  /**
   * Processes a single element: loads stylesheets for `<link>` elements,
   * executes `<script>` elements.
   */
  private processElement(element: Element, inHead: boolean): void {
    if (element.localName === 'link') {
      const link = element as unknown as HTMLLinkElement;

      if (link.rel === 'stylesheet') {
        this.stylesheetLoader.load(link);
      }
    } else if (element.localName === 'script') {
      this.lifecycle.processScript(element as unknown as HTMLScriptElement, inHead);
    }
  }

  /**
   * Returns the resource resolver used by this loader.
   */
  getResolver(): ResourceResolver {
    return this.resolver;
  }

  /**
   * Returns the script execution context.
   */
  getScriptContext(): ScriptContext {
    return this.scriptContext;
  }

  /**
   * Returns the module script executor.
   */
  getModuleExecutor(): ModuleScriptExecutor {
    return this.moduleExecutor;
  }

  /**
   * Cleans up resources (module globals, etc.).
   */
  cleanup(): void {
    this.moduleExecutor.cleanupGlobals();
  }
}
