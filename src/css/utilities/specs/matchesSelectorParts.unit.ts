import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {parseSelector} from '../../../dom/utilities/parseSelector';
import {matchesSelectorParts} from '../matchesSelectorParts';

describe('matchesSelectorParts', () => {
  it('returns true when the element matches the selector parts', () => {
    const window = new Window();
    const element = window.document.createElement('div');
    element.setAttribute('class', 'card');

    expect(matchesSelectorParts(element, parseSelector('div.card'))).toBe(true);
  });

  it('matches descendant and sibling selector chains', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    root.className = 'root';
    const article = window.document.createElement('article');
    article.className = 'card';
    const body = window.document.createElement('section');
    const label = window.document.createElement('span');
    label.className = 'label';
    const lead = window.document.createElement('p');
    lead.className = 'lead';
    const note = window.document.createElement('span');
    note.className = 'note';

    body.append(label, lead, note);
    article.appendChild(body);
    root.appendChild(article);
    window.document.body.appendChild(root);

    expect(matchesSelectorParts(label, parseSelector('.root .card .label'))).toBe(true);
    expect(matchesSelectorParts(note, parseSelector('.lead + .note'))).toBe(true);
    expect(matchesSelectorParts(note, parseSelector('.label ~ .note'))).toBe(true);
  });

  it('returns false for non-matching ancestor or sibling chains', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    root.className = 'root';
    const label = window.document.createElement('span');
    label.className = 'label';
    const note = window.document.createElement('span');
    note.className = 'note';

    root.append(label, note);
    window.document.body.appendChild(root);

    expect(matchesSelectorParts(note, parseSelector('.panel .note'))).toBe(false);
    expect(matchesSelectorParts(note, parseSelector('.label + .missing'))).toBe(false);
  });

  it('returns false when the selector does not match', () => {
    const window = new Window();
    const element = window.document.createElement('div');

    expect(matchesSelectorParts(element, parseSelector('span'))).toBe(false);
  });

  it('returns false for empty selector parts', () => {
    const window = new Window();
    const element = window.document.createElement('div');

    expect(matchesSelectorParts(element, [])).toBe(false);
  });

  it('returns false when selector serialization produces an unsupported selector', () => {
    const window = new Window();
    const element = window.document.createElement('div');

    expect(matchesSelectorParts(element, parseSelector('div:unsupported(state)'))).toBe(false);
  });
});
