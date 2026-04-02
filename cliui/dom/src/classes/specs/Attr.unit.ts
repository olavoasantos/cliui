import {describe, it, expect} from 'vitest';
import {Attr} from '../Attr';
import {Window} from '../Window';
import {NodeType} from '../../constants';

describe('Attr', () => {
  it('has nodeType ATTRIBUTE_NODE', () => {
    const attr = new Attr('id', 'test');
    expect(attr.nodeType).toBe(NodeType.ATTRIBUTE_NODE);
  });

  it('has name and value', () => {
    const attr = new Attr('class', 'container');
    expect(attr.name).toBe('class');
    expect(attr.value).toBe('container');
  });

  it('has nodeName equal to name', () => {
    const attr = new Attr('data-foo', 'bar');
    expect(attr.nodeName).toBe('data-foo');
  });

  it('has nodeValue equal to value', () => {
    const attr = new Attr('id', 'test');
    expect(attr.nodeValue).toBe('test');
  });

  it('sets value through nodeValue', () => {
    const attr = new Attr('id', 'old');
    attr.nodeValue = 'new';
    expect(attr.value).toBe('new');
  });

  it('converts value to string on set', () => {
    const attr = new Attr('id', 'test');
    attr.value = 42 as unknown as string;
    expect(attr.value).toBe('42');
  });

  it('has ownerElement null by default', () => {
    const attr = new Attr('id', 'test');
    expect(attr.ownerElement).toBe(null);
  });

  it('has namespaceURI null by default', () => {
    const attr = new Attr('id', 'test');
    expect(attr.namespaceURI).toBe(null);
  });

  it('supports namespace', () => {
    const attr = new Attr('href', 'test', 'http://www.w3.org/1999/xhtml');
    expect(attr.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
  });

  it('updates a namespaced attribute value through the owning element map', () => {
    const {document} = new Window();
    const el = document.createElement('svg');
    el.setAttributeNS('http://www.w3.org/2000/svg', 'viewBox', '0 0 10 10');

    const attr = el.attributes.getNamedItemNS('http://www.w3.org/2000/svg', 'viewBox');

    expect(attr?.value).toBe('0 0 10 10');
    el.setAttributeNS('http://www.w3.org/2000/svg', 'viewBox', '0 0 20 20');
    expect(el.attributes.getNamedItemNS('http://www.w3.org/2000/svg', 'viewBox')?.value).toBe(
      '0 0 20 20',
    );
  });

  it('specified is always true', () => {
    const attr = new Attr('id', 'test');
    expect(attr.specified).toBe(true);
  });

  it('tracks ownerElement when set via element.setAttribute', () => {
    const {document} = new Window();
    const el = document.createElement('div');
    el.setAttribute('id', 'myId');

    const attr = el.attributes.getNamedItem('id');
    expect(attr).not.toBe(null);
    expect(attr!.ownerElement).toBe(el);
  });
});
