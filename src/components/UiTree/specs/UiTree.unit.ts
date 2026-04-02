import {describe, expect, it, vi} from 'vitest';

import {UiTree} from '../component';
import {UiTreeItem} from '../../UiTreeItem/component';
import {KeyboardEvent} from '../../../dom/classes/KeyboardEvent';
import {MouseEvent} from '../../../dom/classes/MouseEvent';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiTree.tagName, UiTree);
  window.customElements.define(UiTreeItem.tagName, UiTreeItem);

  return {window, document};
}

function buildTree(document: any) {
  const tree = document.createElement('ui-tree');

  const src = document.createElement('ui-tree-item');
  src.setAttribute('expandable', '');
  src.setAttribute('value', 'src');
  src.textContent = 'src';

  const indexTs = document.createElement('ui-tree-item');
  indexTs.setAttribute('value', 'index.ts');
  indexTs.textContent = 'index.ts';
  src.appendChild(indexTs);

  const utils = document.createElement('ui-tree-item');
  utils.setAttribute('value', 'utils.ts');
  utils.textContent = 'utils.ts';
  src.appendChild(utils);

  const readme = document.createElement('ui-tree-item');
  readme.setAttribute('value', 'README.md');
  readme.textContent = 'README.md';

  tree.appendChild(src);
  tree.appendChild(readme);

  return {tree: tree as UiTree, src, indexTs, utils, readme};
}

describe('UiTree', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-tree')).toBe(UiTree);
  });

  it('renders only top-level items when all collapsed', () => {
    const {document} = createEnv();
    const {tree} = buildTree(document);
    document.body.appendChild(tree);

    const visible = tree.getVisibleItems();

    expect(visible.length).toBe(2);
    expect(visible[0]!.getValue()).toBe('src');
    expect(visible[1]!.getValue()).toBe('README.md');
  });

  it('shows children when parent is expanded', () => {
    const {document} = createEnv();
    const {tree, src} = buildTree(document);
    document.body.appendChild(tree);

    src.setAttribute('open', '');
    tree.refresh();

    const visible = tree.getVisibleItems();

    expect(visible.length).toBe(4);
    expect(visible[0]!.getValue()).toBe('src');
    expect(visible[1]!.getValue()).toBe('index.ts');
    expect(visible[2]!.getValue()).toBe('utils.ts');
    expect(visible[3]!.getValue()).toBe('README.md');
  });

  it('hides children when parent is collapsed', () => {
    const {document} = createEnv();
    const {tree, src} = buildTree(document);
    src.setAttribute('open', '');
    document.body.appendChild(tree);

    src.removeAttribute('open');
    tree.refresh();

    const visible = tree.getVisibleItems();

    expect(visible.length).toBe(2);
  });

  it('renders full labels without truncation', () => {
    const {document} = createEnv();
    const {tree} = buildTree(document);
    document.body.appendChild(tree);

    /* Check rendered rows contain full text */
    const rows = tree.getRenderedRows();

    expect(rows.length).toBe(2);
    expect(rows[0]!.textContent).toContain('src');
    expect(rows[1]!.textContent).toContain('README.md');
  });

  it('renders indented labels for nested items', () => {
    const {document} = createEnv();
    const {tree, src} = buildTree(document);
    src.setAttribute('open', '');
    document.body.appendChild(tree);

    const rows = tree.getRenderedRows();

    /* Nested items should have leading spaces for indentation */
    expect(rows[1]!.textContent).toContain('index.ts');
    const srcText = rows[0]!.textContent ?? '';
    const childText = rows[1]!.textContent ?? '';

    /* Child should start further right than parent */
    const srcIndent = srcText.length - srcText.trimStart().length;
    const childIndent = childText.length - childText.trimStart().length;

    expect(childIndent).toBeGreaterThan(srcIndent);
  });

  it('shows collapse indicator on expandable items', () => {
    const {document} = createEnv();
    const {tree} = buildTree(document);
    document.body.appendChild(tree);

    const rows = tree.getRenderedRows();
    const srcRow = rows[0]!.textContent ?? '';

    expect(srcRow).toContain('▸');
  });

  it('shows expand indicator on expanded items', () => {
    const {document} = createEnv();
    const {tree, src} = buildTree(document);
    src.setAttribute('open', '');
    document.body.appendChild(tree);

    const rows = tree.getRenderedRows();
    const srcRow = rows[0]!.textContent ?? '';

    expect(srcRow).toContain('▾');
  });

  it('navigates with ArrowDown/ArrowUp', () => {
    const {document} = createEnv();
    const {tree} = buildTree(document);
    document.body.appendChild(tree);

    tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

    const rows = tree.getRenderedRows();
    const highlighted = rows.find((r: any) => r.hasAttribute('highlighted'));

    expect(highlighted).toBeDefined();
    expect(highlighted!.textContent).toContain('README.md');
  });

  it('expands on ArrowRight', () => {
    const {document} = createEnv();
    const {tree} = buildTree(document);
    document.body.appendChild(tree);

    /* Highlight is on src (first item, expandable, collapsed) */
    tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));

    const visible = tree.getVisibleItems();

    expect(visible.length).toBe(4); /* src + 2 children + README */
  });

  it('collapses on ArrowLeft', () => {
    const {document} = createEnv();
    const {tree, src} = buildTree(document);
    src.setAttribute('open', '');
    document.body.appendChild(tree);

    tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));

    const visible = tree.getVisibleItems();

    expect(visible.length).toBe(2);
  });

  it('dispatches select on Enter', () => {
    const {document} = createEnv();
    const {tree} = buildTree(document);
    document.body.appendChild(tree);

    const handler = vi.fn();
    tree.addEventListener('select', handler);

    tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));

    expect(handler).toHaveBeenCalledOnce();
  });

  it('highlights a row on click', () => {
    const {document} = createEnv();
    const {tree} = buildTree(document);
    document.body.appendChild(tree);

    const rows = tree.getRenderedRows();

    /* Click the second row (README.md) */
    rows[1]!.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(rows[1]!.hasAttribute('highlighted')).toBe(true);
    expect(rows[0]!.hasAttribute('highlighted')).toBe(false);
  });

  it('focuses the tree on click so keyboard works', () => {
    const {document} = createEnv();
    const {tree} = buildTree(document);
    document.body.appendChild(tree);

    const rows = tree.getRenderedRows();
    rows[0]!.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    expect(document.activeElement).toBe(tree);
  });

  it('keyboard works after click-to-focus', () => {
    const {document} = createEnv();
    const {tree} = buildTree(document);
    document.body.appendChild(tree);

    /* Click first row to focus */
    const rows = tree.getRenderedRows();
    rows[0]!.dispatchEvent(new MouseEvent('click', {bubbles: true}));

    /* Now ArrowDown should move highlight */
    tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

    const updatedRows = tree.getRenderedRows();
    expect(updatedRows[1]!.hasAttribute('highlighted')).toBe(true);
  });

  it('tab focuses the tree via tabindex', () => {
    const {document} = createEnv();
    const {tree} = buildTree(document);
    document.body.appendChild(tree);

    /* Simulate tab focus */
    document.setActiveElement(tree as unknown as import('../../../dom').Element);

    expect(document.activeElement).toBe(tree);

    /* Keyboard should work after tab focus */
    tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

    const rows = tree.getRenderedRows();
    expect(rows[1]!.hasAttribute('highlighted')).toBe(true);
  });
});
