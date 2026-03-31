import {describe, expect, it} from 'vitest';

import {UiLog} from '../component';
import {Window} from '../../../dom/classes/Window';

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

  it('appends lines as child elements', () => {
    const {document} = createEnv();
    const log = document.createElement('ui-log') as UiLog;
    document.body.appendChild(log);

    log.append('Line 1');
    log.append('Line 2');

    expect(log.getLineCount()).toBe(2);
    expect((log.childNodes[0] as import('../../../dom').Element).textContent).toBe('Line 1');
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
    expect((log.childNodes[0] as import('../../../dom').Element).textContent).toBe('B');
  });

  it('clears all content', () => {
    const {document} = createEnv();
    const log = document.createElement('ui-log') as UiLog;
    document.body.appendChild(log);

    log.append('A');
    log.append('B');
    log.clear();

    expect(log.getLineCount()).toBe(0);
  });
});
