import {describe, expect, it} from 'vitest';

import {UiBreadcrumbs} from '../component';
import {UiBreadcrumb} from '../../UiBreadcrumb/component';
import {Window} from '@cliui/dom';

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

  it('renders segments joined with the default separator', () => {
    const {document} = createEnv();
    const crumbs = document.createElement('ui-breadcrumbs') as UiBreadcrumbs;

    for (const text of ['Home', 'Projects', 'terminal-dom']) {
      const seg = document.createElement('ui-breadcrumb');
      seg.textContent = text;
      crumbs.appendChild(seg);
    }

    document.body.appendChild(crumbs);

    const rendered = crumbs.querySelector('.ui-breadcrumbs-rendered');

    expect(rendered?.textContent).toBe('Home › Projects › terminal-dom');
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

    const rendered = crumbs.querySelector('.ui-breadcrumbs-rendered');

    expect(rendered?.textContent).toBe('A / B');
  });

  it('renders single segment without separator', () => {
    const {document} = createEnv();
    const crumbs = document.createElement('ui-breadcrumbs') as UiBreadcrumbs;
    const seg = document.createElement('ui-breadcrumb');
    seg.textContent = 'Dashboard';
    crumbs.appendChild(seg);
    document.body.appendChild(crumbs);

    const rendered = crumbs.querySelector('.ui-breadcrumbs-rendered');

    expect(rendered?.textContent).toBe('Dashboard');
  });
});
