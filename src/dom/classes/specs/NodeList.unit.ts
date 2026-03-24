import {describe, it, expect} from 'vitest';
import {NodeList} from '../NodeList';
import {Window} from '../Window';

describe('NodeList', () => {
  it('extends Array', () => {
    const list = new NodeList();
    expect(list).toBeInstanceOf(Array);
  });

  it('supports item() to access by index', () => {
    const {document} = new Window();
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);

    expect(parent.childNodes.item(0)).toBe(child);
    expect(parent.childNodes.item(1)).toBeUndefined();
  });

  it('has correct length', () => {
    const {document} = new Window();
    const parent = document.createElement('div');
    expect(parent.childNodes.length).toBe(0);

    parent.appendChild(document.createElement('span'));
    parent.appendChild(document.createElement('span'));
    expect(parent.childNodes.length).toBe(2);
  });

  it('supports array iteration', () => {
    const {document} = new Window();
    const parent = document.createElement('div');
    const a = document.createElement('a');
    const b = document.createElement('b');
    parent.appendChild(a);
    parent.appendChild(b);

    const collected = [...parent.childNodes];
    expect(collected).toEqual([a, b]);
  });

  it('supports indexOf', () => {
    const {document} = new Window();
    const parent = document.createElement('div');
    const a = document.createElement('a');
    const b = document.createElement('b');
    parent.appendChild(a);
    parent.appendChild(b);

    expect(parent.childNodes.indexOf(a)).toBe(0);
    expect(parent.childNodes.indexOf(b)).toBe(1);
  });
});
