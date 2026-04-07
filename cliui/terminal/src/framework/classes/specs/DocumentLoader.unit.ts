import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {Window} from '@cliui/dom';
import {StyleEngine} from '../../../css/classes/StyleEngine';
import {DocumentLoader} from '../DocumentLoader';

import type {Document, HTMLLinkElement} from '@cliui/dom';

describe('DocumentLoader', () => {
  let tempDir: string;
  let window: Window;
  let document: Document;
  let styleEngine: StyleEngine;
  let loader: DocumentLoader;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'doc-loader-'));
    window = new Window();
    document = window.document;
    styleEngine = new StyleEngine();
    styleEngine.attach(document);
    loader = new DocumentLoader(window, styleEngine, {exit: () => {}});
  });

  afterEach(() => {
    loader.cleanup();
    rmSync(tempDir, {recursive: true, force: true});
  });

  describe('loadDocument', () => {
    it('populates the document from HTML', async () => {
      await loader.loadDocument(
        `<!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body><div class="app">Hello</div></body>
        </html>`,
        {baseDir: tempDir},
      );

      expect(document.title).toBe('Test');
      expect(document.body.querySelector('.app')!.textContent).toBe('Hello');
    });

    it('does not duplicate structural elements', async () => {
      await loader.loadDocument('<html><head></head><body></body></html>', {baseDir: tempDir});

      const htmlElements = document.documentElement.querySelectorAll('html');
      expect(htmlElements).toHaveLength(0); // no nested html
      const bodyElements = document.documentElement.querySelectorAll('body');
      expect(bodyElements).toHaveLength(1); // exactly one body
    });

    it('applies attributes to structural elements', async () => {
      await loader.loadDocument('<html lang="en"><head></head><body class="dark"></body></html>', {
        baseDir: tempDir,
      });

      expect(document.documentElement.getAttribute('lang')).toBe('en');
      expect(document.body.getAttribute('class')).toBe('dark');
    });
  });

  describe('stylesheet loading', () => {
    it('loads external stylesheets', async () => {
      writeFileSync(join(tempDir, 'styles.css'), '.app { color: red; }');

      await loader.loadDocument(
        `<html>
          <head><link rel="stylesheet" href="./styles.css" /></head>
          <body><div class="app">Hello</div></body>
        </html>`,
        {baseDir: tempDir},
      );

      const link = document.head.querySelector('link') as HTMLLinkElement;
      expect(link.sheet).toBe('.app { color: red; }');
    });

    it('loaded stylesheets affect computed styles', async () => {
      writeFileSync(join(tempDir, 'styles.css'), '.app { color: red; }');

      await loader.loadDocument(
        `<html>
          <head><link rel="stylesheet" href="./styles.css" /></head>
          <body><div class="app">Hello</div></body>
        </html>`,
        {baseDir: tempDir},
      );

      styleEngine.recomputeDirty();
      const div = document.body.querySelector('.app')!;
      expect(styleEngine.getComputedStyle(div).get('color')).toBe('red');
    });

    it('handles inline style elements alongside link elements', async () => {
      writeFileSync(join(tempDir, 'external.css'), '.ext { font-weight: bold; }');

      await loader.loadDocument(
        `<html>
          <head>
            <link rel="stylesheet" href="./external.css" />
            <style>.inline { color: blue; }</style>
          </head>
          <body>
            <div class="ext">Bold</div>
            <div class="inline">Blue</div>
          </body>
        </html>`,
        {baseDir: tempDir},
      );

      styleEngine.recomputeDirty();
      const ext = document.body.querySelector('.ext')!;
      const inline = document.body.querySelector('.inline')!;
      expect(styleEngine.getComputedStyle(ext).get('font-weight')).toBe('bold');
      expect(styleEngine.getComputedStyle(inline).get('color')).toBe('blue');
    });

    it('ignores non-stylesheet link elements', async () => {
      await loader.loadDocument(
        `<html>
          <head><link rel="icon" href="./favicon.ico" /></head>
          <body></body>
        </html>`,
        {baseDir: tempDir},
      );

      const link = document.head.querySelector('link') as HTMLLinkElement;
      expect(link.sheet).toBeNull();
    });
  });

  describe('script execution', () => {
    it('executes inline scripts', async () => {
      await loader.loadDocument(
        `<html>
          <head></head>
          <body>
            <div id="target">original</div>
            <script>
              document.querySelector('#target').textContent = 'modified';
            </script>
          </body>
        </html>`,
        {baseDir: tempDir},
      );

      expect(document.body.querySelector('#target')!.textContent).toBe('modified');
    });

    it('executes external scripts', async () => {
      writeFileSync(
        join(tempDir, 'app.js'),
        'document.querySelector("#target").textContent = "from external";',
      );

      await loader.loadDocument(
        `<html>
          <head></head>
          <body>
            <div id="target">original</div>
            <script src="./app.js"></script>
          </body>
        </html>`,
        {baseDir: tempDir},
      );

      expect(document.body.querySelector('#target')!.textContent).toBe('from external');
    });

    it('body scripts can access preceding elements', async () => {
      await loader.loadDocument(
        `<html>
          <head></head>
          <body>
            <div id="first">first</div>
            <script>
              document.querySelector('#first').textContent = 'found it';
            </script>
          </body>
        </html>`,
        {baseDir: tempDir},
      );

      expect(document.body.querySelector('#first')!.textContent).toBe('found it');
    });

    it('handles script errors gracefully without rejecting', async () => {
      let errorFired = false;
      window.addEventListener('error', () => {
        errorFired = true;
      });

      // Should not throw
      await loader.loadDocument(
        `<html>
          <head></head>
          <body>
            <script>throw new Error("boom")</script>
            <div id="after-error">still here</div>
          </body>
        </html>`,
        {baseDir: tempDir},
      );

      expect(errorFired).toBe(true);
      expect(document.body.querySelector('#after-error')).not.toBeNull();
    });
  });

  describe('lifecycle events', () => {
    it('fires DOMContentLoaded after loading', async () => {
      let dclFired = false;
      document.addEventListener('DOMContentLoaded', () => {
        dclFired = true;
      });

      await loader.loadDocument('<html><head></head><body></body></html>', {baseDir: tempDir});

      expect(dclFired).toBe(true);
    });

    it('fires load event after DOMContentLoaded', async () => {
      const events: string[] = [];

      document.addEventListener('DOMContentLoaded', () => {
        events.push('dcl');
      });
      window.addEventListener('load', () => {
        events.push('load');
      });

      await loader.loadDocument('<html><head></head><body></body></html>', {baseDir: tempDir});

      expect(events).toEqual(['dcl', 'load']);
    });

    it('scripts can register for DOMContentLoaded', async () => {
      let dclFired = false;
      document.addEventListener('DOMContentLoaded', () => {
        dclFired = true;
      });

      await loader.loadDocument(
        `<html>
          <head>
            <script>
              document.addEventListener('DOMContentLoaded', function() {
                var el = document.body.querySelector('#status');
                if (el) el.textContent = 'ready';
              });
            </script>
          </head>
          <body>
            <div id="status">loading</div>
          </body>
        </html>`,
        {baseDir: tempDir},
      );

      // DOMContentLoaded should have fired
      expect(dclFired).toBe(true);
      expect(document.body.querySelector('#status')!.textContent).toBe('ready');
    });
  });

  describe('loadFile', () => {
    it('loads an HTML file from the filesystem', async () => {
      writeFileSync(
        join(tempDir, 'index.html'),
        `<!DOCTYPE html>
        <html>
          <head><title>File Test</title></head>
          <body><div>From file</div></body>
        </html>`,
      );

      await loader.loadFile(join(tempDir, 'index.html'));

      expect(document.title).toBe('File Test');
      expect(document.body.querySelector('div')!.textContent).toBe('From file');
    });

    it('resolves relative paths from the HTML file directory', async () => {
      writeFileSync(join(tempDir, 'styles.css'), '.from-file { color: green; }');
      writeFileSync(
        join(tempDir, 'index.html'),
        `<html>
          <head><link rel="stylesheet" href="./styles.css" /></head>
          <body><div class="from-file">Styled</div></body>
        </html>`,
      );

      await loader.loadFile(join(tempDir, 'index.html'));

      const link = document.head.querySelector('link') as HTMLLinkElement;
      expect(link.sheet).toBe('.from-file { color: green; }');
    });
  });

  describe('complex document', () => {
    it('loads the milestone example', async () => {
      writeFileSync(
        join(tempDir, 'styles.css'),
        `.app {
          display: flex;
          flex-direction: column;
          padding: 1;
          gap: 1;
        }
        .header {
          border-style: rounded;
          border-color: #7c3aed;
          padding: 1;
          font-weight: bold;
          color: #c4b5fd;
        }`,
      );

      writeFileSync(
        join(tempDir, 'app.js'),
        `
          var status = document.querySelector('#status');
          status.textContent = 'Ready';
        `,
      );

      await loader.loadDocument(
        `<!DOCTYPE html>
        <html>
          <head>
            <link rel="stylesheet" href="./styles.css" />
            <style>
              .status {
                color: #93c5fd;
              }
            </style>
          </head>
          <body>
            <div class="app">
              <div class="header">My Terminal App</div>
              <div class="status" id="status">Loading...</div>
            </div>
            <script src="./app.js"></script>
          </body>
        </html>`,
        {baseDir: tempDir},
      );

      // Script executed and modified the DOM
      expect(document.body.querySelector('#status')!.textContent).toBe('Ready');

      // Stylesheet was loaded
      const link = document.head.querySelector('link') as HTMLLinkElement;
      expect(link.sheet).toContain('.app');

      // Style element is present
      const style = document.head.querySelector('style');
      expect(style).not.toBeNull();
    });
  });
});
