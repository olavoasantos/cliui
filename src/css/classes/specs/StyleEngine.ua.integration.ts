import {describe, expect, it} from 'vitest';

import {StyleEngine} from '../StyleEngine';
import {Window} from '../../../dom/classes/Window';

describe('StyleEngine UA stylesheet integration', () => {
  it('semantic elements render with correct styles in a real DOM tree', () => {
    const window = new Window();
    const document = window.document;
    const engine = new StyleEngine();
    engine.attach(document);

    const article = document.createElement('div');
    const heading = document.createElement('h1');
    heading.textContent = 'Title';
    const paragraph = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = 'important';
    const em = document.createElement('em');
    em.textContent = ' emphasis';
    paragraph.appendChild(strong);
    paragraph.appendChild(em);
    article.appendChild(heading);
    article.appendChild(paragraph);
    document.body.appendChild(article);

    engine.computeAll();

    // h1 is bold block
    const h1Style = engine.getComputedStyle(heading);
    expect(h1Style.get('display')).toBe('block');
    expect(h1Style.get('font-weight')).toBe('bold');

    // p is block
    expect(engine.getComputedStyle(paragraph).get('display')).toBe('block');

    // strong is inline bold
    const strongStyle = engine.getComputedStyle(strong);
    expect(strongStyle.get('display')).toBe('inline');
    expect(strongStyle.get('font-weight')).toBe('bold');

    // em is inline italic
    const emStyle = engine.getComputedStyle(em);
    expect(emStyle.get('display')).toBe('inline');
    expect(emStyle.get('font-style')).toBe('italic');
  });

  it('user stylesheet fully overrides UA defaults at equal specificity', () => {
    const window = new Window();
    const document = window.document;
    const engine = new StyleEngine();
    engine.attach(document);

    const userStyle = document.createElement('style');
    userStyle.textContent = `
      h1 { font-weight: normal; display: inline; }
      a { text-decoration: none; color: green; }
    `;
    document.head.appendChild(userStyle);

    const h1 = document.createElement('h1');
    document.body.appendChild(h1);
    const a = document.createElement('a');
    document.body.appendChild(a);

    engine.computeAll();

    // User stylesheet wins because it comes after UA
    expect(engine.getComputedStyle(h1).get('font-weight')).toBe('normal');
    expect(engine.getComputedStyle(h1).get('display')).toBe('inline');
    expect(engine.getComputedStyle(a).get('text-decoration')).toBe('none');
    expect(engine.getComputedStyle(a).get('color')).toBe('green');
  });

  it('nested list elements receive inherited and own UA styles', () => {
    const window = new Window();
    const document = window.document;
    const engine = new StyleEngine();
    engine.attach(document);

    const ul = document.createElement('ul');
    const li1 = document.createElement('li');
    li1.textContent = 'Item 1';
    const li2 = document.createElement('li');
    li2.textContent = 'Item 2';
    ul.appendChild(li1);
    ul.appendChild(li2);
    document.body.appendChild(ul);

    engine.computeAll();

    expect(engine.getComputedStyle(ul).get('display')).toBe('block');
    expect(engine.getComputedStyle(ul).get('padding-left')).toBe('2');
    expect(engine.getComputedStyle(li1).get('display')).toBe('block');
  });

  it('mixed inline elements inherit text styles from block parent', () => {
    const window = new Window();
    const document = window.document;
    const engine = new StyleEngine();
    engine.attach(document);

    const p = document.createElement('p');
    p.style.color = 'red';
    const link = document.createElement('a');
    link.textContent = 'click here';
    p.appendChild(link);
    document.body.appendChild(p);

    engine.computeAll();

    // a gets its own UA color, overriding inherited red
    const linkStyle = engine.getComputedStyle(link);
    expect(linkStyle.get('color')).toBe('#5f87ff');
    expect(linkStyle.get('text-decoration')).toBe('underline');
  });

  it('hr renders as a bordered block with height 1', () => {
    const window = new Window();
    const document = window.document;
    const engine = new StyleEngine();
    engine.attach(document);

    const hr = document.createElement('hr');
    document.body.appendChild(hr);

    engine.computeAll();

    const hrStyle = engine.getComputedStyle(hr);
    expect(hrStyle.get('display')).toBe('block');
    expect(hrStyle.get('height')).toBe('1');
    expect(hrStyle.get('border-style')).toBe('single');
  });
});
