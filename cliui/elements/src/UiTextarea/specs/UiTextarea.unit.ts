import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import {EDITABLE} from '@cliui/terminal';
import {UiTextarea} from '../component';

import type {CustomElementConstructor} from '@cliui/dom';
import type {EditableConfiguration} from '@cliui/terminal';

function createTextarea(
  window = new Window(),
  attributes: Record<string, string | boolean> = {},
): {window: Window; textarea: UiTextarea} {
  window.customElements.define(
    UiTextarea.tagName,
    UiTextarea as unknown as CustomElementConstructor,
  );
  const textarea = window.document.createElement('ui-textarea') as UiTextarea;

  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      if (value) {
        textarea.setAttribute(name, '');
      }
    } else {
      textarea.setAttribute(name, value);
    }
  }

  window.document.body.appendChild(textarea);

  return {window, textarea};
}

describe('UiTextarea', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(
      UiTextarea.tagName,
      UiTextarea as unknown as CustomElementConstructor,
    );

    expect(window.customElements.get('ui-textarea')).toBe(
      UiTextarea as unknown as CustomElementConstructor,
    );
  });

  it('carries an [EDITABLE] configuration with multiLine enabled', () => {
    const {textarea} = createTextarea();
    const config = (textarea as unknown as Record<symbol, EditableConfiguration>)[EDITABLE];

    expect(config).toBeDefined();
    expect(config.intrinsicWidth()).toBe(40);
    expect(config.intrinsicHeight()).toBe(4);
    expect(config.wordWrap).toBe(true);
    expect(config.multiLine).toBe(true);
  });

  it('renders empty content padded to full viewport', () => {
    const {textarea} = createTextarea(undefined, {cols: '10', rows: '2'});

    expect(textarea.textContent).toBe(' '.repeat(10) + '\n' + ' '.repeat(10));
  });

  it('renders placeholder text when value is empty', () => {
    const {textarea} = createTextarea(undefined, {placeholder: 'Type here...'});

    expect(textarea.textContent).toContain('Type here...');
  });

  it('renders initial value padded to viewport dimensions', () => {
    const {textarea} = createTextarea(undefined, {value: 'hello\nworld', cols: '10', rows: '4'});

    expect(textarea.textContent).toContain('hello');
    expect(textarea.textContent).toContain('world');
    expect(textarea.textContent!.split('\n')).toHaveLength(4);
  });

  it('applies custom cols to intrinsic width config', () => {
    const {textarea} = createTextarea(undefined, {cols: '15'});
    const config = (textarea as unknown as Record<symbol, EditableConfiguration>)[EDITABLE];

    expect(config.intrinsicWidth()).toBe(15);
  });

  it('applies custom rows to intrinsic height config', () => {
    const {textarea} = createTextarea(undefined, {rows: '8'});
    const config = (textarea as unknown as Record<symbol, EditableConfiguration>)[EDITABLE];

    expect(config.intrinsicHeight()).toBe(8);
  });

  it('falls back to defaults for invalid cols/rows', () => {
    const {textarea} = createTextarea(undefined, {cols: 'abc', rows: '-1'});
    const config = (textarea as unknown as Record<symbol, EditableConfiguration>)[EDITABLE];

    expect(config.intrinsicWidth()).toBe(40);
    expect(config.intrinsicHeight()).toBe(4);
  });

  it('reports placeholder through config', () => {
    const {textarea} = createTextarea(undefined, {placeholder: 'Enter text'});
    const config = (textarea as unknown as Record<symbol, EditableConfiguration>)[EDITABLE];

    expect(config.placeholder?.()).toBe('Enter text');
  });

  it('sets tabindex on connect when not disabled', () => {
    const {textarea} = createTextarea();

    expect(textarea.getAttribute('tabindex')).toBe('0');
  });

  it('does not set tabindex when disabled', () => {
    const {textarea} = createTextarea(undefined, {disabled: true});

    expect(textarea.hasAttribute('tabindex')).toBe(false);
  });

  it('removes tabindex when disabled attribute is added', () => {
    const {textarea} = createTextarea();

    expect(textarea.getAttribute('tabindex')).toBe('0');

    textarea.setAttribute('disabled', '');

    expect(textarea.hasAttribute('tabindex')).toBe(false);
  });

  it('restores tabindex when disabled attribute is removed', () => {
    const {textarea} = createTextarea(undefined, {disabled: true});

    textarea.removeAttribute('disabled');

    expect(textarea.getAttribute('tabindex')).toBe('0');
  });
});
