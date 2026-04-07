import {readFileSync, statSync} from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import {resolve, isAbsolute} from 'node:path';

import type {Element} from '@cliui/dom';

/** Cached file entry with content and last-modified time. */
interface CacheEntry {
  content: string;
  mtimeMs: number;
}

/**
 * Resolves and reads resource files from the filesystem with caching.
 *
 * Paths are resolved relative to a configurable base directory (typically
 * the directory of the HTML document). Absolute paths are resolved against
 * an optional root directory. File contents are cached with `mtime`
 * checking to detect changes without re-reading unchanged files.
 *
 * Missing files are handled gracefully — an `error` event is dispatched
 * on the requesting element rather than throwing.
 */
export class ResourceResolver {
  /** Base directory for resolving relative paths. */
  private baseDir: string;

  /** Root directory for resolving absolute paths. */
  private rootDir: string;

  /** File content cache keyed by resolved absolute path. */
  private readonly cache = new Map<string, CacheEntry>();

  /**
   * @param baseDir - Base directory for relative path resolution. Defaults to `process.cwd()`.
   * @param rootDir - Root directory for absolute path resolution. Defaults to `baseDir`.
   */
  constructor(baseDir?: string, rootDir?: string) {
    this.baseDir = baseDir ?? process.cwd();
    this.rootDir = rootDir ?? this.baseDir;
  }

  /**
   * Returns the current base directory.
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Updates the base directory for relative path resolution.
   */
  setBaseDir(dir: string): void {
    this.baseDir = dir;
  }

  /**
   * Returns the current root directory.
   */
  getRootDir(): string {
    return this.rootDir;
  }

  /**
   * Updates the root directory for absolute path resolution.
   */
  setRootDir(dir: string): void {
    this.rootDir = dir;
  }

  /**
   * Resolves a path to an absolute filesystem path.
   *
   * - Relative paths (e.g. `./styles.css`, `../shared/base.css`) resolve
   *   against the base directory.
   * - Absolute paths (e.g. `/src/styles.css`) resolve against the root
   *   directory.
   *
   * @param resourcePath - The path to resolve.
   * @returns The resolved absolute path.
   */
  resolve(resourcePath: string): string {
    if (isAbsolute(resourcePath)) {
      return resolve(this.rootDir, resourcePath.slice(1));
    }

    return resolve(this.baseDir, resourcePath);
  }

  /**
   * Reads a file synchronously with cache support.
   *
   * Returns the file content as a UTF-8 string. Uses the cache if the
   * file's `mtime` has not changed since the last read.
   *
   * @param resourcePath - Relative or absolute path to the file.
   * @returns The file content, or `null` if the file cannot be read.
   */
  readSync(resourcePath: string): string | null {
    const resolved = this.resolve(resourcePath);

    try {
      const stats = statSync(resolved);
      const cached = this.cache.get(resolved);

      if (cached && cached.mtimeMs === stats.mtimeMs) {
        return cached.content;
      }

      const content = readFileSync(resolved, 'utf-8');
      this.cache.set(resolved, {content, mtimeMs: stats.mtimeMs});
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Reads a file synchronously and dispatches an error event on the
   * requesting element if the file cannot be read.
   *
   * @param resourcePath - Relative or absolute path to the file.
   * @param element - The element requesting the resource (for error events).
   * @returns The file content, or `null` if the file cannot be read.
   */
  readSyncForElement(resourcePath: string, element: Element): string | null {
    const content = this.readSync(resourcePath);

    if (content === null) {
      const resolved = this.resolve(resourcePath);
      const errorEvent = new element.ownerDocument.defaultView.Event('error');
      Object.defineProperty(errorEvent, 'message', {
        value: `Failed to load resource: ${resolved}`,
      });
      element.dispatchEvent(errorEvent);
    }

    return content;
  }

  /**
   * Reads a file asynchronously with cache support.
   *
   * Returns the file content as a UTF-8 string. Uses the cache if the
   * file's `mtime` has not changed since the last read.
   *
   * @param resourcePath - Relative or absolute path to the file.
   * @returns The file content, or `null` if the file cannot be read.
   */
  async read(resourcePath: string): Promise<string | null> {
    const resolved = this.resolve(resourcePath);

    try {
      const stats = await stat(resolved);
      const cached = this.cache.get(resolved);

      if (cached && cached.mtimeMs === stats.mtimeMs) {
        return cached.content;
      }

      const content = await readFile(resolved, 'utf-8');
      this.cache.set(resolved, {content, mtimeMs: stats.mtimeMs});
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Reads a file asynchronously and dispatches an error event on the
   * requesting element if the file cannot be read.
   *
   * @param resourcePath - Relative or absolute path to the file.
   * @param element - The element requesting the resource (for error events).
   * @returns The file content, or `null` if the file cannot be read.
   */
  async readForElement(resourcePath: string, element: Element): Promise<string | null> {
    const content = await this.read(resourcePath);

    if (content === null) {
      const resolved = this.resolve(resourcePath);
      const errorEvent = new element.ownerDocument.defaultView.Event('error');
      Object.defineProperty(errorEvent, 'message', {
        value: `Failed to load resource: ${resolved}`,
      });
      element.dispatchEvent(errorEvent);
    }

    return content;
  }

  /**
   * Invalidates the cache entry for a specific path.
   *
   * @param resourcePath - The path to invalidate.
   */
  invalidate(resourcePath: string): void {
    const resolved = this.resolve(resourcePath);
    this.cache.delete(resolved);
  }

  /**
   * Clears the entire file cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Returns the number of entries in the cache.
   */
  get cacheSize(): number {
    return this.cache.size;
  }
}
