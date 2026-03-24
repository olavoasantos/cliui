import {describe, it, expect} from 'vitest';
import {CustomElementRegistryImplementation} from '../CustomElementRegistry';

describe('CustomElementRegistry', () => {
  it('defines and retrieves a custom element', () => {
    const registry = new CustomElementRegistryImplementation();
    class MyElement {}
    registry.define('my-element', MyElement as unknown as CustomElementConstructor);
    expect(registry.get('my-element')).toBe(MyElement);
  });

  it('returns undefined for unregistered element', () => {
    const registry = new CustomElementRegistryImplementation();
    expect(registry.get('unknown-element')).toBeUndefined();
  });

  it('getName returns the name for a registered constructor', () => {
    const registry = new CustomElementRegistryImplementation();
    class MyElement {}
    registry.define('my-element', MyElement as unknown as CustomElementConstructor);
    expect(registry.getName(MyElement as unknown as CustomElementConstructor)).toBe('my-element');
  });

  it('getName returns null for unregistered constructor', () => {
    const registry = new CustomElementRegistryImplementation();
    class MyElement {}
    expect(registry.getName(MyElement as unknown as CustomElementConstructor)).toBeNull();
  });

  it('whenDefined resolves immediately for registered element', async () => {
    const registry = new CustomElementRegistryImplementation();
    class MyElement {}
    registry.define('my-element', MyElement as unknown as CustomElementConstructor);
    const result = await registry.whenDefined('my-element');
    expect(result).toBe(MyElement);
  });

  it('whenDefined resolves when element is later defined', async () => {
    const registry = new CustomElementRegistryImplementation();
    class MyElement {}
    const promise = registry.whenDefined('my-element');
    registry.define('my-element', MyElement as unknown as CustomElementConstructor);
    const result = await promise;
    expect(result).toBe(MyElement);
  });

  it('whenDefined resolves multiple waiters', async () => {
    const registry = new CustomElementRegistryImplementation();
    class MyElement {}
    const promise1 = registry.whenDefined('my-element');
    const promise2 = registry.whenDefined('my-element');
    registry.define('my-element', MyElement as unknown as CustomElementConstructor);
    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(result1).toBe(MyElement);
    expect(result2).toBe(MyElement);
  });
});
