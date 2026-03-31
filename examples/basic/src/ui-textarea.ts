import {UiTextarea} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection, createStatus} from './_helpers';

const {terminal, document, window} = createDemo();
window.customElements.define(UiTextarea.tagName, UiTextarea);

const app = createShell(
  document,
  'ui-textarea',
  'Tab to focus. Type multi-line text. Arrow keys move cursor. Ctrl+Q quit.',
);
const status = createStatus(document, 'Value: (empty)');

/* ── Basic ─────────────────────────────────────────────── */
const s1 = createSection(document, 'Basic textarea');
const ta1 = document.createElement('ui-textarea');
ta1.setAttribute('tabindex', '0');
ta1.setAttribute('cols', '40');
ta1.setAttribute('rows', '4');
ta1.setAttribute('placeholder', 'Enter multiple lines of text...');
s1.appendChild(ta1);
app.appendChild(s1);

/* ── Pre-filled ────────────────────────────────────────── */
const s2 = createSection(document, 'Pre-filled');
const ta2 = document.createElement('ui-textarea');
ta2.setAttribute('tabindex', '0');
ta2.setAttribute('cols', '40');
ta2.setAttribute('rows', '3');
ta2.setAttribute('value', 'Line one\nLine two\nLine three');
s2.appendChild(ta2);
app.appendChild(s2);

/* ── Small ─────────────────────────────────────────────── */
const s3 = createSection(document, 'Small (20×2)');
const ta3 = document.createElement('ui-textarea');
ta3.setAttribute('tabindex', '0');
ta3.setAttribute('cols', '20');
ta3.setAttribute('rows', '2');
ta3.setAttribute('placeholder', 'Small area');
s3.appendChild(ta3);
app.appendChild(s3);

/* ── Disabled ──────────────────────────────────────────── */
const s4 = createSection(document, 'Disabled');
const ta4 = document.createElement('ui-textarea');
ta4.setAttribute('disabled', '');
ta4.setAttribute('cols', '30');
ta4.setAttribute('rows', '2');
ta4.setAttribute('value', 'Read-only content\nCannot edit');
s4.appendChild(ta4);
app.appendChild(s4);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
