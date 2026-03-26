import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom';
import {UiProgress} from '../component';

function createProgress(window = new Window(), attributes: Record<string, string | boolean> = {}) {
  window.customElements.define(
    UiProgress.tagName,
    UiProgress as unknown as CustomElementConstructor,
  );
  const progress = window.document.createElement('ui-progress') as UiProgress;

  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      if (value) {
        progress.setAttribute(name, '');
      }
    } else {
      progress.setAttribute(name, value);
    }
  }

  window.document.body.appendChild(progress);

  return {window, progress};
}

describe('UiProgress', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(
      UiProgress.tagName,
      UiProgress as unknown as CustomElementConstructor,
    );

    expect(window.customElements.get('ui-progress')).toBe(
      UiProgress as unknown as CustomElementConstructor,
    );
  });

  it('renders an empty bar by default', () => {
    const {progress} = createProgress();

    expect(progress.textContent).toBe('░░░░░░░░░░');
  });

  it('renders a proportional bar from value and max', () => {
    const {progress} = createProgress(undefined, {value: '25', max: '100'});

    expect(progress.textContent).toBe('▓▓▓░░░░░░░');
  });

  it('clamps progress to the valid range', () => {
    const {progress} = createProgress(undefined, {value: '150', max: '100'});

    expect(progress.textContent).toBe('▓▓▓▓▓▓▓▓▓▓');

    progress.setAttribute('value', '-10');
    expect(progress.textContent).toBe('░░░░░░░░░░');
  });

  it('falls back to defaults for invalid numeric attributes', () => {
    const {progress} = createProgress(undefined, {value: 'oops', max: 'nope', width: 'bad'});

    expect(progress.textContent).toBe('░░░░░░░░░░');
  });

  it('supports attribute-based visual customization', () => {
    const {progress} = createProgress(undefined, {
      value: '3',
      max: '4',
      width: '8',
      'fill-char': '#',
      'empty-char': '.',
      label: 'Load',
      'show-value': true,
    });

    expect(progress.textContent).toBe('Load ######.. 75%');
  });

  it('updates immediately when animation is disabled', () => {
    const {progress} = createProgress(undefined, {value: '10', max: '100'});

    progress.setAttribute('value', '60');

    expect(progress.textContent).toBe('▓▓▓▓▓▓░░░░');
  });

  it('animates value changes when animation is enabled', () => {
    const {progress} = createProgress(undefined, {value: '0', max: '100', animated: true});

    progress.setAttribute('value', '100');
    expect(progress.textContent).toBe('░░░░░░░░░░');

    progress.onTerminalFrame(0);
    progress.onTerminalFrame(100);

    expect(progress.textContent).not.toBe('░░░░░░░░░░');
    expect(progress.textContent).not.toBe('▓▓▓▓▓▓▓▓▓▓');

    for (let timestamp = 200; timestamp <= 2_000; timestamp += 100) {
      progress.onTerminalFrame(timestamp);
    }

    expect(progress.textContent).toBe('▓▓▓▓▓▓▓▓▓▓');
  });

  it('renders the animated numeric percentage when enabled', () => {
    const {progress} = createProgress(undefined, {
      value: '0',
      max: '100',
      animated: true,
      'show-value': true,
    });

    progress.setAttribute('value', '100');
    progress.onTerminalFrame(0);
    progress.onTerminalFrame(100);

    expect(progress.textContent).toMatch(/ \d+%$/);
    expect(progress.textContent).not.toBe('░░░░░░░░░░ 0%');
    expect(progress.textContent).not.toBe('▓▓▓▓▓▓▓▓▓▓ 100%');
  });
});
