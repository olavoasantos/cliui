import {UiMarkdown} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection} from './_helpers';

const {terminal, document, window} = createDemo();
window.customElements.define(UiMarkdown.tagName, UiMarkdown);

const app = createShell(
  document,
  'ui-markdown',
  'Lightweight Markdown rendering using semantic HTML elements.',
);

/* ── Headings ──────────────────────────────────────────── */
const s1 = createSection(document, 'Headings');
const md1 = document.createElement('ui-markdown') as InstanceType<typeof UiMarkdown>;
md1.textContent = '# Heading 1\n## Heading 2\n### Heading 3';
s1.appendChild(md1);
app.appendChild(s1);

/* ── Mixed content ─────────────────────────────────────── */
const s2 = createSection(document, 'Mixed content');
const md2 = document.createElement('ui-markdown') as InstanceType<typeof UiMarkdown>;
md2.textContent = `# terminal-dom
A DOM implementation for terminal applications.

## Features
- Flexbox layout engine
- CSS styling with specificity
- Custom elements

---

## Getting Started
Install the package and create a terminal instance.`;
s2.appendChild(md2);
app.appendChild(s2);

/* ── List items ────────────────────────────────────────── */
const s3 = createSection(document, 'List items');
const md3 = document.createElement('ui-markdown') as InstanceType<typeof UiMarkdown>;
md3.textContent = '- First item\n- Second item\n- Third item';
s3.appendChild(md3);
app.appendChild(s3);

/* ── Horizontal rule ───────────────────────────────────── */
const s4 = createSection(document, 'Horizontal rules');
const md4 = document.createElement('ui-markdown') as InstanceType<typeof UiMarkdown>;
md4.textContent = 'Above the rule\n---\nBelow the rule\n***\nAfter another rule';
s4.appendChild(md4);
app.appendChild(s4);

document.body.appendChild(app);
await terminal.run();
