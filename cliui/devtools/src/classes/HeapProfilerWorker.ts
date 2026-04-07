import {Worker} from 'node:worker_threads';

import type {CDPTransport} from './CDPTransport';

/**
 * Inline worker source that runs a V8 inspector session connected to
 * the main thread.  Heap snapshots and object tracking run here so
 * the main thread's event loop stays alive.
 */
const WORKER_SOURCE = `
const {parentPort} = require('worker_threads');
const inspector = require('node:inspector');
const session = new inspector.Session();
session.connectToMainThread();

session.on('inspectorNotification', (msg) => {
  parentPort.postMessage({t: 'evt', method: msg.method, params: msg.params});
});

parentPort.on('message', (msg) => {
  if (msg.cmd === 'post') {
    session.post(msg.method, msg.params || {}, (err, result) => {
      parentPort.postMessage({t: 'res', id: msg.id, error: err?.message, result});
    });
  } else if (msg.cmd === 'close') {
    session.disconnect();
    process.exit(0);
  }
});

parentPort.postMessage({t: 'ready'});
`;

/**
 * HeapProfiler methods that must run in a worker thread because they
 * freeze V8 while walking the heap — which segfaults when the main
 * thread's event loop is still running.
 */
const WORKER_METHODS = new Set([
  'HeapProfiler.takeHeapSnapshot',
  'HeapProfiler.startTrackingHeapObjects',
  'HeapProfiler.stopTrackingHeapObjects',
]);

/**
 * Runs a V8 inspector session in a worker thread for heap profiling
 * commands that would crash in the main thread.
 *
 * The worker calls `session.connectToMainThread()` so it inspects the
 * same V8 heap as the main process.  Snapshot events
 * (`HeapProfiler.addHeapSnapshotChunk`, `HeapProfiler.reportHeapSnapshotProgress`)
 * are forwarded to DevTools via the CDP transport.
 */
export class HeapProfilerWorker {
  private readonly transport: CDPTransport;
  private worker: Worker | null = null;
  private ready = false;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    {resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void}
  >();

  constructor(transport: CDPTransport) {
    this.transport = transport;
  }

  /**
   * Returns `true` if the given method should be routed to this worker
   * instead of the main-thread V8 session.
   */
  static handles(method: string): boolean {
    return WORKER_METHODS.has(method);
  }

  /**
   * Sends a command to the worker's V8 session.
   *
   * Spawns the worker lazily on first call.
   */
  async post(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.ensureWorker();

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, {resolve, reject});
      this.worker!.postMessage({cmd: 'post', id, method, params: params ?? {}});
    });
  }

  /** Terminates the worker if it's running. */
  close(): void {
    if (this.worker) {
      try {
        this.worker.postMessage({cmd: 'close'});
      } catch {
        // Worker may already be terminated
      }
      this.worker = null;
      this.ready = false;
      for (const {reject} of this.pending.values()) {
        reject(new Error('HeapProfiler worker closed'));
      }
      this.pending.clear();
    }
  }

  /**
   * Spawns the worker and waits for the 'ready' message.
   */
  private ensureWorker(): Promise<void> {
    if (this.ready && this.worker) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker(WORKER_SOURCE, {eval: true});
      } catch (err) {
        reject(err as Error);
        return;
      }

      this.worker.on(
        'message',
        (msg: {
          t: string;
          method?: string;
          params?: Record<string, unknown>;
          id?: number;
          error?: string;
          result?: Record<string, unknown>;
        }) => {
          if (msg.t === 'ready') {
            this.ready = true;
            resolve();
            return;
          }

          if (msg.t === 'evt') {
            // Forward V8 event to DevTools
            this.transport.broadcastEvent({
              method: msg.method!,
              params: msg.params ?? {},
            });
            return;
          }

          if (msg.t === 'res') {
            const p = this.pending.get(msg.id!);
            if (p) {
              this.pending.delete(msg.id!);
              if (msg.error) {
                p.reject(new Error(msg.error));
              } else {
                p.resolve(msg.result ?? {});
              }
            }
          }
        },
      );

      this.worker.on('error', (err) => {
        reject(err);
      });

      this.worker.on('exit', () => {
        this.ready = false;
        this.worker = null;
      });
    });
  }
}
