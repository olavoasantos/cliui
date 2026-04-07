import {describe, it, expect, afterEach} from 'vitest';
import {HeapProfilerWorker} from '../HeapProfilerWorker';

import type {CDPEvent, CDPMethodHandler} from '../../types';

function createMockTransport() {
  const events: CDPEvent[] = [];
  return {
    handlers: new Map<string, CDPMethodHandler>(),
    events,
    registerMethod() {},
    registerDomainProxy() {},
    broadcastEvent(event: CDPEvent) {
      events.push(event);
    },
  };
}

describe('HeapProfilerWorker', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let worker: HeapProfilerWorker;

  afterEach(() => {
    worker?.close();
  });

  it('identifies methods it handles', () => {
    expect(HeapProfilerWorker.handles('HeapProfiler.takeHeapSnapshot')).toBe(true);
    expect(HeapProfilerWorker.handles('HeapProfiler.startTrackingHeapObjects')).toBe(true);
    expect(HeapProfilerWorker.handles('HeapProfiler.stopTrackingHeapObjects')).toBe(true);
    expect(HeapProfilerWorker.handles('HeapProfiler.enable')).toBe(false);
    expect(HeapProfilerWorker.handles('Profiler.start')).toBe(false);
  });

  it('takes a heap snapshot without segfaulting', async () => {
    transport = createMockTransport();
    worker = new HeapProfilerWorker(transport as any);

    const result = await worker.post('HeapProfiler.takeHeapSnapshot', {reportProgress: true});
    expect(result).toBeDefined();

    // Should have received chunk events
    const chunks = transport.events.filter((e) => e.method === 'HeapProfiler.addHeapSnapshotChunk');
    expect(chunks.length).toBeGreaterThan(0);
  }, 15000);

  it('forwards progress events', async () => {
    transport = createMockTransport();
    worker = new HeapProfilerWorker(transport as any);

    await worker.post('HeapProfiler.takeHeapSnapshot', {reportProgress: true});

    const progress = transport.events.filter(
      (e) => e.method === 'HeapProfiler.reportHeapSnapshotProgress',
    );
    expect(progress.length).toBeGreaterThan(0);
  }, 15000);

  it('closes cleanly', () => {
    transport = createMockTransport();
    worker = new HeapProfilerWorker(transport as any);

    // Close before any post — should not throw
    expect(() => worker.close()).not.toThrow();
  });
});
