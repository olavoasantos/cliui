import {describe, expect, it} from 'vitest';

import {UiLog} from '../component';
import {Window} from '../../../dom/classes/Window';

import type {Element} from '../../../dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiLog.tagName, UiLog);

  return {window, document};
}

describe('UiLog', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-log')).toBe(UiLog);
  });

  it('appends lines and tracks count', () => {
    const {document} = createEnv();
    const log = document.createElement('ui-log') as UiLog;
    document.body.appendChild(log);

    log.append('Line 1');
    log.append('Line 2');

    expect(log.getLineCount()).toBe(2);
  });

  it('renders only the last N lines when height is set', () => {
    const {document} = createEnv();
    const log = document.createElement('ui-log') as UiLog;
    log.setAttribute('height', '3');
    document.body.appendChild(log);

    for (let i = 1; i <= 10; i++) {
      log.append(`Line ${i}`);
    }

    expect(log.getLineCount()).toBe(10);

    /* Only last 3 should be rendered as child nodes */
    expect(log.childNodes.length).toBe(3);
    expect((log.childNodes[0] as Element).textContent).toBe('Line 8');
    expect((log.childNodes[2] as Element).textContent).toBe('Line 10');
  });

  it('trims old lines when max-lines is exceeded', () => {
    const {document} = createEnv();
    const log = document.createElement('ui-log') as UiLog;
    log.setAttribute('max-lines', '3');
    document.body.appendChild(log);

    log.append('A');
    log.append('B');
    log.append('C');
    log.append('D');

    expect(log.getLineCount()).toBe(3);
    expect((log.childNodes[0] as Element).textContent).toBe('B');
  });

  it('clears all content', () => {
    const {document} = createEnv();
    const log = document.createElement('ui-log') as UiLog;
    document.body.appendChild(log);

    log.append('A');
    log.append('B');
    log.clear();

    expect(log.getLineCount()).toBe(0);
    expect(log.childNodes.length).toBe(0);
  });

  it('shows all lines when no height is set', () => {
    const {document} = createEnv();
    const log = document.createElement('ui-log') as UiLog;
    document.body.appendChild(log);

    for (let i = 1; i <= 20; i++) {
      log.append(`Line ${i}`);
    }

    expect(log.getLineCount()).toBe(20);
    expect(log.childNodes.length).toBe(20);
  });
});
