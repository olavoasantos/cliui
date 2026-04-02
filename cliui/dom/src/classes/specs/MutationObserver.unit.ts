import {describe, expect, it, vi} from 'vitest';

import {MutationObserver} from '../MutationObserver';
import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('MutationObserver', () => {
  it('observes childList additions and removals', async () => {
    const {document} = createEnv();
    const parent = document.createElement('div');
    const child = document.createElement('span');
    const callback = vi.fn();
    const observer = new MutationObserver(callback);

    observer.observe(parent, {childList: true});
    parent.appendChild(child);
    parent.removeChild(child);
    await Promise.resolve();

    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]?.[0]).toEqual([
      {
        type: 'childList',
        target: parent,
        addedNodes: [child],
        removedNodes: [],
        attributeName: null,
        oldValue: null,
      },
      {
        type: 'childList',
        target: parent,
        addedNodes: [],
        removedNodes: [child],
        attributeName: null,
        oldValue: null,
      },
    ]);
  });

  it('observes attribute changes and includes oldValue when requested', async () => {
    const {document} = createEnv();
    const element = document.createElement('div');
    const callback = vi.fn();
    const observer = new MutationObserver(callback);

    observer.observe(element, {attributes: true, attributeOldValue: true});
    element.setAttribute('id', 'first');
    element.setAttribute('id', 'second');
    element.removeAttribute('id');
    await Promise.resolve();

    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]?.[0]).toEqual([
      {
        type: 'attributes',
        target: element,
        addedNodes: [],
        removedNodes: [],
        attributeName: 'id',
        oldValue: null,
      },
      {
        type: 'attributes',
        target: element,
        addedNodes: [],
        removedNodes: [],
        attributeName: 'id',
        oldValue: 'first',
      },
      {
        type: 'attributes',
        target: element,
        addedNodes: [],
        removedNodes: [],
        attributeName: 'id',
        oldValue: 'second',
      },
    ]);
  });

  it('observes characterData changes and includes oldValue when requested', async () => {
    const {document} = createEnv();
    const text = document.createTextNode('hello');
    const callback = vi.fn();
    const observer = new MutationObserver(callback);

    observer.observe(text, {characterData: true, characterDataOldValue: true});
    text.data = 'world';
    await Promise.resolve();

    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]?.[0]).toEqual([
      {
        type: 'characterData',
        target: text,
        addedNodes: [],
        removedNodes: [],
        attributeName: null,
        oldValue: 'hello',
      },
    ]);
  });

  it('observes subtree mutations for descendants', async () => {
    const {document} = createEnv();
    const parent = document.createElement('div');
    const child = document.createElement('span');
    const callback = vi.fn();
    const observer = new MutationObserver(callback);

    parent.appendChild(child);
    observer.observe(parent, {attributes: true, subtree: true});
    child.setAttribute('role', 'button');
    await Promise.resolve();

    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]?.[0][0]).toMatchObject({
      type: 'attributes',
      target: child,
      attributeName: 'role',
    });
  });

  it('batches synchronous mutations into one microtask delivery', async () => {
    const {document} = createEnv();
    const element = document.createElement('div');
    const callback = vi.fn();
    const observer = new MutationObserver(callback);

    observer.observe(element, {attributes: true});
    element.setAttribute('data-a', '1');
    element.setAttribute('data-b', '2');

    expect(callback).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it('supports takeRecords and disconnect', () => {
    const {document} = createEnv();
    const element = document.createElement('div');
    const callback = vi.fn();
    const observer = new MutationObserver(callback);

    observer.observe(element, {attributes: true});
    element.setAttribute('data-test', 'value');

    expect(observer.takeRecords()).toEqual([
      {
        type: 'attributes',
        target: element,
        addedNodes: [],
        removedNodes: [],
        attributeName: 'data-test',
        oldValue: null,
      },
    ]);

    observer.disconnect();
    element.setAttribute('data-test', 'next');
    expect(observer.takeRecords()).toEqual([]);
    expect(callback).not.toHaveBeenCalled();
  });

  it('filters observed attributes when attributeFilter is provided', async () => {
    const {document} = createEnv();
    const element = document.createElement('div');
    const callback = vi.fn();
    const observer = new MutationObserver(callback);

    observer.observe(element, {attributes: true, attributeFilter: ['data-keep']});
    element.setAttribute('data-skip', '1');
    element.setAttribute('data-keep', '2');
    await Promise.resolve();

    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]?.[0]).toHaveLength(1);
    expect(callback.mock.calls[0]?.[0][0]?.attributeName).toBe('data-keep');
  });

  it('throws when observe is called without any enabled mutation types', () => {
    const {document} = createEnv();
    const observer = new MutationObserver(() => {});

    expect(() => observer.observe(document.body, {})).toThrow(TypeError);
  });

  it('does not observe descendant mutations when subtree is disabled', async () => {
    const {document} = createEnv();
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    const callback = vi.fn();
    const observer = new MutationObserver(callback);

    observer.observe(parent, {attributes: true, subtree: false});
    child.setAttribute('data-state', 'ready');
    await Promise.resolve();

    expect(callback).not.toHaveBeenCalled();
  });
});
