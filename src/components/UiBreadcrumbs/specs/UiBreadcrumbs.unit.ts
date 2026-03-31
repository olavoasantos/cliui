import {describe, expect, it} from 'vitest';

import {UiBreadcrumbs} from '../component';
import {UiBreadcrumb} from '../../UiBreadcrumb/component';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiBreadcrumbs.tagName, UiBreadcrumbs);
  window.customElements.define(UiBreadcrumb.tagName, UiBreadcrumb);

  return {window, document};
}

describe('UiBreadcrumbs', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-breadcrumbs')).toBe(UiBreadcrumbs);
  });

  it('inserts separators between segments', () => {
    const {document} = createEnv();
    const crumbs = document.createElement('ui-breadcrumbs');

    for (const text of ['Home', 'Projects', 'terminal-dom']) {
      const seg = document.createElement('ui-breadcrumb');
      seg.textContent = text;
      crumbs.appendChild(seg);
    }

    document.body.appendChild(crumbs);

    /* 3 segments + 2 separators = 5 children */
    expect(crumbs.childNodes.length).toBe(5);
  });

  it('uses the default separator character', () => {
    const {document} = createEnv();
    const crumbs = document.createElement('ui-breadcrumbs') as UiBreadcrumbs;

    for (const text of ['A', 'B']) {
      const seg = document.createElement('ui-breadcrumb');
      seg.textContent = text;
      crumbs.appendChild(seg);
    }

    document.body.appendChild(crumbs);

    const sep = crumbs.childNodes[1] as import('../../../dom').Element;

    expect(sep.textContent).toBe('›');
  });

  it('uses a custom separator', () => {
    const {document} = createEnv();
    const crumbs = document.createElement('ui-breadcrumbs') as UiBreadcrumbs;
    crumbs.setAttribute('separator', '/');

    for (const text of ['A', 'B']) {
      const seg = document.createElement('ui-breadcrumb');
      seg.textContent = text;
      crumbs.appendChild(seg);
    }

    document.body.appendChild(crumbs);

    const sep = crumbs.childNodes[1] as import('../../../dom').Element;

    expect(sep.textContent).toBe('/');
  });
});
