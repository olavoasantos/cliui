import {describe, it, expect} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {StyleEngine} from '../../../css/classes/StyleEngine';
import {LayoutEngine} from '../LayoutEngine';

function createEnv() {
  const window = new Window();
  const document = window.document;
  const styleEngine = new StyleEngine();

  styleEngine.attach(document);

  return {window, document, styleEngine};
}

function addStyle(document: ReturnType<typeof createEnv>['document'], css: string) {
  const styleEl = document.createElement('style');

  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

describe('LayoutEngine', () => {
  describe('single element with no children', () => {
    it('produces a layout box filling available width with zero height', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const engine = new LayoutEngine(styleEngine);

      styleEngine.computeAll();
      const box = engine.layout(body, 80, 24);

      expect(box.element).toBe(body);
      expect(box.x).toBe(0);
      expect(box.y).toBe(0);
      expect(box.width).toBe(80);
      expect(box.height).toBe(0);
      expect(box.contentX).toBe(0);
      expect(box.contentY).toBe(0);
      expect(box.contentWidth).toBe(80);
      expect(box.contentHeight).toBe(0);
      expect(box.children).toEqual([]);
    });
  });

  describe('nested elements with padding, margin, and border', () => {
    it('positions child within parent content area', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const child = document.createElement('div');

      body.appendChild(child);

      addStyle(document, 'body { padding: 2; } div { padding: 1; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);

      expect(box.contentX).toBe(2);
      expect(box.contentY).toBe(2);
      expect(box.contentWidth).toBe(76);
      expect(box.children.length).toBe(1);

      const childBox = box.children[0]!;

      expect(childBox.element).toBe(child);
      // Child is within parent content area
      expect(childBox.contentX).toBe(3);
      expect(childBox.contentY).toBe(3);
    });

    it('handles border-style adding 1 cell per side', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const child = document.createElement('div');

      body.appendChild(child);

      addStyle(document, 'div { border-style: single; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);
      const childBox = box.children[0]!;

      expect(childBox.contentX).toBe(1);
      expect(childBox.contentY).toBe(1);
      expect(childBox.contentWidth).toBe(78);
      expect(childBox.height).toBe(2);
    });

    it('stacks multiple children vertically', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const c1 = document.createElement('div');
      const c2 = document.createElement('div');

      body.appendChild(c1);
      body.appendChild(c2);

      addStyle(document, 'div { height: 3; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);

      expect(box.children.length).toBe(2);
      expect(box.children[0]!.y).toBe(0);
      expect(box.children[1]!.y).toBe(3);
      expect(box.height).toBe(6);
    });

    it('repositions clean cached siblings when an earlier sibling changes height', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const first = document.createElement('div');
      const second = document.createElement('div');

      first.appendChild(document.createTextNode('alpha beta gamma delta'));
      second.appendChild(document.createTextNode('tail'));
      body.appendChild(first);
      body.appendChild(second);

      addStyle(document, 'div { width: 10; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const initial = engine.layout(body, 10, 24);

      expect(initial.children[1]!.y).toBeGreaterThan(0);

      first.firstChild!.nodeValue = 'short';
      const updated = engine.layout(body, 10, 24);

      expect(updated.children[0]!.height).toBeLessThan(initial.children[0]!.height);
      expect(updated.children[1]!.y).toBe(updated.children[0]!.height);
    });

    it('lays out children horizontally when flex-direction is row', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const c1 = document.createElement('div');
      const c2 = document.createElement('div');

      c1.setAttribute('id', 'first');
      c2.setAttribute('id', 'second');
      body.appendChild(c1);
      body.appendChild(c2);

      addStyle(
        document,
        'body { flex-direction: row; } #first { width: 4; height: 2; } #second { width: 6; height: 3; }',
      );
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);

      expect(box.children.length).toBe(2);
      expect(box.children[0]!.x).toBe(0);
      expect(box.children[1]!.x).toBe(4);
      expect(box.children[0]!.y).toBe(0);
      expect(box.children[1]!.y).toBe(0);
      expect(box.height).toBe(3);
    });
  });

  describe('text content wrapping', () => {
    it('measures and wraps text content within available width', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const div = document.createElement('div');

      div.appendChild(document.createTextNode('hello world'));
      body.appendChild(div);

      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);
      const childBox = box.children[0]!;

      // "hello world" fits in 80 columns — single line
      expect(childBox.textLines).toEqual(['hello world']);
      expect(childBox.height).toBe(1);
    });

    it('wraps text to multiple lines when content exceeds width', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const div = document.createElement('div');

      div.appendChild(document.createTextNode('aaa bbb ccc'));
      body.appendChild(div);

      addStyle(document, 'div { width: 7; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);
      const childBox = box.children[0]!;

      // Width 7: "aaa bbb" = 7 fits, "ccc" wraps to next line
      expect(childBox.textLines).toEqual(['aaa bbb', 'ccc']);
      expect(childBox.height).toBe(2);
    });
  });

  describe('percentage width resolution', () => {
    it('resolves percentage width relative to parent content area', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const child = document.createElement('div');

      body.appendChild(child);

      addStyle(document, 'div { width: 50%; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);
      const childBox = box.children[0]!;

      // 50% of 80 = 40
      expect(childBox.width).toBe(40);
      expect(childBox.contentWidth).toBe(40);
    });

    it('resolves percentage width within a padded parent', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const child = document.createElement('div');

      body.appendChild(child);

      addStyle(document, 'body { padding: 5; } div { width: 50%; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);
      const childBox = box.children[0]!;

      // Parent content width = 80 - 10 = 70
      // 50% of 70 = 35
      expect(childBox.width).toBe(35);
      expect(childBox.contentWidth).toBe(35);
    });
  });

  describe('explicit sizing and constraints', () => {
    it('resolves percentage height relative to the parent content area', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const child = document.createElement('div');

      body.appendChild(child);

      addStyle(document, 'body { height: 20; } div { height: 50%; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);
      const childBox = box.children[0]!;

      expect(childBox.height).toBe(10);
      expect(childBox.contentHeight).toBe(10);
    });

    it('applies min and max constraints to resolved dimensions', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const first = document.createElement('div');
      const second = document.createElement('div');

      first.setAttribute('id', 'first');
      second.setAttribute('id', 'second');
      body.appendChild(first);
      body.appendChild(second);

      addStyle(document, '#first { width: 4; min-width: 6; } #second { width: 12; max-width: 8; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);

      expect(box.children[0]!.width).toBe(6);
      expect(box.children[1]!.width).toBe(8);
    });
  });

  describe('incremental re-layout', () => {
    it('re-lays out clean subtrees without retaining stale coordinates', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const c1 = document.createElement('div');
      const c2 = document.createElement('div');

      c1.setAttribute('id', 'first');
      c2.setAttribute('id', 'second');
      body.appendChild(c1);
      body.appendChild(c2);

      addStyle(document, '#first { height: 3; } #second { height: 5; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);

      // Initial full layout
      const box1 = engine.layout(body, 80, 24);
      const firstChild1 = box1.children[0]!;
      const secondChild1 = box1.children[1]!;

      expect(firstChild1.height).toBe(3);
      expect(secondChild1.height).toBe(5);

      // Mark only the second child as layout-dirty via style change
      c2.style.setProperty('height', '7');
      styleEngine.recomputeDirty();

      const box2 = engine.layout(body, 80, 24);

      // First child keeps the same layout shape without stale absolute coordinates
      expect(box2.children[0]).toStrictEqual(firstChild1);
      expect(box2.children[0]).not.toBe(firstChild1);
      // Second child should be re-laid out with new height
      expect(box2.children[1]!.height).toBe(7);
      expect(box2.children[1]).not.toBe(secondChild1);
    });
  });

  describe('display behaviors', () => {
    it('treats display: inline as a wrapped row layout', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const inline = document.createElement('div');
      const first = document.createElement('span');
      const second = document.createElement('span');
      const third = document.createElement('span');

      first.setAttribute('id', 'first');
      second.setAttribute('id', 'second');
      third.setAttribute('id', 'third');
      inline.appendChild(first);
      inline.appendChild(second);
      inline.appendChild(third);
      body.appendChild(inline);

      addStyle(
        document,
        'div { display: inline; width: 9; } #first, #second, #third { width: 4; height: 1; }',
      );
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);
      const inlineBox = box.children[0]!;

      expect(inlineBox.children[0]!.x).toBe(0);
      expect(inlineBox.children[1]!.x).toBe(4);
      expect(inlineBox.children[2]!.x).toBe(0);
      expect(inlineBox.children[2]!.y).toBe(1);
    });

    it('reflows when display toggles from none to inline', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const toggle = document.createElement('div');
      const child = document.createElement('span');

      toggle.appendChild(child);
      body.appendChild(toggle);

      addStyle(document, 'div { width: 4; height: 1; } span { width: 2; height: 1; }');
      toggle.style.display = 'none';
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const hiddenBox = engine.layout(body, 80, 24);

      expect(hiddenBox.children).toEqual([]);

      toggle.style.display = 'inline';
      styleEngine.recomputeDirty();

      const visibleBox = engine.layout(body, 80, 24);

      expect(visibleBox.children.length).toBe(1);
      expect(visibleBox.children[0]!.children.length).toBe(1);
      expect(visibleBox.children[0]!.children[0]!.x).toBe(0);
    });
  });

  it('positions display:inline children side by side in a flex-direction:row parent (BUG-13)', () => {
    const {document, styleEngine} = createEnv();
    const body = document.body;
    const row = document.createElement('div');
    const cell1 = document.createElement('span');
    const cell2 = document.createElement('span');
    const cell3 = document.createElement('span');

    cell1.textContent = 'Name';
    cell2.textContent = 'Role';
    cell3.textContent = 'Status';
    row.appendChild(cell1);
    row.appendChild(cell2);
    row.appendChild(cell3);
    body.appendChild(row);

    addStyle(
      document,
      '.row { display: flex; flex-direction: row; } .cell { display: inline; white-space: nowrap; }',
    );
    row.className = 'row';
    cell1.className = 'cell';
    cell2.className = 'cell';
    cell3.className = 'cell';
    styleEngine.computeAll();

    const engine = new LayoutEngine(styleEngine);
    const layout = engine.layout(body, 60, 20);
    const rowBox = layout.children[0]!;

    // All cells should be on the same row (same y)
    expect(rowBox.children.length).toBe(3);
    expect(rowBox.children[0]!.y).toBe(rowBox.children[1]!.y);
    expect(rowBox.children[1]!.y).toBe(rowBox.children[2]!.y);

    // Each subsequent cell should start after the previous one
    expect(rowBox.children[1]!.x).toBeGreaterThan(rowBox.children[0]!.x);
    expect(rowBox.children[2]!.x).toBeGreaterThan(rowBox.children[1]!.x);
  });

  it('positions display:inline children with explicit widths in a flex row (BUG-13)', () => {
    const {document, styleEngine} = createEnv();
    const body = document.body;
    const row = document.createElement('div');
    const cell1 = document.createElement('span');
    const cell2 = document.createElement('span');
    const cell3 = document.createElement('span');

    cell1.textContent = 'Name';
    cell2.textContent = 'Role';
    cell3.textContent = 'Status';
    row.appendChild(cell1);
    row.appendChild(cell2);
    row.appendChild(cell3);
    body.appendChild(row);

    // Mimic table component: row is flex-row, cells are inline with explicit widths
    addStyle(
      document,
      `.row { display: flex; flex-direction: row; gap: 2; }
       .cell { display: inline; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`,
    );
    row.className = 'row';
    cell1.className = 'cell';
    cell1.style.width = '10';
    cell2.className = 'cell';
    cell2.style.width = '10';
    cell3.className = 'cell';
    cell3.style.width = '10';
    styleEngine.computeAll();

    const engine = new LayoutEngine(styleEngine);
    const layout = engine.layout(body, 60, 20);
    const rowBox = layout.children[0]!;

    expect(rowBox.children.length).toBe(3);
    // All cells must be on the same row
    expect(rowBox.children[0]!.y).toBe(rowBox.children[1]!.y);
    expect(rowBox.children[1]!.y).toBe(rowBox.children[2]!.y);
    // With width 10 + gap 2, cells should be at x=0, x=12, x=24
    expect(rowBox.children[0]!.x).toBe(0);
    expect(rowBox.children[1]!.x).toBe(12);
    expect(rowBox.children[2]!.x).toBe(24);
  });

  describe('display: none', () => {
    it('produces a zero-size box for hidden elements', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const hidden = document.createElement('div');
      const visible = document.createElement('div');

      hidden.setAttribute('class', 'hidden');
      visible.setAttribute('class', 'visible');
      body.appendChild(hidden);
      body.appendChild(visible);

      addStyle(document, '.hidden { display: none; height: 10; } .visible { height: 5; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);

      // The hidden child should not affect layout of visible children
      // Only visible child appears in the children array
      expect(box.children.length).toBe(1);
      expect(box.children[0]!.height).toBe(5);
      expect(box.children[0]!.y).toBe(0);
    });
  });

  describe('full integration: styled DOM tree produces correct positions', () => {
    it('correctly positions a three-level nested tree', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const outer = document.createElement('div');
      const inner = document.createElement('div');
      const leaf = document.createElement('span');

      leaf.appendChild(document.createTextNode('hello'));
      inner.appendChild(leaf);
      outer.appendChild(inner);
      body.appendChild(outer);

      addStyle(document, 'div { padding: 1; } span { padding: 0; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);

      // body: contentX=0, contentY=0 (no style on body by default)
      // outer: x=0, y=0, padding=1 => contentX=1, contentY=1, contentWidth=78
      const outerBox = box.children[0]!;

      expect(outerBox.x).toBe(0);
      expect(outerBox.y).toBe(0);
      expect(outerBox.contentX).toBe(1);
      expect(outerBox.contentY).toBe(1);
      expect(outerBox.contentWidth).toBe(78);

      // inner: within outer content area, padding=1
      // => x=1, y=1 (relative to outer content area, then offset)
      const innerBox = outerBox.children[0]!;

      expect(innerBox.contentX).toBe(2);
      expect(innerBox.contentY).toBe(2);
      expect(innerBox.contentWidth).toBe(76);

      // leaf (span): within inner content area
      const leafBox = innerBox.children[0]!;

      expect(leafBox.contentX).toBe(2);
      expect(leafBox.contentY).toBe(2);
      expect(leafBox.textLines).toEqual(['hello']);
      expect(leafBox.height).toBe(1);
    });

    it('correctly positions elements with margin, padding, and border', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const container = document.createElement('div');
      const item = document.createElement('div');

      item.appendChild(document.createTextNode('text'));
      container.appendChild(item);
      body.appendChild(container);

      addStyle(document, `div { margin: 1; padding: 1; border-style: single; }`);
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);

      const containerBox = box.children[0]!;

      // container: margin=1 each side, border=1 each side, padding=1 each side
      // x=0 (position at parent content start)
      // contentX = 0 + marginLeft(1) + border(1) + padding(1) = 3
      expect(containerBox.x).toBe(0);
      expect(containerBox.contentX).toBe(3);
      expect(containerBox.contentY).toBe(3);

      const itemBox = containerBox.children[0]!;

      // item: placed within container content area at contentX=3
      // item contentX = 3 + margin(1) + border(1) + padding(1) = 6
      expect(itemBox.contentX).toBe(6);
      expect(itemBox.contentY).toBe(6);
      expect(itemBox.textLines).toEqual(['text']);
    });
  });

  describe('absolute positioning', () => {
    it('excludes absolute children from flex flow and positions them from top/left', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const flow = document.createElement('div');
      const absolute = document.createElement('div');

      flow.setAttribute('id', 'flow');
      absolute.setAttribute('id', 'absolute');
      body.appendChild(flow);
      body.appendChild(absolute);

      addStyle(document, '#flow { height: 3; } #absolute { position: absolute; top: 4; left: 7; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);
      const flowBox = box.children[0]!;
      const absoluteBox = box.children[1]!;

      expect(flowBox.y).toBe(0);
      expect(absoluteBox.x).toBe(7);
      expect(absoluteBox.y).toBe(4);
      expect(box.height).toBe(3);
    });

    it('positions absolute descendants relative to the nearest ancestor content area', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const container = document.createElement('div');
      const absolute = document.createElement('div');

      container.appendChild(absolute);
      body.appendChild(container);

      addStyle(document, 'div { padding: 1; } div div { position: absolute; top: 2; left: 3; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);
      const containerBox = box.children[0]!;
      const absoluteBox = containerBox.children[0]!;

      expect(containerBox.contentX).toBe(1);
      expect(containerBox.contentY).toBe(1);
      expect(absoluteBox.x).toBe(4);
      expect(absoluteBox.y).toBe(3);
    });

    it('positions root-level absolute children relative to the root content area', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const absolute = document.createElement('div');

      absolute.appendChild(document.createTextNode('hello'));
      body.appendChild(absolute);

      addStyle(document, 'body { padding: 2; } div { position: absolute; top: 3; left: 4; }');
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);
      const absoluteBox = box.children[0]!;

      expect(absoluteBox.x).toBe(6);
      expect(absoluteBox.y).toBe(5);
      expect(absoluteBox.width).toBe(5);
      expect(box.height).toBe(4);
    });

    it('keeps absolute children in the returned DOM child order', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const first = document.createElement('div');
      const second = document.createElement('div');
      const third = document.createElement('div');

      first.setAttribute('id', 'first');
      second.setAttribute('id', 'second');
      third.setAttribute('id', 'third');
      body.appendChild(first);
      body.appendChild(second);
      body.appendChild(third);

      addStyle(
        document,
        '#second { position: absolute; top: 1; left: 1; } #first, #third { height: 1; }',
      );
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);

      expect(box.children.map((child) => child.element.getAttribute('id'))).toEqual([
        'first',
        'second',
        'third',
      ]);
      expect(box.children[2]!.y).toBe(1);
    });
  });

  describe('overflow scroll', () => {
    it('tracks and clamps vertical scroll offset for scrollable boxes', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const container = document.createElement('div');
      const item = document.createElement('div');

      item.setAttribute('id', 'item');
      (container as typeof container & {scrollTop?: number}).scrollTop = 99;
      container.appendChild(item);
      body.appendChild(container);

      addStyle(
        document,
        'body > div { overflow: scroll; height: 1; } #item { position: absolute; top: 2; height: 1; }',
      );
      styleEngine.computeAll();

      const engine = new LayoutEngine(styleEngine);
      const box = engine.layout(body, 80, 24);
      const containerBox = box.children[0]!;
      const itemBox = containerBox.children[0]!;

      expect(containerBox.scrollHeight).toBe(3);
      expect(containerBox.scrollOffsetY).toBe(2);
      expect((container as typeof container & {scrollTop?: number}).scrollTop).toBe(2);
      expect(itemBox.y).toBe(0);
    });
  });

  describe('vertical overflow', () => {
    it('does not shrink children when content exceeds available height', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const engine = new LayoutEngine(styleEngine);

      /* Create 5 children, each 5 rows tall = 25 rows total, in a 10-row terminal */
      for (let i = 0; i < 5; i++) {
        const child = document.createElement('div');
        child.style.height = '5';
        body.appendChild(child);
      }

      styleEngine.computeAll();
      const box = engine.layout(body, 80, 10);

      /* Each child should keep its explicit 5-row height, not be shrunk */
      for (const child of box.children) {
        expect(child.height).toBe(5);
      }

      /* Root should grow to intrinsic content height, not clamp to 10 */
      expect(box.height).toBeGreaterThanOrEqual(25);
    });

    it('preserves intrinsic height of text-heavy children', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const engine = new LayoutEngine(styleEngine);

      /* Create 3 children with text, in a 5-row terminal */
      for (let i = 0; i < 3; i++) {
        const child = document.createElement('div');
        child.textContent = `Line ${i + 1}`;
        body.appendChild(child);
      }

      styleEngine.computeAll();
      const box = engine.layout(body, 80, 5);

      /* Each text child is at least 1 row tall */
      for (const child of box.children) {
        expect(child.height).toBeGreaterThanOrEqual(1);
      }
    });

    it('clamps root body height to available height for viewport scroll', () => {
      const {document, styleEngine} = createEnv();
      const body = document.body;
      const engine = new LayoutEngine(styleEngine);

      body.style.overflow = 'scroll';

      for (let i = 0; i < 5; i++) {
        const child = document.createElement('div');
        child.style.height = '5';
        body.appendChild(child);
      }

      styleEngine.computeAll();
      const box = engine.layout(body, 80, 10);

      /* With overflow: scroll, the body should be clamped to viewport */
      expect(box.height).toBe(10);
      /* But scrollHeight should reflect the full content */
      expect(box.scrollHeight).toBeGreaterThanOrEqual(25);
      /* Children should not be shrunk */
      for (const child of box.children) {
        expect(child.height).toBe(5);
      }
    });
  });

  describe('stretch re-layout', () => {
    it('reflows nested children when a row-direction child is stretched', () => {
      const {document, styleEngine} = createEnv();
      const layoutEngine = new LayoutEngine(styleEngine);

      addStyle(
        document,
        `
        .row {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          width: 20;
          height: 10;
        }
        .col {
          display: flex;
          flex-direction: column;
          width: 10;
        }
        .inner {
          display: flex;
          flex-grow: 1;
        }
      `,
      );

      const row = document.createElement('div');

      row.className = 'row';

      const col = document.createElement('div');

      col.className = 'col';

      const inner = document.createElement('div');

      inner.className = 'inner';
      col.appendChild(inner);
      row.appendChild(col);
      document.body.appendChild(row);

      styleEngine.computeAll();

      const result = layoutEngine.layout(document.body, 40, 20);
      const rowBox = result.children[0]!;
      const colBox = rowBox.children[0]!;
      const innerBox = colBox.children[0]!;

      // The column child should be stretched to the row's height (10)
      expect(colBox.height).toBe(10);

      // After re-layout, the inner child with flex-grow:1 should fill
      // the stretched column's content height
      expect(innerBox.height).toBe(10);
    });
  });

  describe('two-phase layout: children at resolved flex sizes', () => {
    it('reflows text wrapping when a child is flex-grown wider', () => {
      const {document, styleEngine} = createEnv();
      const layoutEngine = new LayoutEngine(styleEngine);

      addStyle(
        document,
        `
        .row { display: flex; flex-direction: row; width: 30; }
        .grow { flex-grow: 1; }
      `,
      );

      const row = document.createElement('div');

      row.className = 'row';

      const child = document.createElement('div');

      child.className = 'grow';
      child.textContent = 'a b c d e f g h';
      row.appendChild(child);
      document.body.appendChild(row);

      styleEngine.computeAll();

      const result = layoutEngine.layout(document.body, 40, 20);
      const rowBox = result.children[0]!;
      const childBox = rowBox.children[0]!;

      // Child should flex-grow to fill the full 30-cell row.
      // With 30 cells of width, the text fits on one line.
      expect(childBox.width).toBe(30);
      expect(childBox.textLines).toEqual(['a b c d e f g h']);
    });

    it('reflows nested flex containers when parent is flex-grown', () => {
      const {document, styleEngine} = createEnv();
      const layoutEngine = new LayoutEngine(styleEngine);

      addStyle(
        document,
        `
        .row { display: flex; flex-direction: row; width: 20; }
        .grow { flex-grow: 1; display: flex; flex-direction: row; }
        .inner { flex-grow: 1; }
      `,
      );

      const row = document.createElement('div');

      row.className = 'row';

      const outer = document.createElement('div');

      outer.className = 'grow';

      const inner = document.createElement('div');

      inner.className = 'inner';
      outer.appendChild(inner);
      row.appendChild(outer);
      document.body.appendChild(row);

      styleEngine.computeAll();

      const result = layoutEngine.layout(document.body, 40, 20);
      const rowBox = result.children[0]!;
      const outerBox = rowBox.children[0]!;
      const innerBox = outerBox.children[0]!;

      // Outer flex-grows to 20, inner flex-grows to fill outer
      expect(outerBox.width).toBe(20);
      expect(innerBox.width).toBe(20);
    });
  });
});
