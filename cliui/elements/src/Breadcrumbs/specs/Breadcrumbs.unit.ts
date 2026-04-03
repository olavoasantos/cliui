import {describe, expect, it} from 'vitest';

import {Breadcrumbs} from '../component';
import {Breadcrumb} from '../../Breadcrumb/component';
import {Window} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(Breadcrumbs.tagName, Breadcrumbs);
  window.customElements.define(Breadcrumb.tagName, Breadcrumb);

  return {window, document};
}

describe('Breadcrumbs', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('breadcrumbs')).toBe(Breadcrumbs);
  });

  it('renders segments joined with the default separator', () => {
    const {document} = createEnv();
    const crumbs = document.createElement('breadcrumbs') as Breadcrumbs;

    for (const text of ['Home', 'Projects', 'terminal-dom']) {
      const seg = document.createElement('breadcrumb');
      seg.textContent = text;
      crumbs.appendChild(seg);
    }

    document.body.appendChild(crumbs);

    const rendered = crumbs.querySelector('.breadcrumbs-rendered');

    expect(rendered?.textContent).toBe('Home › Projects › terminal-dom');
  });

  it('uses a custom separator', () => {
    const {document} = createEnv();
    const crumbs = document.createElement('breadcrumbs') as Breadcrumbs;
    crumbs.setAttribute('separator', '/');

    for (const text of ['A', 'B']) {
      const seg = document.createElement('breadcrumb');
      seg.textContent = text;
      crumbs.appendChild(seg);
    }

    document.body.appendChild(crumbs);

    const rendered = crumbs.querySelector('.breadcrumbs-rendered');

    expect(rendered?.textContent).toBe('A / B');
  });

  it('renders single segment without separator', () => {
    const {document} = createEnv();
    const crumbs = document.createElement('breadcrumbs') as Breadcrumbs;
    const seg = document.createElement('breadcrumb');
    seg.textContent = 'Dashboard';
    crumbs.appendChild(seg);
    document.body.appendChild(crumbs);

    const rendered = crumbs.querySelector('.breadcrumbs-rendered');

    expect(rendered?.textContent).toBe('Dashboard');
  });
});
