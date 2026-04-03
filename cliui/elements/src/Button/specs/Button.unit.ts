import {describe, expect, it} from 'vitest';

import {Event, KeyboardEvent, MouseEvent, Window} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {Button} from '../component';

function createButton(
  window = new Window(),
  attributes: Record<string, string | boolean> = {},
): {window: Window; button: Button} {
  window.customElements.define(Button.tagName, Button as unknown as CustomElementConstructor);
  const button = window.document.createElement('button') as Button;

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

function keyDown(button: Button, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
  });

  button.dispatchEvent(event);

  return event;
}

function keyUp(button: Button, key: string): void {
  button.dispatchEvent(
    new KeyboardEvent('keyup', {
      bubbles: true,
      cancelable: true,
      key,
    }),
  );
}

describe('Button', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(Button.tagName, Button as unknown as CustomElementConstructor);

    expect(window.customElements.get('button')).toBe(Button as unknown as CustomElementConstructor);
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
    it('clears pressed state on blur', () => {
      const {button} = createButton();

      keyDown(button, ' ');

      expect(button.hasAttribute('pressed')).toBe(true);

      button.dispatchEvent(new Event('blur'));

      expect(button.hasAttribute('pressed')).toBe(false);
    });
  });

  describe('Enter activation', () => {
    it('dispatches click on Enter keydown', () => {
      const {button} = createButton();
      const clicks: Event[] = [];

      button.addEventListener('click', ((event: Event) => {
        clicks.push(event);
      }) as never);

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
      }) as never);

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
      }) as never);

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
      }) as never);

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
      }) as never);

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
      }) as never);

      button.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));

      expect(clicks).toHaveLength(1);
    });

    it('blocks click propagation when disabled', () => {
      const {button} = createButton(undefined, {disabled: true});
      const bodyClicks: Event[] = [];

      button.ownerDocument?.body.addEventListener('click', ((event: Event) => {
        bodyClicks.push(event);
      }) as never);

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
      }) as never);

      button.parentNode?.removeChild(button);
      keyDown(button, 'Enter');

      expect(clicks).toHaveLength(0);
    });
  });
});

describe('Button — standard DOM properties', () => {
  it('type property defaults to button', () => {
    const window = new Window();
    window.customElements.define(Button.tagName, Button as unknown as CustomElementConstructor);
    const btn = window.document.createElement('button') as Button;
    window.document.body.appendChild(btn);

    expect(btn.type).toBe('button');
  });

  it('type property reflects the attribute', () => {
    const window = new Window();
    window.customElements.define(Button.tagName, Button as unknown as CustomElementConstructor);
    const btn = window.document.createElement('button') as Button;
    btn.type = 'submit';
    window.document.body.appendChild(btn);

    expect(btn.type).toBe('submit');
    expect(btn.getAttribute('type')).toBe('submit');
  });

  it('disabled property reflects the attribute', () => {
    const window = new Window();
    window.customElements.define(Button.tagName, Button as unknown as CustomElementConstructor);
    const btn = window.document.createElement('button') as Button;
    window.document.body.appendChild(btn);

    expect(btn.disabled).toBe(false);

    btn.disabled = true;

    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(btn.disabled).toBe(true);

    btn.disabled = false;

    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('form property returns nearest ancestor form', () => {
    const window = new Window();
    window.customElements.define(Button.tagName, Button as unknown as CustomElementConstructor);
    const form = window.document.createElement('form');
    const btn = window.document.createElement('button') as Button;
    form.appendChild(btn);
    window.document.body.appendChild(form);

    expect(btn.form).toBe(form);
  });

  it('form property returns null when no ancestor form', () => {
    const window = new Window();
    window.customElements.define(Button.tagName, Button as unknown as CustomElementConstructor);
    const btn = window.document.createElement('button') as Button;
    window.document.body.appendChild(btn);

    expect(btn.form).toBeNull();
  });
});
