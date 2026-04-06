import {describe, it, expect, beforeEach} from 'vitest';
import {Window} from '@cliui/dom';
import {ObjectRegistry} from '../ObjectRegistry';

describe('ObjectRegistry', () => {
  let registry: ObjectRegistry;

  beforeEach(() => {
    registry = new ObjectRegistry();
  });

  it('registers an object and returns a string ID', () => {
    const obj = {test: true};
    const id = registry.register(obj);
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns the same ID for the same object', () => {
    const obj = {test: true};
    const id1 = registry.register(obj);
    const id2 = registry.register(obj);
    expect(id1).toBe(id2);
  });

  it('returns different IDs for different objects', () => {
    const id1 = registry.register({a: 1});
    const id2 = registry.register({b: 2});
    expect(id1).not.toBe(id2);
  });

  it('looks up object by ID', () => {
    const obj = {test: true};
    const id = registry.register(obj);
    expect(registry.getObject(id)).toBe(obj);
  });

  it('looks up ID by object', () => {
    const obj = {test: true};
    const id = registry.register(obj);
    expect(registry.getId(obj)).toBe(id);
  });

  it('releases an object', () => {
    const obj = {test: true};
    const id = registry.register(obj);
    registry.release(id);
    expect(registry.getObject(id)).toBeUndefined();
    expect(registry.size).toBe(0);
  });

  it('releases all objects in a group', () => {
    registry.register({a: 1}, 'group1');
    registry.register({b: 2}, 'group1');
    registry.register({c: 3}, 'group2');

    registry.releaseGroup('group1');
    expect(registry.size).toBe(1);
  });

  it('clears all mappings', () => {
    registry.register({a: 1});
    registry.register({b: 2});
    registry.clear();
    expect(registry.size).toBe(0);
  });

  it('serializes null', () => {
    const result = registry.serialize(null);
    expect(result.type).toBe('object');
    expect(result.subtype).toBe('null');
  });

  it('serializes undefined', () => {
    const result = registry.serialize(undefined);
    expect(result.type).toBe('undefined');
  });

  it('serializes primitives', () => {
    expect(registry.serialize('hello').type).toBe('string');
    expect(registry.serialize(42).type).toBe('number');
    expect(registry.serialize(true).type).toBe('boolean');
  });

  it('serializes functions', () => {
    const result = registry.serialize(() => {});
    expect(result.type).toBe('function');
    expect(result.objectId).toBeDefined();
  });

  it('serializes arrays', () => {
    const result = registry.serialize([1, 2, 3]);
    expect(result.type).toBe('object');
    expect(result.subtype).toBe('array');
    expect(result.description).toBe('Array(3)');
  });

  it('serializes errors', () => {
    const result = registry.serialize(new Error('test'));
    expect(result.type).toBe('object');
    expect(result.subtype).toBe('error');
  });

  it('serializes DOM nodes', () => {
    const window = new Window();
    const div = window.document.createElement('div');
    const result = registry.serialize(div);
    expect(result.type).toBe('object');
    expect(result.subtype).toBe('node');
  });

  it('serializes plain objects', () => {
    const result = registry.serialize({key: 'value'});
    expect(result.type).toBe('object');
    expect(result.objectId).toBeDefined();
  });
});
