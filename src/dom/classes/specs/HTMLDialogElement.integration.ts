import {describe, expect, it} from 'vitest';

import {Event} from '../Event';
import {HTMLDialogElement} from '../HTMLDialogElement';
import {KeyboardEvent} from '../KeyboardEvent';
import {StyleEngine} from '../../../css/classes/StyleEngine';
import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  const document = window.document;
  const engine = new StyleEngine();
  engine.attach(document);
  const dialog = document.createElement('dialog') as HTMLDialogElement;
  document.body.appendChild(dialog);

  return {window, document, engine, dialog};
}

describe('HTMLDialogElement integration', () => {
  describe('focus trapping', () => {
    it('moves focus to first focusable child on showModal', () => {
      const {document, dialog} = createEnv();
      const btn1 = document.createElement('button');
      btn1.setAttribute('tabindex', '0');
      btn1.textContent = 'OK';
      const btn2 = document.createElement('button');
      btn2.setAttribute('tabindex', '0');
      btn2.textContent = 'Cancel';
      dialog.appendChild(btn1);
      dialog.appendChild(btn2);

      dialog.showModal();

      expect(document.activeElement).toBe(btn1);
    });

    it('focuses dialog itself when no focusable children exist', () => {
      const {document, dialog} = createEnv();
      dialog.textContent = 'Alert message';

      dialog.showModal();

      expect(document.activeElement).toBe(dialog);
    });

    it('traps Tab to cycle within dialog focusable children', () => {
      const {document, dialog} = createEnv();
      const btn1 = document.createElement('button');
      btn1.setAttribute('tabindex', '0');
      const btn2 = document.createElement('button');
      btn2.setAttribute('tabindex', '0');
      const btn3 = document.createElement('button');
      btn3.setAttribute('tabindex', '0');
      dialog.appendChild(btn1);
      dialog.appendChild(btn2);
      dialog.appendChild(btn3);

      dialog.showModal();
      expect(document.activeElement).toBe(btn1);

      // Tab forward
      dialog.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}));
      expect(document.activeElement).toBe(btn2);

      dialog.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}));
      expect(document.activeElement).toBe(btn3);

      // Tab wraps to first
      dialog.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true}));
      expect(document.activeElement).toBe(btn1);
    });

    it('traps Shift+Tab to cycle backward', () => {
      const {document, dialog} = createEnv();
      const btn1 = document.createElement('button');
      btn1.setAttribute('tabindex', '0');
      const btn2 = document.createElement('button');
      btn2.setAttribute('tabindex', '0');
      dialog.appendChild(btn1);
      dialog.appendChild(btn2);

      dialog.showModal();
      expect(document.activeElement).toBe(btn1);

      // Shift+Tab wraps to last
      dialog.dispatchEvent(
        new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, bubbles: true}),
      );
      expect(document.activeElement).toBe(btn2);
    });

    it('restores focus to previous element on close', () => {
      const {document, dialog} = createEnv();
      const outsideBtn = document.createElement('button');
      outsideBtn.setAttribute('tabindex', '0');
      document.body.appendChild(outsideBtn);
      document.setActiveElement(outsideBtn);

      const innerBtn = document.createElement('button');
      innerBtn.setAttribute('tabindex', '0');
      dialog.appendChild(innerBtn);

      dialog.showModal();
      expect(document.activeElement).toBe(innerBtn);

      dialog.close();
      expect(document.activeElement).toBe(outsideBtn);
    });
  });

  describe('Escape handling', () => {
    it('closes modal dialog on Escape', () => {
      const {dialog} = createEnv();
      dialog.showModal();

      dialog.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));

      expect(dialog.open).toBe(false);
    });

    it('dispatches cancel then close on Escape', () => {
      const {dialog} = createEnv();
      dialog.showModal();

      const events: string[] = [];
      dialog.addEventListener('cancel', () => events.push('cancel'));
      dialog.addEventListener('close', () => events.push('close'));

      dialog.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));

      expect(events).toEqual(['cancel', 'close']);
    });

    it('does not close if cancel is prevented', () => {
      const {dialog} = createEnv();
      dialog.showModal();

      dialog.addEventListener('cancel', (e) => (e as Event).preventDefault());

      dialog.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));

      expect(dialog.open).toBe(true);
    });
  });

  describe('UA stylesheet integration', () => {
    it('dialog is hidden by default', () => {
      const {engine, dialog} = createEnv();
      engine.computeAll();

      expect(engine.getComputedStyle(dialog).get('display')).toBe('none');
    });

    it('dialog is visible when open', () => {
      const {engine, dialog} = createEnv();
      dialog.show();
      engine.computeAll();

      expect(engine.getComputedStyle(dialog).get('display')).toBe('block');
    });

    it('dialog has a border and padding by default', () => {
      const {engine, dialog} = createEnv();
      dialog.show();
      engine.computeAll();

      const style = engine.getComputedStyle(dialog);
      expect(style.get('border-style')).toBe('single');
      expect(style.get('padding-top')).toBe('1');
      expect(style.get('padding-left')).toBe('2');
    });
  });
});
