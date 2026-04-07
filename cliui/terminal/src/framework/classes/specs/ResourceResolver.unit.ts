import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync, utimesSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {Window} from '@cliui/dom';
import {ResourceResolver} from '../ResourceResolver';

import type {Element} from '@cliui/dom';

describe('ResourceResolver', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'resource-resolver-'));
    writeFileSync(join(tempDir, 'styles.css'), '.app { color: red; }');
    writeFileSync(join(tempDir, 'app.js'), 'console.log("hello")');
    mkdirSync(join(tempDir, 'sub'));
    writeFileSync(join(tempDir, 'sub', 'nested.css'), '.nested { color: blue; }');
  });

  afterEach(() => {
    rmSync(tempDir, {recursive: true, force: true});
  });

  describe('resolve', () => {
    it('resolves relative paths against base directory', () => {
      const resolver = new ResourceResolver(tempDir);
      expect(resolver.resolve('./styles.css')).toBe(join(tempDir, 'styles.css'));
    });

    it('resolves relative paths without dot prefix', () => {
      const resolver = new ResourceResolver(tempDir);
      expect(resolver.resolve('styles.css')).toBe(join(tempDir, 'styles.css'));
    });

    it('resolves relative paths with parent traversal', () => {
      const subDir = join(tempDir, 'sub');
      const resolver = new ResourceResolver(subDir);
      expect(resolver.resolve('../styles.css')).toBe(join(tempDir, 'styles.css'));
    });

    it('resolves absolute paths against root directory', () => {
      const resolver = new ResourceResolver(tempDir, tempDir);
      expect(resolver.resolve('/styles.css')).toBe(join(tempDir, 'styles.css'));
    });

    it('resolves absolute paths against a different root', () => {
      const rootDir = join(tempDir, 'sub');
      const resolver = new ResourceResolver(tempDir, rootDir);
      expect(resolver.resolve('/nested.css')).toBe(join(rootDir, 'nested.css'));
    });
  });

  describe('readSync', () => {
    it('reads file contents', () => {
      const resolver = new ResourceResolver(tempDir);
      expect(resolver.readSync('./styles.css')).toBe('.app { color: red; }');
    });

    it('returns null for missing files', () => {
      const resolver = new ResourceResolver(tempDir);
      expect(resolver.readSync('./nonexistent.css')).toBeNull();
    });

    it('reads nested files', () => {
      const resolver = new ResourceResolver(tempDir);
      expect(resolver.readSync('./sub/nested.css')).toBe('.nested { color: blue; }');
    });
  });

  describe('read (async)', () => {
    it('reads file contents', async () => {
      const resolver = new ResourceResolver(tempDir);
      expect(await resolver.read('./styles.css')).toBe('.app { color: red; }');
    });

    it('returns null for missing files', async () => {
      const resolver = new ResourceResolver(tempDir);
      expect(await resolver.read('./nonexistent.css')).toBeNull();
    });
  });

  describe('cache', () => {
    it('caches file contents on first read', () => {
      const resolver = new ResourceResolver(tempDir);
      resolver.readSync('./styles.css');
      expect(resolver.cacheSize).toBe(1);
    });

    it('returns cached content on subsequent reads', () => {
      const resolver = new ResourceResolver(tempDir);
      const first = resolver.readSync('./styles.css');
      const second = resolver.readSync('./styles.css');
      expect(first).toBe(second);
    });

    it('detects mtime changes and re-reads', () => {
      const resolver = new ResourceResolver(tempDir);
      resolver.readSync('./styles.css');

      // Modify file content and change mtime
      writeFileSync(join(tempDir, 'styles.css'), '.app { color: blue; }');
      const futureTime = new Date(Date.now() + 2000);
      utimesSync(join(tempDir, 'styles.css'), futureTime, futureTime);

      expect(resolver.readSync('./styles.css')).toBe('.app { color: blue; }');
    });

    it('invalidates a specific path', () => {
      const resolver = new ResourceResolver(tempDir);
      resolver.readSync('./styles.css');
      expect(resolver.cacheSize).toBe(1);

      resolver.invalidate('./styles.css');
      expect(resolver.cacheSize).toBe(0);
    });

    it('clears all cache entries', () => {
      const resolver = new ResourceResolver(tempDir);
      resolver.readSync('./styles.css');
      resolver.readSync('./app.js');
      expect(resolver.cacheSize).toBe(2);

      resolver.clearCache();
      expect(resolver.cacheSize).toBe(0);
    });

    it('caches async reads', async () => {
      const resolver = new ResourceResolver(tempDir);
      await resolver.read('./styles.css');
      expect(resolver.cacheSize).toBe(1);
    });
  });

  describe('readSyncForElement', () => {
    it('returns file content for existing files', () => {
      const window = new Window();
      const element = window.document.createElement('link') as Element;
      const resolver = new ResourceResolver(tempDir);

      expect(resolver.readSyncForElement('./styles.css', element)).toBe('.app { color: red; }');
    });

    it('dispatches error event for missing files', () => {
      const window = new Window();
      const element = window.document.createElement('link') as Element;
      const resolver = new ResourceResolver(tempDir);

      let errorFired = false;
      element.addEventListener('error', () => {
        errorFired = true;
      });

      const result = resolver.readSyncForElement('./missing.css', element);
      expect(result).toBeNull();
      expect(errorFired).toBe(true);
    });
  });

  describe('readForElement (async)', () => {
    it('returns file content for existing files', async () => {
      const window = new Window();
      const element = window.document.createElement('link') as Element;
      const resolver = new ResourceResolver(tempDir);

      expect(await resolver.readForElement('./styles.css', element)).toBe('.app { color: red; }');
    });

    it('dispatches error event for missing files', async () => {
      const window = new Window();
      const element = window.document.createElement('link') as Element;
      const resolver = new ResourceResolver(tempDir);

      let errorFired = false;
      element.addEventListener('error', () => {
        errorFired = true;
      });

      const result = await resolver.readForElement('./missing.css', element);
      expect(result).toBeNull();
      expect(errorFired).toBe(true);
    });
  });

  describe('baseDir and rootDir', () => {
    it('defaults baseDir to process.cwd()', () => {
      const resolver = new ResourceResolver();
      expect(resolver.getBaseDir()).toBe(process.cwd());
    });

    it('defaults rootDir to baseDir', () => {
      const resolver = new ResourceResolver(tempDir);
      expect(resolver.getRootDir()).toBe(tempDir);
    });

    it('allows updating baseDir', () => {
      const resolver = new ResourceResolver(tempDir);
      const newDir = join(tempDir, 'sub');
      resolver.setBaseDir(newDir);
      expect(resolver.getBaseDir()).toBe(newDir);
    });

    it('allows updating rootDir', () => {
      const resolver = new ResourceResolver(tempDir);
      const newDir = join(tempDir, 'sub');
      resolver.setRootDir(newDir);
      expect(resolver.getRootDir()).toBe(newDir);
    });
  });
});
