# Use HTMLDialogElement for Modals

Create, open, close, and control dialog elements — both non-modal and modal, with focus trapping and Escape handling.

Every example starts from a Window and Document:

```ts
import {Window} from '@cliui/dom';

const window = new Window();
const document = window.document;
```

## Create a dialog

```ts
const dialog = document.createElement('dialog');

const message = document.createElement('div');
message.textContent = 'Are you sure?';
dialog.appendChild(message);

const okBtn = document.createElement('button');
okBtn.textContent = 'OK';
okBtn.setAttribute('tabindex', '0');
dialog.appendChild(okBtn);

document.body.appendChild(dialog);
```

Dialogs are hidden by default. Call `show()` or `showModal()` to display them.

## Open a non-modal dialog

`show()` sets the `open` attribute. No focus trapping, no Escape handling, no backdrop:

```ts
dialog.show();
dialog.open; // true
```

If the dialog is already open, `show()` is a no-op. Use non-modal dialogs for supplementary UI (tooltips, inline panels, status bars) where the user should still interact with the rest of the document.

## Open a modal dialog

`showModal()` opens the dialog with full modal behavior:

```ts
dialog.showModal();
dialog.open; // true          ← verify before continuing
dialog.hasAttribute('modal'); // true  ← verify: confirms modal mode
```

Three things happen automatically:

1. **Focus moves in.** The first `[tabindex]` descendant receives focus. If none exist, the dialog itself gets `tabindex="-1"` and focuses itself.
2. **Tab is trapped.** Tab and Shift+Tab cycle among `[tabindex]` descendants only.
3. **Escape closes.** Pressing Escape dispatches a cancelable `cancel` event. If not prevented, the dialog closes.

> The `modal` attribute is a terminal-dom addition (not part of the HTML spec). Use it to style modal dialogs differently from non-modal ones.

> **Sharp edge: you cannot upgrade a non-modal dialog to modal.** If a dialog is already open via `show()`, calling `showModal()` is a no-op — no focus trapping, no Escape handling, no modal attribute. Verify the no-op:
>
> ```ts
> dialog.show();
> dialog.showModal();
> dialog.hasAttribute('modal'); // false — showModal() did nothing
> ```
>
> Close it first, then reopen as modal.

## Close a dialog

`close()` removes the `open` and `modal` attributes, dispatches a `close` event, and — for modals — restores focus to the previously active element:

```ts
okBtn.addEventListener('click', () => {
  dialog.close('confirmed');
});

dialog.addEventListener('close', () => {
  dialog.open; // false              ← verify: dialog is closed
  dialog.returnValue; // 'confirmed' ← verify: return value was set
});
```

The `returnValue` holds the string passed to `close()`. It defaults to `''` and persists across open/close cycles — calling `close()` without an argument preserves the existing value. Calling `close()` on a dialog that isn't open is a no-op.

## Prevent close on Escape

The `cancel` event is cancelable. Prevent it to keep the dialog open:

```ts
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  // Dialog stays open. No close event fires.
});
```

## Restore focus on modal close

`showModal()` saves a reference to the active element. `close()` restores focus to it automatically:

```ts
document.setActiveElement(input);

dialog.showModal();
// Focus moves into the dialog

dialog.close();
// Focus returns to input
```

Focus restoration only applies to modal dialogs. Non-modal dialogs don't track or restore focus.

## Use window.alert(), window.confirm(), and window.prompt()

Three convenience methods that create, show, and clean up modal dialogs. Unlike their browser counterparts, these are **async**:

```ts
// Alert — resolves when dismissed
await window.alert('Operation complete.');

// Confirm — resolves to true (OK) or false (Cancel/Escape)
const proceed = await window.confirm('Delete this item?');
if (proceed) deleteItem();

// Prompt — resolves to the entered string (OK) or null (Cancel/Escape)
const name = await window.prompt('Enter your name:', 'Anonymous');
if (name !== null) greet(name);
```

All three create a `<dialog>`, append it to `document.body`, call `showModal()`, and remove the dialog after the Promise resolves.

## Where to go next

- **[Handle Focus and Keyboard Navigation](./focus-navigation.md)** — for how focus trapping interacts with the broader focus model: Tab cycling, `focusNext()`, and `setActiveElement()`
- **[Event Propagation Model](../learn/event-propagation.md)** — how cancel and close events propagate
