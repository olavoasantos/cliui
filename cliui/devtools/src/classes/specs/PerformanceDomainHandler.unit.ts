import {describe, it, expect, beforeEach} from 'vitest';
import {Performance, PerformanceObserver} from '@cliui/dom';
import {PerformanceDomainHandler} from '../PerformanceDomainHandler';

import type {CDPEvent, CDPMethodHandler} from '../../types';

function createMockTransport() {
  const handlers = new Map<string, CDPMethodHandler>();
  const events: CDPEvent[] = [];

  return {
    handlers,
    events,
    registerMethod(method: string, handler: CDPMethodHandler) {
      handlers.set(method, handler);
    },
    broadcastEvent(event: CDPEvent) {
      events.push(event);
    },
    async call(method: string, params: Record<string, unknown> = {}) {
      const handler = handlers.get(method);
      if (!handler) throw new Error(`No handler for ${method}`);
      return (await handler(params)) ?? {};
    },
  };
}

describe('PerformanceDomainHandler', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let performance: Performance;
  let handler: PerformanceDomainHandler;

  beforeEach(() => {
    transport = createMockTransport();
    performance = new Performance();
    handler = new PerformanceDomainHandler(
      transport as any,
      performance,
      PerformanceObserver as any,
    );
    handler.register();
  });

  describe('Performance.enable', () => {
    it('returns empty result', async () => {
      const result = await transport.call('Performance.enable');
      expect(result).toEqual({});
    });
  });

  describe('Performance.disable', () => {
    it('returns empty result', async () => {
      await transport.call('Performance.enable');
      const result = await transport.call('Performance.disable');
      expect(result).toEqual({});
    });
  });

  describe('Performance.getMetrics', () => {
    it('returns frame count metric', async () => {
      const result = await transport.call('Performance.getMetrics');
      const metrics = result['metrics'] as Array<{name: string; value: number}>;

      const frameCount = metrics.find((m) => m.name === 'FrameCount');
      expect(frameCount).toBeDefined();
      expect(frameCount!.value).toBe(0);
    });

    it('returns mark entries', async () => {
      performance.mark('test-mark');

      const result = await transport.call('Performance.getMetrics');
      const metrics = result['metrics'] as Array<{name: string; value: number}>;

      const testMark = metrics.find((m) => m.name === 'Mark.test-mark');
      expect(testMark).toBeDefined();
      expect(testMark!.value).toBeGreaterThanOrEqual(0);
    });

    it('returns frame timing data after measures', async () => {
      // Simulate frame measures
      performance.mark('frame-start');
      performance.measure('terminal.frame', 'frame-start');

      const result = await transport.call('Performance.getMetrics');
      const metrics = result['metrics'] as Array<{name: string; value: number}>;

      const frameCount = metrics.find((m) => m.name === 'FrameCount');
      expect(frameCount!.value).toBe(1);

      const avgDuration = metrics.find((m) => m.name === 'AverageFrameDuration');
      expect(avgDuration).toBeDefined();
    });
  });

  describe('Performance.enable entry forwarding', () => {
    it('forwards new entries as Performance.metrics events', async () => {
      await transport.call('Performance.enable');

      // Record a mark — this should trigger the observer
      performance.mark('forward-test');

      // Wait for microtask delivery
      await new Promise((r) => setTimeout(r, 50));

      const metricsEvent = transport.events.find((e) => e.method === 'Performance.metrics');
      expect(metricsEvent).toBeDefined();
    });
  });

  describe('Tracing.start / Tracing.end', () => {
    it('collects entries during the tracing window', async () => {
      await transport.call('Tracing.start');

      performance.mark('trace-mark');
      performance.mark('trace-start');
      performance.measure('trace-measure', 'trace-start');

      // Wait for observer delivery
      await new Promise((r) => setTimeout(r, 50));

      await transport.call('Tracing.end');

      const dataEvent = transport.events.find((e) => e.method === 'Tracing.dataCollected');
      expect(dataEvent).toBeDefined();

      const traceEvents = dataEvent!.params.value as any[];
      expect(traceEvents.length).toBeGreaterThan(0);

      const completeEvent = transport.events.find(
        (e) => e.method === 'Tracing.tracingComplete',
      );
      expect(completeEvent).toBeDefined();
    });

    it('emits tracingComplete even with no entries', async () => {
      await transport.call('Tracing.start');
      await transport.call('Tracing.end');

      const completeEvent = transport.events.find(
        (e) => e.method === 'Tracing.tracingComplete',
      );
      expect(completeEvent).toBeDefined();
    });
  });
});
