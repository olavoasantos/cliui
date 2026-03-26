import {describe, expect, it} from 'vitest';

import {HTMLTemplateElement} from '../HTMLTemplateElement';
import {Window} from '../Window';

describe('HTMLTemplateElement integration', () => {
  it('stores parsed children in content without rendering them into the live tree', () => {
    const document = new Window().document;
    const template = document.createElement('template') as HTMLTemplateElement;
    template.innerHTML = '<section class="card">hello</section>';
    document.body.appendChild(template);

    expect(template.content.querySelector('.card')?.textContent).toBe('hello');
    expect(template.querySelector('.card')).toBeNull();
    expect(document.body.querySelector('.card')).toBeNull();
  });
});
