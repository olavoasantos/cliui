import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {StyleEngine} from '../../../css/classes/StyleEngine';
import {LayoutEngine} from '../LayoutEngine';

describe('LayoutEngine integration', () => {
  it('combines resolved styles, flex layout, and text measurement into a complete render tree for nested documents', () => {
    const window = new Window();
    const document = window.document;
    const styleEngine = new StyleEngine();
    styleEngine.attach(document);

    const container = document.createElement('section');
    const card = document.createElement('article');
    const badge = document.createElement('span');
    const note = document.createElement('aside');

    badge.appendChild(document.createTextNode('OK'));
    card.appendChild(document.createTextNode('alpha beta gamma'));
    card.appendChild(badge);
    container.appendChild(card);
    container.appendChild(note);
    document.body.appendChild(container);

    const style = document.createElement('style');
    style.textContent = [
      'section { padding: 1; width: 20; }',
      'article { width: 50%; padding: 1; }',
      'span { display: inline; width: 4; }',
      'aside { display: none; height: 3; }',
    ].join(' ');
    document.head.appendChild(style);

    styleEngine.computeAll();

    const layoutEngine = new LayoutEngine(styleEngine);
    const box = layoutEngine.layout(document.body, 20, 10);
    const sectionBox = box.children[0]!;
    const articleBox = sectionBox.children[0]!;
    const badgeBox = articleBox.children[0]!;

    expect(sectionBox.contentX).toBe(1);
    expect(sectionBox.contentY).toBe(1);
    expect(sectionBox.contentWidth).toBe(18);
    expect(sectionBox.children).toHaveLength(1);
    expect(articleBox.width).toBe(9);
    expect(articleBox.contentWidth).toBe(7);
    expect(articleBox.textLines).toEqual(['alpha', 'beta', 'gamma']);
    expect(badgeBox.textLines).toEqual(['OK']);
    expect(badgeBox.x).toBe(articleBox.contentX);
    // Badge is positioned below the 3 lines of text (BUG-6 fix)
    expect(badgeBox.y).toBe(articleBox.contentY + 3);
  });
});
