import {describe, expect, it} from 'vitest';

import {Event, KeyboardEvent, MouseEvent, Window} from '../../../dom';
import {UiButton} from '../component';

import type {CustomElementConstructor} from '../../../dom/types';

function createButton(
  window = new Window(),
  attributes: Record<string, string | boolean> = {},
): {window: Window; button: UiButton} {
  window.customElements.define(UiButton.tagName, UiButton as unknown as CustomElementConstructor);
  const button = window.document.createElement('ui-button') as UiButton;

  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      if (value) {
        button.setAttribute(name, '');
      }
    } else {
      button.setAttribute(name, value);
    }
  }

  window.document.body.appendChild(button);

  return {window, button};
}

function keyDown(button: UiButton, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
  });

  button.dispatchEvent(event);

  return event;
}

function keyUp(button: UiButton, key: string): void {
  button.dispatchEvent(
    new KeyboardEvent('keyup', {
      bubbles: true,
      cancelable: true,
      key,
    }),
  );
}

describe('UiButton', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(UiButton.tagName, UiButton as unknown as CustomElementConstructor);

    expect(window.customElements.get('ui-button')).toBe(
      UiButton as unknown as CustomElementConstructor,
    );
  });

  it('sets tabindex on connect for keyboard accessibility', () => {
    const {button} = createButton();

    expect(button.getAttribute('tabindex')).toBe('0');
  });

  it('preserves a user-provided tabindex', () => {
    const {button} = createButton(undefined, {tabindex: '3'});

    expect(button.getAttribute('tabindex')).toBe('3');
  });

  it('does not set tabindex when disabled', () => {
    const {button} = createButton(undefined, {disabled: true});

    expect(button.getAttribute('tabindex')).toBeNull();
  });

  it('removes tabindex when disabled is set after connect', () => {
    const {button} = createButton();

    expect(button.getAttribute('tabindex')).toBe('0');

    button.setAttribute('disabled', '');

    expect(button.getAttribute('tabindex')).toBeNull();
  });

  it('restores tabindex when disabled is removed', () => {
    const {button} = createButton(undefined, {disabled: true});

    expect(button.getAttribute('tabindex')).toBeNull();

    button.removeAttribute('disabled');

    expect(button.getAttribute('tabindex')).toBe('0');
  });

  describe('focus tracking', () => {
    it('sets focused attribute on focus', () => {
      const {button} = createButton();

      button.dispatchEvent(new Event('focus'));

      expect(button.hasAttribute('focused')).toBe(true);
    });

    it('removes focused attribute on blur', () => {
      const {button} = createButton();

      button.dispatchEvent(new Event('focus'));

      expect(button.hasAttribute('focused')).toBe(true);

      button.dispatchEvent(new Event('blur'));

      expect(button.hasAttribute('focused')).toBe(false);
    });

    it('clears pressed state on blur', () => {
      const {button} = createButton();

      keyDown(button, ' ');

      expect(button.hasAttribute('pressed')).toBe(true);

      button.dispatchEvent(new Event('blur'));

      expect(button.hasAttribute('pressed')).toBe(false);
    });

    it('removes focused attribute on disconnect', () => {
      const {button} = createButton();

      button.dispatchEvent(new Event('focus'));

      expect(button.hasAttribute('focused')).toBe(true);

      button.parentNode?.removeChild(button);

      expect(button.hasAttribute('focused')).toBe(false);
    });
  });

  describe('Enter activation', () => {
    it('dispatches click on Enter keydown', () => {
      const {button} = createButton();
      const clicks: Event[] = [];

      button.addEventListener('click', ((event: Event) => {
        clicks.push(event);
      }) as EventListener);

      keyDown(button, 'Enter');

      expect(clicks).toHaveLength(1);
    });

    it('sets pressed attribute as a flash on Enter', () => {
      const {button} = createButton();

      keyDown(button, 'Enter');

      expect(button.hasAttribute('pressed')).toBe(true);
    });

    it('clears pressed flash after enough frame ticks', () => {
      const {button} = createButton();

      keyDown(button, 'Enter');

      expect(button.hasAttribute('pressed')).toBe(true);

      button.onTerminalFrame(0);
      button.onTerminalFrame(33);
      button.onTerminalFrame(66);

      expect(button.hasAttribute('pressed')).toBe(false);
    });

    it('does not dispatch click on Enter when disabled', () => {
      const {button} = createButton(undefined, {disabled: true});
      const clicks: Event[] = [];

      button.addEventListener('click', ((event: Event) => {
        clicks.push(event);
      }) as EventListener);

      keyDown(button, 'Enter');

      expect(clicks).toHaveLength(0);
    });
  });

  describe('Space activation', () => {
    it('sets pressed attribute on Space keydown', () => {
      const {button} = createButton();

      keyDown(button, ' ');

      expect(button.hasAttribute('pressed')).toBe(true);
    });

    it('prevents default on Space keydown', () => {
      const {button} = createButton();
      const event = keyDown(button, ' ');

      expect(event.defaultPrevented).toBe(true);
    });

    it('dispatches click on Space keyup', () => {
      const {button} = createButton();
      const clicks: Event[] = [];

      button.addEventListener('click', ((event: Event) => {
        clicks.push(event);
      }) as EventListener);

      keyDown(button, ' ');

      expect(clicks).toHaveLength(0);

      keyUp(button, ' ');

      expect(clicks).toHaveLength(1);
    });

    it('removes pressed attribute on Space keyup', () => {
      const {button} = createButton();

      keyDown(button, ' ');

      expect(button.hasAttribute('pressed')).toBe(true);

      keyUp(button, ' ');

      expect(button.hasAttribute('pressed')).toBe(false);
    });

    it('does not set pressed when disabled', () => {
      const {button} = createButton(undefined, {disabled: true});

      keyDown(button, ' ');

      expect(button.hasAttribute('pressed')).toBe(false);
    });

    it('does not dispatch click on Space keyup when disabled', () => {
      const {button} = createButton(undefined, {disabled: true});
      const clicks: Event[] = [];

      button.addEventListener('click', ((event: Event) => {
        clicks.push(event);
      }) as EventListener);

      keyDown(button, ' ');
      keyUp(button, ' ');

      expect(clicks).toHaveLength(0);
    });

    it('clears pressed state when disabled during Space hold', () => {
      const {button} = createButton();

      keyDown(button, ' ');

      expect(button.hasAttribute('pressed')).toBe(true);

      button.setAttribute('disabled', '');

      expect(button.hasAttribute('pressed')).toBe(false);
    });

    it('ignores Space keyup without a preceding keydown', () => {
      const {button} = createButton();
      const clicks: Event[] = [];

      button.addEventListener('click', ((event: Event) => {
        clicks.push(event);
      }) as EventListener);

      keyUp(button, ' ');

      expect(clicks).toHaveLength(0);
    });

    it('Space keydown cancels an active Enter flash', () => {
      const {button} = createButton();

      keyDown(button, 'Enter');

      expect(button.hasAttribute('pressed')).toBe(true);

      keyDown(button, ' ');

      // pressed still set (now from Space), but frame ticks won't clear it
      button.onTerminalFrame(0);
      button.onTerminalFrame(33);
      button.onTerminalFrame(66);

      expect(button.hasAttribute('pressed')).toBe(true);

      keyUp(button, ' ');

      expect(button.hasAttribute('pressed')).toBe(false);
    });
  });

  describe('mouse activation', () => {
    it('dispatches click event from mouse', () => {
      const {button} = createButton();
      const clicks: Event[] = [];

      button.addEventListener('click', ((event: Event) => {
        clicks.push(event);
      }) as EventListener);

      button.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));

      expect(clicks).toHaveLength(1);
    });

    it('blocks click propagation when disabled', () => {
      const {button} = createButton(undefined, {disabled: true});
      const bodyClicks: Event[] = [];

      button.ownerDocument?.body.addEventListener('click', ((event: Event) => {
        bodyClicks.push(event);
      }) as EventListener);

      button.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));

      expect(bodyClicks).toHaveLength(0);
    });
  });

  describe('variant and tone', () => {
    it('defaults to primary variant', () => {
      const {button} = createButton();

      expect(button.getVariant()).toBe('primary');
    });

    it('returns configured variant', () => {
      const {button} = createButton(undefined, {variant: 'secondary'});

      expect(button.getVariant()).toBe('secondary');
    });

    it('falls back to default for unknown variant', () => {
      const {button} = createButton(undefined, {variant: 'unknown'});

      expect(button.getVariant()).toBe('primary');
    });

    it('defaults to default tone', () => {
      const {button} = createButton();

      expect(button.getTone()).toBe('default');
    });

    it('returns configured tone', () => {
      const {button} = createButton(undefined, {tone: 'dangerous'});

      expect(button.getTone()).toBe('dangerous');
    });

    it('falls back to default for unknown tone', () => {
      const {button} = createButton(undefined, {tone: 'unknown'});

      expect(button.getTone()).toBe('default');
    });
  });

  describe('frame tick', () => {
    it('is a no-op when no flash is active', () => {
      const {button} = createButton();

      button.onTerminalFrame(0);

      expect(button.hasAttribute('pressed')).toBe(false);
    });
  });

  describe('disconnection', () => {
    it('clears pressed state on disconnect', () => {
      const {button} = createButton();

      keyDown(button, ' ');

      expect(button.hasAttribute('pressed')).toBe(true);

      button.parentNode?.removeChild(button);

      expect(button.hasAttribute('pressed')).toBe(false);
    });

    it('does not respond to keys after disconnect', () => {
      const {button} = createButton();
      const clicks: Event[] = [];

      button.addEventListener('click', ((event: Event) => {
        clicks.push(event);
      }) as EventListener);

      button.parentNode?.removeChild(button);
      keyDown(button, 'Enter');

      expect(clicks).toHaveLength(0);
    });
  });
});
