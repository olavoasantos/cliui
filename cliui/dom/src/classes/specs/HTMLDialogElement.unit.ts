import {describe, expect, it} from 'vitest';

import {HTMLDialogElement} from '../HTMLDialogElement';
import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  const document = window.document;
  const dialog = document.createElement('dialog') as HTMLDialogElement;
  document.body.appendChild(dialog);

  return {window, document, dialog};
}

describe('HTMLDialogElement', () => {
  describe('createElement mapping', () => {
    it('creates an HTMLDialogElement for the dialog tag name', () => {
      const {dialog} = createEnv();

      expect(dialog).toBeInstanceOf(HTMLDialogElement);
      expect(dialog.localName).toBe('dialog');
    });
  });

  describe('open property', () => {
    it('defaults to closed', () => {
      const {dialog} = createEnv();

      expect(dialog.open).toBe(false);
      expect(dialog.hasAttribute('open')).toBe(false);
    });

    it('reflects the open attribute', () => {
      const {dialog} = createEnv();

      dialog.open = true;
      expect(dialog.hasAttribute('open')).toBe(true);

      dialog.open = false;
      expect(dialog.hasAttribute('open')).toBe(false);
    });
  });

  describe('show()', () => {
    it('sets the open attribute', () => {
      const {dialog} = createEnv();
      dialog.show();

      expect(dialog.open).toBe(true);
    });

    it('does not set modal attribute', () => {
      const {dialog} = createEnv();
      dialog.show();

      expect(dialog.hasAttribute('modal')).toBe(false);
    });

    it('is a no-op when already open', () => {
      const {dialog} = createEnv();
      dialog.show();
      dialog.show(); // no error

      expect(dialog.open).toBe(true);
    });
  });

  describe('showModal()', () => {
    it('sets the open and modal attributes', () => {
      const {dialog} = createEnv();
      dialog.showModal();

      expect(dialog.open).toBe(true);
      expect(dialog.hasAttribute('modal')).toBe(true);
    });

    it('is a no-op when already open', () => {
      const {dialog} = createEnv();
      dialog.show();
      dialog.showModal();

      // Already open via show(), showModal() is a no-op
      expect(dialog.hasAttribute('modal')).toBe(false);
    });
  });

  describe('close()', () => {
    it('removes the open attribute', () => {
      const {dialog} = createEnv();
      dialog.show();
      dialog.close();

      expect(dialog.open).toBe(false);
    });

    it('dispatches a close event', () => {
      const {dialog} = createEnv();
      dialog.show();

      let closeDispatched = false;
      dialog.addEventListener('close', () => {
        closeDispatched = true;
      });
      dialog.close();

      expect(closeDispatched).toBe(true);
    });

    it('sets returnValue when provided', () => {
      const {dialog} = createEnv();
      dialog.show();
      dialog.close('confirmed');

      expect(dialog.returnValue).toBe('confirmed');
    });

    it('preserves existing returnValue when called without argument', () => {
      const {dialog} = createEnv();
      dialog.returnValue = 'previous';
      dialog.show();
      dialog.close();

      expect(dialog.returnValue).toBe('previous');
    });

    it('removes modal attribute when closing a modal dialog', () => {
      const {dialog} = createEnv();
      dialog.showModal();
      dialog.close();

      expect(dialog.hasAttribute('modal')).toBe(false);
    });

    it('is a no-op when not open', () => {
      const {dialog} = createEnv();

      let closeDispatched = false;
      dialog.addEventListener('close', () => {
        closeDispatched = true;
      });
      dialog.close();

      expect(closeDispatched).toBe(false);
    });
  });

  describe('returnValue', () => {
    it('defaults to empty string', () => {
      const {dialog} = createEnv();

      expect(dialog.returnValue).toBe('');
    });

    it('is settable directly', () => {
      const {dialog} = createEnv();
      dialog.returnValue = 'test';

      expect(dialog.returnValue).toBe('test');
    });
  });
});
