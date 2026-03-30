import {describe, expect, it} from 'vitest';

import {Event, KeyboardEvent, ToggleEvent, Window} from '../../../dom';
import {UiDetails} from '../component';

import type {CustomElementConstructor} from '../../../dom/types';

function createDetails(
  window = new Window(),
  attributes: Record<string, string | boolean> = {},
  options?: {summaryText?: string; contentText?: string},
): {window: Window; details: UiDetails} {
  window.customElements.define(UiDetails.tagName, UiDetails as unknown as CustomElementConstructor);

  const details = window.document.createElement('ui-details') as UiDetails;

  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      if (value) details.setAttribute(name, '');
    } else {
      details.setAttribute(name, value);
    }
  }

  const summary = window.document.createElement('ui-summary');
  summary.textContent = options?.summaryText ?? 'Details';
  details.appendChild(summary);

  if (options?.contentText !== undefined) {
    const content = window.document.createElement('div');
    content.textContent = options.contentText;
    details.appendChild(content);
  } else {
    const content = window.document.createElement('div');
    content.textContent = 'Hidden content';
    details.appendChild(content);
  }

  window.document.body.appendChild(details);

  return {window, details};
}

function keyDown(details: UiDetails, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
  });

  details.dispatchEvent(event);

  return event;
}

describe('UiDetails', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(
      UiDetails.tagName,
      UiDetails as unknown as CustomElementConstructor,
    );

    expect(window.customElements.get('ui-details')).toBe(
      UiDetails as unknown as CustomElementConstructor,
    );
  });

  it('sets tabindex on connect for keyboard accessibility', () => {
    const {details} = createDetails();

    expect(details.getAttribute('tabindex')).toBe('0');
  });

  it('preserves a user-provided tabindex', () => {
    const {details} = createDetails(undefined, {tabindex: '3'});

    expect(details.getAttribute('tabindex')).toBe('3');
  });

  it('does not set tabindex when disabled', () => {
    const {details} = createDetails(undefined, {disabled: true});

    expect(details.getAttribute('tabindex')).toBeNull();
  });

  it('removes tabindex when disabled is set after connect', () => {
    const {details} = createDetails();

    expect(details.getAttribute('tabindex')).toBe('0');

    details.setAttribute('disabled', '');

    expect(details.getAttribute('tabindex')).toBeNull();
  });

  it('restores tabindex when disabled is removed', () => {
    const {details} = createDetails(undefined, {disabled: true});

    expect(details.getAttribute('tabindex')).toBeNull();

    details.removeAttribute('disabled');

    expect(details.getAttribute('tabindex')).toBe('0');
  });

  describe('initial state', () => {
    it('starts collapsed by default', () => {
      const {details} = createDetails();

      expect(details.isOpen()).toBe(false);
    });

    it('starts expanded when open attribute is set', () => {
      const {details} = createDetails(undefined, {open: true});

      expect(details.isOpen()).toBe(true);
    });

    it('shows collapsed indicator when closed', () => {
      const {details} = createDetails();
      const text = details.textContent ?? '';

      expect(text).toContain('▸');
      expect(text).not.toContain('▾');
    });

    it('shows expanded indicator when open', () => {
      const {details} = createDetails(undefined, {open: true});
      const text = details.textContent ?? '';

      expect(text).toContain('▾');
      expect(text).not.toContain('▸');
    });

    it('renders summary text', () => {
      const {details} = createDetails(undefined, {}, {summaryText: 'My Section'});

      expect(details.textContent).toContain('My Section');
    });
  });

  describe('content visibility', () => {
    it('hides content when collapsed', () => {
      const {details} = createDetails();
      const contentWrapper = details.childNodes[1] as import('../../../dom').Element;

      expect(contentWrapper.style.display).toBe('none');
    });

    it('shows content when expanded', () => {
      const {details} = createDetails(undefined, {open: true});
      const contentWrapper = details.childNodes[1] as import('../../../dom').Element;

      expect(contentWrapper.style.display).toBe('block');
    });

    it('toggles content visibility when open changes', () => {
      const {details} = createDetails();
      const contentWrapper = details.childNodes[1] as import('../../../dom').Element;

      expect(contentWrapper.style.display).toBe('none');

      details.setAttribute('open', '');

      expect(contentWrapper.style.display).toBe('block');

      details.removeAttribute('open');

      expect(contentWrapper.style.display).toBe('none');
    });
  });

  describe('toggle method', () => {
    it('opens when closed', () => {
      const {details} = createDetails();

      details.toggle();

      expect(details.isOpen()).toBe(true);
    });

    it('closes when open', () => {
      const {details} = createDetails(undefined, {open: true});

      details.toggle();

      expect(details.isOpen()).toBe(false);
    });

    it('does nothing when disabled', () => {
      const {details} = createDetails(undefined, {disabled: true});

      details.toggle();

      expect(details.isOpen()).toBe(false);
    });
  });

  describe('keyboard activation', () => {
    it('toggles on Enter', () => {
      const {details} = createDetails();

      expect(details.isOpen()).toBe(false);

      keyDown(details, 'Enter');

      expect(details.isOpen()).toBe(true);

      keyDown(details, 'Enter');

      expect(details.isOpen()).toBe(false);
    });

    it('toggles on Space', () => {
      const {details} = createDetails();

      keyDown(details, ' ');

      expect(details.isOpen()).toBe(true);
    });

    it('prevents default on Enter', () => {
      const {details} = createDetails();
      const event = keyDown(details, 'Enter');

      expect(event.defaultPrevented).toBe(true);
    });

    it('prevents default on Space', () => {
      const {details} = createDetails();
      const event = keyDown(details, ' ');

      expect(event.defaultPrevented).toBe(true);
    });

    it('does not toggle on other keys', () => {
      const {details} = createDetails();

      keyDown(details, 'ArrowDown');

      expect(details.isOpen()).toBe(false);
    });

    it('does not toggle when disabled', () => {
      const {details} = createDetails(undefined, {disabled: true});

      keyDown(details, 'Enter');

      expect(details.isOpen()).toBe(false);
    });

    it('does not toggle when Enter bubbles from a child element', () => {
      const {details, window} = createDetails();
      details.setAttribute('open', '');

      const child = window.document.createElement('div');
      details.appendChild(child);

      /* Simulate Enter keydown originating from the child (event.target = child) */
      const event = new KeyboardEvent('keydown', {key: 'Enter', bubbles: true});
      child.dispatchEvent(event);

      /* Details should remain open — the Enter was not on the details itself */
      expect(details.isOpen()).toBe(true);
    });
  });

  describe('mouse activation', () => {
    it('toggles when summary is clicked', () => {
      const {details} = createDetails();
      const summaryRow = details.childNodes[0] as import('../../../dom').Element;

      summaryRow.dispatchEvent(new Event('click', {bubbles: true}));

      expect(details.isOpen()).toBe(true);

      summaryRow.dispatchEvent(new Event('click', {bubbles: true}));

      expect(details.isOpen()).toBe(false);
    });

    it('does not toggle when content area is clicked', () => {
      const {details} = createDetails(undefined, {open: true});
      const contentWrapper = details.childNodes[1] as import('../../../dom').Element;

      contentWrapper.dispatchEvent(new Event('click', {bubbles: true}));

      expect(details.isOpen()).toBe(true);
    });

    it('does not toggle when disabled', () => {
      const {details} = createDetails(undefined, {disabled: true});
      const summaryRow = details.childNodes[0] as import('../../../dom').Element;

      summaryRow.dispatchEvent(new Event('click', {bubbles: true}));

      expect(details.isOpen()).toBe(false);
    });
  });

  describe('toggle event', () => {
    it('dispatches toggle event when opened', () => {
      const {details} = createDetails();
      const events: ToggleEvent[] = [];

      details.addEventListener('toggle', ((e: Event) => {
        events.push(e as ToggleEvent);
      }) as EventListener);

      details.setAttribute('open', '');

      expect(events).toHaveLength(1);
      expect(events[0]!.oldState).toBe('closed');
      expect(events[0]!.newState).toBe('open');
    });

    it('dispatches toggle event when closed', () => {
      const {details} = createDetails(undefined, {open: true});
      const events: ToggleEvent[] = [];

      details.addEventListener('toggle', ((e: Event) => {
        events.push(e as ToggleEvent);
      }) as EventListener);

      details.removeAttribute('open');

      expect(events).toHaveLength(1);
      expect(events[0]!.oldState).toBe('open');
      expect(events[0]!.newState).toBe('closed');
    });

    it('dispatches toggle event on keyboard toggle', () => {
      const {details} = createDetails();
      const events: ToggleEvent[] = [];

      details.addEventListener('toggle', ((e: Event) => {
        events.push(e as ToggleEvent);
      }) as EventListener);

      keyDown(details, 'Enter');

      expect(events).toHaveLength(1);
      expect(events[0]!.oldState).toBe('closed');
      expect(events[0]!.newState).toBe('open');
    });

    it('dispatches toggle event on mouse toggle', () => {
      const {details} = createDetails();
      const events: ToggleEvent[] = [];

      details.addEventListener('toggle', ((e: Event) => {
        events.push(e as ToggleEvent);
      }) as EventListener);

      const summaryRow = details.childNodes[0] as import('../../../dom').Element;
      summaryRow.dispatchEvent(new Event('click', {bubbles: true}));

      expect(events).toHaveLength(1);
      expect(events[0]!.oldState).toBe('closed');
      expect(events[0]!.newState).toBe('open');
    });

    it('toggle event bubbles', () => {
      const {details} = createDetails();
      const events: ToggleEvent[] = [];

      details.ownerDocument!.body.addEventListener('toggle', ((e: Event) => {
        events.push(e as ToggleEvent);
      }) as EventListener);

      details.toggle();

      expect(events).toHaveLength(1);
    });

    it('does not dispatch toggle event when setting same state', () => {
      const {details} = createDetails(undefined, {open: true});
      const events: ToggleEvent[] = [];

      details.addEventListener('toggle', ((e: Event) => {
        events.push(e as ToggleEvent);
      }) as EventListener);

      details.setAttribute('open', '');

      expect(events).toHaveLength(0);
    });
  });

  describe('indicator', () => {
    it('updates indicator when opened', () => {
      const {details} = createDetails();

      details.setAttribute('open', '');
      const text = details.textContent ?? '';

      expect(text).toContain('▾');
      expect(text).not.toContain('▸');
    });

    it('updates indicator when closed', () => {
      const {details} = createDetails(undefined, {open: true});

      details.removeAttribute('open');
      const text = details.textContent ?? '';

      expect(text).toContain('▸');
      expect(text).not.toContain('▾');
    });
  });

  describe('disconnection', () => {
    it('does not respond to keys after disconnect', () => {
      const {details} = createDetails();
      const events: Event[] = [];

      details.addEventListener('toggle', ((e: Event) => {
        events.push(e);
      }) as EventListener);

      details.parentNode?.removeChild(details);
      keyDown(details, 'Enter');

      expect(events).toHaveLength(0);
    });
  });
});
