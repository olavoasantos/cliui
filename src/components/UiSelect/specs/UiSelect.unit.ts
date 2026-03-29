import {describe, expect, it} from 'vitest';

import {Event, KeyboardEvent, Window} from '../../../dom';
import {UiOption} from '../../UiOption/component';
import {UiSelect} from '../component';

import type {CustomElementConstructor} from '../../../dom/types';

function createSelect(
  optionData: Array<{value: string; label: string; disabled?: boolean}> = [],
  attributes: Record<string, string | boolean> = {},
): {window: Window; select: UiSelect; options: UiOption[]} {
  const window = new Window();

  window.customElements.define(UiSelect.tagName, UiSelect as unknown as CustomElementConstructor);
  window.customElements.define(UiOption.tagName, UiOption as unknown as CustomElementConstructor);

  const select = window.document.createElement('ui-select') as UiSelect;

  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      if (value) select.setAttribute(name, '');
    } else {
      select.setAttribute(name, value);
    }
  }

  const options: UiOption[] = [];

  for (const data of optionData) {
    const option = window.document.createElement('ui-option') as UiOption;
    option.setAttribute('value', data.value);
    option.textContent = data.label;

    if (data.disabled) option.setAttribute('disabled', '');

    select.appendChild(option);
    options.push(option);
  }

  window.document.body.appendChild(select);

  return {window, select, options};
}

function keyDown(element: UiSelect, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
  });

  element.dispatchEvent(event);

  return event;
}

const FRUITS = [
  {value: 'apple', label: 'Apple'},
  {value: 'banana', label: 'Banana'},
  {value: 'cherry', label: 'Cherry'},
];

describe('UiSelect', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(UiSelect.tagName, UiSelect as unknown as CustomElementConstructor);

    expect(window.customElements.get('ui-select')).toBe(
      UiSelect as unknown as CustomElementConstructor,
    );
  });

  it('sets tabindex on connect', () => {
    const {select} = createSelect(FRUITS);

    expect(select.getAttribute('tabindex')).toBe('0');
  });

  it('does not set tabindex when disabled', () => {
    const {select} = createSelect(FRUITS, {disabled: true});

    expect(select.hasAttribute('tabindex')).toBe(false);
  });

  it('shows the selected option label with right-aligned indicator', () => {
    const {select} = createSelect(FRUITS, {value: 'banana', width: '20'});
    const text = select.textContent ?? '';

    expect(text).toContain('Banana');
    expect(text).toContain('▾');
  });

  it('shows first option when no value is set', () => {
    const {select} = createSelect(FRUITS, {width: '20'});

    expect(select.textContent).toContain('Apple');
  });

  it('sets selected attribute on the matching option', () => {
    const {options} = createSelect(FRUITS, {value: 'cherry'});

    expect(options[0]!.hasAttribute('selected')).toBe(false);
    expect(options[1]!.hasAttribute('selected')).toBe(false);
    expect(options[2]!.hasAttribute('selected')).toBe(true);
  });

  describe('collapsed keyboard', () => {
    it('ArrowDown selects next option', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});
      const events: Event[] = [];

      select.addEventListener('input', ((e: Event) => events.push(e)) as EventListener);

      keyDown(select, 'ArrowDown');

      expect(select.getAttribute('value')).toBe('banana');
      expect(events).toHaveLength(1);
    });

    it('ArrowUp selects previous option', () => {
      const {select} = createSelect(FRUITS, {value: 'cherry'});

      keyDown(select, 'ArrowUp');

      expect(select.getAttribute('value')).toBe('banana');
    });

    it('ArrowDown does not go past last option', () => {
      const {select} = createSelect(FRUITS, {value: 'cherry'});

      keyDown(select, 'ArrowDown');

      expect(select.getAttribute('value')).toBe('cherry');
    });

    it('ArrowUp does not go before first option', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});

      keyDown(select, 'ArrowUp');

      expect(select.getAttribute('value')).toBe('apple');
    });

    it('Enter opens the dropdown', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});

      keyDown(select, 'Enter');

      expect(select.isOpen()).toBe(true);
    });

    it('flips indicator to up caret when opened', () => {
      const {select} = createSelect(FRUITS, {value: 'apple', width: '20'});

      keyDown(select, 'Enter');

      const text = select.textContent ?? '';
      expect(text).toContain('▴');
      expect(text).not.toContain('▾');
    });

    it('Space opens the dropdown', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});

      keyDown(select, ' ');

      expect(select.isOpen()).toBe(true);
    });
  });

  describe('expanded keyboard', () => {
    it('ArrowDown moves highlight', () => {
      const {select, options} = createSelect(FRUITS, {value: 'apple'});

      select.open();
      keyDown(select, 'ArrowDown');

      expect(options[1]!.hasAttribute('highlighted')).toBe(true);
    });

    it('ArrowUp moves highlight', () => {
      const {select, options} = createSelect(FRUITS, {value: 'cherry'});

      select.open();
      keyDown(select, 'ArrowUp');

      expect(options[1]!.hasAttribute('highlighted')).toBe(true);
    });

    it('Enter selects highlighted option and closes', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});

      select.open();
      keyDown(select, 'ArrowDown');
      keyDown(select, 'Enter');

      expect(select.getAttribute('value')).toBe('banana');
      expect(select.isOpen()).toBe(false);
    });

    it('Space selects highlighted option and closes', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});

      select.open();
      keyDown(select, 'ArrowDown');
      keyDown(select, ' ');

      expect(select.getAttribute('value')).toBe('banana');
      expect(select.isOpen()).toBe(false);
    });

    it('Escape closes without changing selection', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});

      select.open();
      keyDown(select, 'ArrowDown');
      keyDown(select, 'Escape');

      expect(select.getAttribute('value')).toBe('apple');
      expect(select.isOpen()).toBe(false);
    });

    it('does not wrap past last option', () => {
      const {select, options} = createSelect(FRUITS, {value: 'cherry'});

      select.open();
      keyDown(select, 'ArrowDown');

      expect(options[2]!.hasAttribute('highlighted')).toBe(true);
    });

    it('does not wrap before first option', () => {
      const {select, options} = createSelect(FRUITS, {value: 'apple'});

      select.open();
      keyDown(select, 'ArrowUp');

      expect(options[0]!.hasAttribute('highlighted')).toBe(true);
    });

    it('skips disabled options when navigating', () => {
      const data = [
        {value: 'a', label: 'A'},
        {value: 'b', label: 'B', disabled: true},
        {value: 'c', label: 'C'},
      ];
      const {select, options} = createSelect(data, {value: 'a'});

      select.open();
      keyDown(select, 'ArrowDown');

      expect(options[2]!.hasAttribute('highlighted')).toBe(true);
    });
  });

  describe('mouse', () => {
    it('click toggles the dropdown', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});

      select.dispatchEvent(new Event('click', {bubbles: true}));

      expect(select.isOpen()).toBe(true);

      select.dispatchEvent(new Event('click', {bubbles: true}));

      expect(select.isOpen()).toBe(false);
    });

    it('clicking an option selects it and closes', () => {
      const {select, options} = createSelect(FRUITS, {value: 'apple'});

      select.open();
      options[2]!.dispatchEvent(new Event('click', {bubbles: true}));

      expect(select.getAttribute('value')).toBe('cherry');
      expect(select.isOpen()).toBe(false);
    });
  });

  describe('focus and blur', () => {
    it('dispatches change on blur when value changed', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});
      const changes: Event[] = [];

      select.addEventListener('change', ((e: Event) => changes.push(e)) as EventListener);

      select.dispatchEvent(new Event('focus'));
      keyDown(select, 'ArrowDown');
      select.dispatchEvent(new Event('blur'));

      expect(changes).toHaveLength(1);
    });

    it('does not dispatch change on blur when value unchanged', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});
      const changes: Event[] = [];

      select.addEventListener('change', ((e: Event) => changes.push(e)) as EventListener);

      select.dispatchEvent(new Event('focus'));
      select.dispatchEvent(new Event('blur'));

      expect(changes).toHaveLength(0);
    });

    it('closes dropdown on blur', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});

      select.open();
      select.dispatchEvent(new Event('blur'));

      expect(select.isOpen()).toBe(false);
    });
  });

  describe('disabled', () => {
    it('blocks keyboard interaction', () => {
      const {select} = createSelect(FRUITS, {value: 'apple', disabled: true});

      keyDown(select, 'ArrowDown');

      expect(select.getAttribute('value')).toBe('apple');
    });

    it('blocks opening', () => {
      const {select} = createSelect(FRUITS, {value: 'apple', disabled: true});

      keyDown(select, 'Enter');

      expect(select.isOpen()).toBe(false);
    });

    it('closes dropdown when disabled is set while open', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});

      select.open();

      expect(select.isOpen()).toBe(true);

      select.setAttribute('disabled', '');

      expect(select.isOpen()).toBe(false);
    });
  });

  describe('type-ahead', () => {
    it('jumps to the first matching option when collapsed', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});

      keyDown(select, 'c');

      expect(select.getAttribute('value')).toBe('cherry');
    });

    it('moves highlight to matching option when expanded', () => {
      const {select, options} = createSelect(FRUITS, {value: 'apple'});

      select.open();
      keyDown(select, 'c');

      expect(options[2]!.hasAttribute('highlighted')).toBe(true);
    });

    it('wraps around when searching', () => {
      const {select} = createSelect(FRUITS, {value: 'cherry'});

      keyDown(select, 'a');

      expect(select.getAttribute('value')).toBe('apple');
    });

    it('is case-insensitive', () => {
      const {select} = createSelect(FRUITS, {value: 'apple'});

      keyDown(select, 'B');

      expect(select.getAttribute('value')).toBe('banana');
    });
  });
});
