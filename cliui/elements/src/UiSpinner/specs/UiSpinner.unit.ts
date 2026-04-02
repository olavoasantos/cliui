import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {UiSpinner} from '../component';

function createSpinner(window = new Window(), attributes: Record<string, string | boolean> = {}) {
  window.customElements.define(UiSpinner.tagName, UiSpinner as unknown as CustomElementConstructor);
  const spinner = window.document.createElement('ui-spinner') as UiSpinner;

  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      if (value) {
        spinner.setAttribute(name, '');
      }
    } else {
      spinner.setAttribute(name, value);
    }
  }

  window.document.body.appendChild(spinner);

  return {window, spinner};
}

describe('UiSpinner', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(
      UiSpinner.tagName,
      UiSpinner as unknown as CustomElementConstructor,
    );

    expect(window.customElements.get('ui-spinner')).toBe(
      UiSpinner as unknown as CustomElementConstructor,
    );
  });

  it('renders the default spinner frame when connected', () => {
    const {spinner} = createSpinner();

    expect(spinner.textContent).toBe('|');
  });

  it('renders the configured label next to the frame', () => {
    const {spinner} = createSpinner(undefined, {label: 'Loading'});

    expect(spinner.textContent).toBe('| Loading');
  });

  it('uses the configured variant frame set', () => {
    const {spinner} = createSpinner(undefined, {variant: 'jump'});

    expect(spinner.textContent).toBe('⢄');
  });

  it('cycles frames when enough terminal-frame time has elapsed', () => {
    const {spinner} = createSpinner(undefined, {variant: 'line'});

    spinner.onTerminalFrame(0);
    spinner.onTerminalFrame(99);
    expect(spinner.textContent).toBe('|');

    spinner.onTerminalFrame(100);
    expect(spinner.textContent).toBe('/');

    spinner.onTerminalFrame(200);
    expect(spinner.textContent).toBe('-');
  });

  it('uses the configured interval override instead of the variant default', () => {
    const {spinner} = createSpinner(undefined, {interval: '250'});

    spinner.onTerminalFrame(0);
    spinner.onTerminalFrame(249);
    expect(spinner.textContent).toBe('|');

    spinner.onTerminalFrame(250);
    expect(spinner.textContent).toBe('/');
  });

  it('does not advance while paused', () => {
    const {spinner} = createSpinner(undefined, {paused: true});

    spinner.onTerminalFrame(0);
    spinner.onTerminalFrame(1_000);

    expect(spinner.textContent).toBe('|');
  });

  it('resets to the first frame when the variant changes', () => {
    const {spinner} = createSpinner(undefined, {variant: 'line'});

    spinner.onTerminalFrame(0);
    spinner.onTerminalFrame(100);
    expect(spinner.textContent).toBe('/');

    spinner.setAttribute('variant', 'pulse');
    expect(spinner.textContent).toBe('█');
  });
});
