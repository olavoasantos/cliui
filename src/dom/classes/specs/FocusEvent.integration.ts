import {describe, expect, it} from 'vitest';

import {FocusEvent} from '../FocusEvent';
import {Window} from '../Window';

describe('FocusEvent integration', () => {
  it('is dispatched during document focus transitions with related targets', () => {
    const document = new Window().document;
    const first = document.createElement('button');
    const second = document.createElement('button');
    first.setAttribute('tabindex', '0');
    second.setAttribute('tabindex', '0');
    document.body.append(first, second);
    let seen: FocusEvent | null = null;

    second.addEventListener('focus', (event) => {
      seen = event as FocusEvent;
    });
    document.setActiveElement(first);
    document.setActiveElement(second);

    expect(seen?.relatedTarget).toBe(first);
  });
});
