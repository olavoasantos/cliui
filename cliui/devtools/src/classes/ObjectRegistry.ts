import type {Node as DomNode} from '@cliui/dom';

/**
 * Bidirectional registry mapping JavaScript objects to string IDs
 * for the CDP Runtime domain.
 *
 * RemoteObjects returned by `Runtime.evaluate` and `Runtime.getProperties`
 * reference objects by string ID.  This registry tracks those mappings
 * and supports cleanup via `releaseObject`/`releaseObjectGroup`.
 */
export class ObjectRegistry {
  private nextId = 1;
  private readonly objectToId = new Map<object, string>();
  private readonly idToObject = new Map<string, object>();
  private readonly groupToIds = new Map<string, Set<string>>();

  /**
   * Registers an object and returns its string ID.
   *
   * @param obj   - The JavaScript object to register.
   * @param group - Optional group name for batch release.
   * @returns The string ID assigned to the object.
   */
  register(obj: object, group?: string): string {
    const existing = this.objectToId.get(obj);
    if (existing !== undefined) return existing;

    const id = `obj-${this.nextId++}`;
    this.objectToId.set(obj, id);
    this.idToObject.set(id, obj);

    if (group) {
      let groupSet = this.groupToIds.get(group);
      if (!groupSet) {
        groupSet = new Set();
        this.groupToIds.set(group, groupSet);
      }
      groupSet.add(id);
    }

    return id;
  }

  /**
   * Returns the object for a given ID, or `undefined`.
   */
  getObject(id: string): object | undefined {
    return this.idToObject.get(id);
  }

  /**
   * Returns the ID for a given object, or `undefined`.
   */
  getId(obj: object): string | undefined {
    return this.objectToId.get(obj);
  }

  /**
   * Releases a single object from the registry.
   */
  release(id: string): void {
    const obj = this.idToObject.get(id);
    if (obj !== undefined) {
      this.objectToId.delete(obj);
      this.idToObject.delete(id);
    }
  }

  /**
   * Releases all objects in a group.
   */
  releaseGroup(group: string): void {
    const ids = this.groupToIds.get(group);
    if (!ids) return;
    for (const id of ids) {
      this.release(id);
    }
    this.groupToIds.delete(group);
  }

  /** Returns the total number of registered objects. */
  get size(): number {
    return this.idToObject.size;
  }

  /** Removes all mappings. */
  clear(): void {
    this.objectToId.clear();
    this.idToObject.clear();
    this.groupToIds.clear();
    this.nextId = 1;
  }

  /**
   * Serializes a JavaScript value to a CDP RemoteObject.
   *
   * @param value - The value to serialize.
   * @param group - Optional group for object registration.
   */
  serialize(value: unknown, group?: string): Record<string, unknown> {
    if (value === null) {
      return {type: 'object', subtype: 'null', value: null};
    }
    if (value === undefined) {
      return {type: 'undefined'};
    }

    const t = typeof value;

    if (t === 'string' || t === 'number' || t === 'boolean') {
      return {type: t, value};
    }

    if (t === 'bigint') {
      return {type: 'bigint', description: String(value)};
    }

    if (t === 'symbol') {
      return {type: 'symbol', description: String(value)};
    }

    if (t === 'function') {
      const fn = value as Function;
      const id = this.register(fn, group);
      return {
        type: 'function',
        className: 'Function',
        description: fn.toString().slice(0, 200),
        objectId: id,
      };
    }

    // Object types
    const obj = value as object;
    const id = this.register(obj, group);

    if (value instanceof Error) {
      return {
        type: 'object',
        subtype: 'error',
        className: value.constructor.name,
        description: value.stack ?? value.message,
        objectId: id,
      };
    }

    if (Array.isArray(value)) {
      return {
        type: 'object',
        subtype: 'array',
        className: 'Array',
        description: `Array(${value.length})`,
        objectId: id,
      };
    }

    // Check if it's a DOM node (has nodeType property)
    if ('nodeType' in obj) {
      const node = obj as DomNode;
      return {
        type: 'object',
        subtype: 'node',
        className: node.constructor.name,
        description: node.nodeName ?? 'Node',
        objectId: id,
      };
    }

    return {
      type: 'object',
      className: obj.constructor?.name ?? 'Object',
      description: obj.constructor?.name ?? 'Object',
      objectId: id,
    };
  }
}
